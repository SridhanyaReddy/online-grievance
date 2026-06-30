const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const { generateDepartmentReport } = require('../utils/pdfGenerator');
const { generateExcelReport } = require('../utils/excelGenerator');

// Helpers to get aggregated statistics
const getAggregatedStats = async (user) => {
  let query = {};
  
  if (user.role === 'manager' && user.department) {
    query.department = user.department;
  } else if (user.role === 'employee') {
    query.assignedEmployee = user._id;
  } else if (user.role === 'citizen') {
    query.citizen = user._id;
  }

  const complaints = await Complaint.find(query);
  
  const stats = {
    total: complaints.length,
    submitted: 0,
    verified: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    escalated: 0,
    closed: 0
  };

  complaints.forEach(c => {
    if (c.status === 'Submitted') stats.submitted++;
    if (c.status === 'Verified') stats.verified++;
    if (c.status === 'Assigned') stats.assigned++;
    if (c.status === 'In Progress') stats.inProgress++;
    if (c.status === 'Resolved') stats.resolved++;
    if (c.status === 'Rejected') stats.rejected++;
    if (c.status === 'Escalated') stats.escalated++;
    if (c.status === 'Closed') stats.closed++;
  });

  return stats;
};

// @desc    Get dashboard statistics summary
// @route   GET /api/reports/dashboard-stats
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await getAggregatedStats(req.user);

    let usersCount = 0;
    let deptsCount = 0;
    let satisfactionScore = 0;

    if (req.user.role === 'admin') {
      usersCount = await User.countDocuments();
      deptsCount = await Department.countDocuments();
    }

    // Feedback rating calculation
    let feedbackQuery = {};
    if (req.user.role === 'manager' && req.user.department) {
      const deptComplaints = await Complaint.find({ department: req.user.department }).select('_id');
      feedbackQuery.complaint = { $in: deptComplaints.map(c => c._id) };
    }
    
    const feedbackList = await Feedback.find(feedbackQuery);
    if (feedbackList.length > 0) {
      const sum = feedbackList.reduce((acc, f) => acc + f.rating, 0);
      satisfactionScore = (sum / feedbackList.length).toFixed(1);
    } else {
      satisfactionScore = 4.5; // Mock Default high score if empty database
    }

    res.status(200).json({
      success: true,
      data: {
        complaints: {
          total: stats.total,
          pending: stats.submitted + stats.verified + stats.assigned + stats.inProgress,
          resolved: stats.resolved + stats.closed,
          escalated: stats.escalated,
          rejected: stats.rejected
        },
        usersCount,
        deptsCount,
        satisfactionScore: parseFloat(satisfactionScore)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get data sets for Chart.js dashboard
// @route   GET /api/reports/charts
exports.getChartData = async (req, res) => {
  try {
    // 1. Complaint Status Distribution
    const statusGroup = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 2. Department Performance
    const deptStats = await Complaint.aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } }
        }
      }
    ]);
    const departments = await Department.populate(deptStats, { path: '_id', select: 'name' });

    // 3. Monthly Trends (last 6 months)
    const trends = await Complaint.aggregate([
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusDistribution: statusGroup,
        departmentPerformance: departments.map(d => ({
          name: d._id ? d._id.name : 'Unknown',
          total: d.total,
          resolved: d.resolved
        })),
        monthlyTrends: trends.map(t => ({
          month: `${t._id.month}/${t._id.year}`,
          count: t.count
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Common helper to compile raw report details
const compileReportDetails = async () => {
  const depts = await Department.find();
  const complaints = await Complaint.find();

  const details = {
    totalComplaints: complaints.length,
    pendingComplaints: complaints.filter(c => ['Submitted', 'Verified', 'Assigned', 'In Progress'].includes(c.status)).length,
    resolvedComplaints: complaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length,
    escalatedComplaints: complaints.filter(c => c.status === 'Escalated').length,
    satisfactionScore: 4.6,
    departments: []
  };

  depts.forEach(d => {
    const deptComplaints = complaints.filter(c => c.department.toString() === d._id.toString());
    details.departments.push({
      name: d.name,
      total: deptComplaints.length,
      resolved: deptComplaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length,
      escalated: deptComplaints.filter(c => c.status === 'Escalated').length
    });
  });

  return details;
};

// @desc    Export PDF Report
// @route   GET /api/reports/export/pdf
exports.exportPDF = async (req, res) => {
  try {
    const reportData = await compileReportDetails();
    generateDepartmentReport(reportData, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Excel Report
// @route   GET /api/reports/export/excel
exports.exportExcel = async (req, res) => {
  try {
    const reportData = await compileReportDetails();
    await generateExcelReport(reportData, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
