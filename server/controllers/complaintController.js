const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const { generateQRCode } = require('../utils/qrGenerator');
const { categorizeComplaint } = require('../utils/ai');
const { sendEmail } = require('../utils/mailer');
const { generateComplaintReceipt } = require('../utils/pdfGenerator');
const AuditLog = require('../models/AuditLog');

// Generate unique tracking number
const createTrackingNumber = async () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `GRV-${dateStr}-${random}`;
};

// @desc    Raise new complaint
// @route   POST /api/complaints
exports.createComplaint = async (req, res) => {
  const { departmentId, subDepartment, category, priority, location, latitude, longitude, description } = req.body;

  try {
    let finalDeptId = departmentId;
    let finalCategory = category;
    let finalPriority = priority;

    // AI Categorization Mock if no department selected
    if (!departmentId || departmentId === 'auto') {
      const aiResult = categorizeComplaint(description);
      const matchedDept = await Department.findOne({ name: aiResult.department });
      finalDeptId = matchedDept ? matchedDept._id : null;
      finalCategory = aiResult.category;
      finalPriority = aiResult.priority;
    }

    if (!finalDeptId) {
      // Fallback to "Others" department
      const otherDept = await Department.findOne({ name: 'Others' });
      finalDeptId = otherDept ? otherDept._id : null;
    }

    const complaintNumber = await createTrackingNumber();
    
    // Create base64 QR Code
    const trackingUrl = `https://grievance-portal.gov/track/${complaintNumber}`;
    const qrCode = await generateQRCode(trackingUrl);

    // Grab attachments from Multer files
    const attachments = [];
    if (req.files) {
      req.files.forEach(file => {
        attachments.push({
          name: file.originalname,
          path: `/uploads/${file.filename}`,
          mimeType: file.mimetype
        });
      });
    }

    const complaint = new Complaint({
      complaintNumber,
      citizen: req.user._id,
      department: finalDeptId,
      subDepartment: subDepartment || '',
      category: finalCategory || 'General Issue',
      priority: finalPriority || 'medium',
      location,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      description,
      attachments,
      qrCode,
      timeline: [{
        status: 'Submitted',
        remarks: 'Grievance registered in the system.',
        updatedBy: req.user._id
      }]
    });

    await complaint.save();

    // Populate user and department info for email
    const populated = await Complaint.findById(complaint._id)
      .populate('citizen', 'name email')
      .populate('department', 'name');

    // Send Email Alert
    await sendEmail({
      to: req.user.email,
      subject: `Complaint Registered: ${complaintNumber}`,
      text: `Your grievance has been successfully submitted under the reference ${complaintNumber}. Department: ${populated.department?.name}.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h3 style="color: #1e3a8a;">Grievance Registration Confirmed</h3>
          <p>Dear ${populated.citizen?.name},</p>
          <p>Your grievance has been logged successfully under reference: <strong>${complaintNumber}</strong>.</p>
          <ul>
            <li><strong>Department:</strong> ${populated.department?.name}</li>
            <li><strong>Priority:</strong> ${populated.priority.toUpperCase()}</li>
            <li><strong>Location:</strong> ${populated.location}</li>
          </ul>
          <p>We will assign an official shortly to investigate your concern.</p>
        </div>
      `
    });

    await AuditLog.create({
      action: 'COMPLAINT_REGISTRATION',
      performedBy: req.user._id,
      details: `Registered complaint: ${complaintNumber}`,
      ipAddress: req.ip || 'unknown'
    });

    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all complaints (Role-based filtering)
// @route   GET /api/complaints
exports.getComplaints = async (req, res) => {
  const { search, priority, status, department, sort } = req.query;

  try {
    let query = {};

    // 1. Role Authorization filter
    if (req.user.role === 'citizen') {
      query.citizen = req.user._id;
    } else if (req.user.role === 'employee') {
      query.assignedEmployee = req.user._id;
    } else if (req.user.role === 'manager') {
      // Manager views complaints in their department
      if (req.user.department) {
        query.department = req.user.department;
      } else {
        return res.status(200).json({ success: true, data: [] });
      }
    }

    // 2. Extra Filters
    if (priority) query.priority = priority;
    if (status) query.status = status;
    if (department) query.department = department;

    // Search query (checks complaintNumber, description, location)
    if (search) {
      query.$or = [
        { complaintNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort order
    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'priority') sortOption = { priority: -1 }; // Let application handle logic if needed, simple sort here

    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email profilePic')
      .populate('department', 'name')
      .populate('assignedEmployee', 'name email')
      .sort(sortOption);

    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get complaint detail
// @route   GET /api/complaints/:id
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'name email profilePic')
      .populate('department', 'name manager')
      .populate('assignedEmployee', 'name email profilePic')
      .populate({
        path: 'timeline.updatedBy',
        select: 'name role'
      })
      .populate({
        path: 'comments.author',
        select: 'name role profilePic'
      });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Verify Access Permissions
    if (req.user.role === 'citizen' && complaint.citizen._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this grievance' });
    }

    if (req.user.role === 'employee' && complaint.assignedEmployee?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this grievance' });
    }

    if (req.user.role === 'manager' && complaint.department?._id.toString() !== req.user.department?.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this department grievance' });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign Employee to complaint
// @route   PUT /api/complaints/:id/assign
exports.assignEmployee = async (req, res) => {
  const { employeeId } = req.body;

  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Verify Employee is valid
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      return res.status(400).json({ success: false, message: 'Invalid employee selected' });
    }

    complaint.assignedEmployee = employeeId;
    complaint.status = 'Assigned';
    complaint.timeline.push({
      status: 'Assigned',
      remarks: `Grievance assigned to officer: ${employee.name}`,
      updatedBy: req.user._id
    });

    await complaint.save();

    // Notify Employee
    await sendEmail({
      to: employee.email,
      subject: `Complaint Assigned: ${complaint.complaintNumber}`,
      text: `You have been assigned to handle complaint ${complaint.complaintNumber}. Location: ${complaint.location}.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h3 style="color: #1e3a8a;">New Case Assigned</h3>
          <p>Dear ${employee.name},</p>
          <p>You have been assigned to inspect and resolve grievance reference: <strong>${complaint.complaintNumber}</strong>.</p>
          <p><strong>Description:</strong> ${complaint.description}</p>
          <p>Please update status on your dashboard once site visit is complete.</p>
        </div>
      `
    });

    // Notify Citizen
    const citizen = await User.findById(complaint.citizen);
    if (citizen) {
      await sendEmail({
        to: citizen.email,
        subject: `Officer Assigned to Complaint: ${complaint.complaintNumber}`,
        text: `Officer ${employee.name} has been assigned to investigate your complaint.`,
        html: `<p>Dear Citizen,</p><p>Officer <strong>${employee.name}</strong> has been assigned to resolve your complaint <strong>${complaint.complaintNumber}</strong>. You will receive progress reports shortly.</p>`
      });
    }

    res.status(200).json({ success: true, message: 'Employee assigned successfully', data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update complaint status/remarks
// @route   PUT /api/complaints/:id/status
exports.updateStatus = async (req, res) => {
  const { status, remarks } = req.body;

  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    complaint.status = status;
    complaint.timeline.push({
      status,
      remarks: remarks || `Status updated to ${status}`,
      updatedBy: req.user._id
    });

    await complaint.save();

    // Email alert
    const citizen = await User.findById(complaint.citizen);
    if (citizen) {
      await sendEmail({
        to: citizen.email,
        subject: `Complaint Status Updated: ${complaint.complaintNumber}`,
        text: `Your complaint is now in status: ${status}. Remarks: ${remarks || 'None'}`,
        html: `<p>Dear Citizen,</p><p>Your complaint <strong>${complaint.complaintNumber}</strong> has been updated to <strong>${status}</strong>.</p><p><strong>Remarks:</strong> ${remarks || 'None'}</p>`
      });
    }

    res.status(200).json({ success: true, message: 'Status updated successfully', data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add comment to complaint thread
// @route   POST /api/complaints/:id/comments
exports.addComment = async (req, res) => {
  const { text } = req.body;

  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const comment = {
      author: req.user._id,
      text,
      timestamp: new Date()
    };

    complaint.comments.push(comment);
    await complaint.save();

    res.status(200).json({ success: true, message: 'Comment added successfully', data: complaint.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resolve complaint (Close Case)
// @route   POST /api/complaints/:id/resolution
exports.resolveComplaint = async (req, res) => {
  const { remarks } = req.body;

  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    let filePath = '';
    if (req.file) {
      filePath = `/uploads/${req.file.filename}`;
    }

    complaint.status = 'Resolved';
    complaint.resolution = {
      remarks,
      resolvedAt: new Date(),
      attachment: filePath
    };

    complaint.timeline.push({
      status: 'Resolved',
      remarks: remarks || 'Grievance resolved successfully.',
      updatedBy: req.user._id
    });

    await complaint.save();

    // Notify Citizen
    const citizen = await User.findById(complaint.citizen);
    if (citizen) {
      await sendEmail({
        to: citizen.email,
        subject: `Complaint Resolved: ${complaint.complaintNumber}`,
        text: `Your grievance ${complaint.complaintNumber} has been marked as RESOLVED. Please log in to leave feedback.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="color: #16a34a;">Complaint Resolved Successfully</h3>
            <p>Dear Citizen,</p>
            <p>Your grievance reference <strong>${complaint.complaintNumber}</strong> has been resolved by our action team.</p>
            <p><strong>Remarks:</strong> ${remarks || 'Grievance resolved.'}</p>
            <p>Please log into your dashboard to download your PDF receipt or provide performance feedback rating.</p>
          </div>
        `
      });
    }

    res.status(200).json({ success: true, message: 'Complaint resolved successfully', data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download PDF Receipt
// @route   GET /api/complaints/:id/download
exports.downloadReceipt = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'name email')
      .populate('department', 'name')
      .sort({ createdAt: -1 });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Citizens can only download their own
    if (req.user.role === 'citizen' && complaint.citizen._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    generateComplaintReceipt(complaint, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
