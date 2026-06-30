const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');

// @desc    Submit citizen feedback on resolved complaint
// @route   POST /api/feedback
exports.submitFeedback = async (req, res) => {
  const { complaintId, rating, comments, isAnonymous } = req.body;

  try {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Verify ownership
    if (complaint.citizen.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only leave feedback on your own complaints.' });
    }

    // Must be resolved
    if (complaint.status !== 'Resolved' && complaint.status !== 'Closed') {
      return res.status(400).json({ success: false, message: 'Feedback can only be submitted for resolved grievances.' });
    }

    const feedback = new Feedback({
      complaint: complaintId,
      rating: parseInt(rating),
      comments: comments || '',
      isAnonymous: !!isAnonymous
    });

    await feedback.save();

    // Link feedback and transition status to Closed
    complaint.feedback = feedback._id;
    complaint.status = 'Closed';
    complaint.timeline.push({
      status: 'Closed',
      remarks: 'Citizen submitted feedback. Grievance closed.',
      updatedBy: req.user._id
    });
    
    await complaint.save();

    await AuditLog.create({
      action: 'FEEDBACK_SUBMISSION',
      performedBy: req.user._id,
      details: `Submitted rating of ${rating} for complaint: ${complaint.complaintNumber}`,
      ipAddress: req.ip || 'unknown'
    });

    res.status(201).json({ success: true, message: 'Feedback submitted successfully', data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
