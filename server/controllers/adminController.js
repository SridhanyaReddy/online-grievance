const User = require('../models/User');
const Department = require('../models/Department');
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');
const { sendEmail } = require('../utils/mailer');

// @desc    Get all users with search
// @route   GET /api/admin/users
exports.getUsers = async (req, res) => {
  const { role, search } = req.query;

  try {
    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).populate('department', 'name').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Employee or Manager account
// @route   POST /api/admin/users
exports.createUser = async (req, res) => {
  const { name, email, password, role, departmentId } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    user = new User({
      name,
      email,
      password,
      role,
      department: departmentId || null,
      isEmailVerified: true // Pre-verified by admin
    });

    await user.save();

    // If Manager, associate with Department
    if (role === 'manager' && departmentId) {
      await Department.findByIdAndUpdate(departmentId, { manager: user._id });
    }

    // Send Onboarding Email
    const label = role === 'manager' ? 'Department Manager' : 'Field Employee';
    await sendEmail({
      to: email,
      subject: `Account Created: ${label} Portal`,
      text: `An administrator has registered your profile on the Grievance Portal. Email: ${email}, Password: ${password}.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h3 style="color: #1e3a8a;">Portal Profile Created</h3>
          <p>Dear ${name},</p>
          <p>You have been onboarding to the National Grievance Redressal system as a <strong>${label}</strong>.</p>
          <p>Use the credentials below to log in:</p>
          <ul>
            <li><strong>Portal URL:</strong> https://grievance-portal.gov/login</li>
            <li><strong>Login ID:</strong> ${email}</li>
            <li><strong>Password:</strong> ${password}</li>
          </ul>
          <p style="color: #64748b;">It is highly recommended that you change your password upon your first login inside the Profile section.</p>
        </div>
      `
    });

    await AuditLog.create({
      action: 'ADMIN_CREATE_USER',
      performedBy: req.user._id,
      details: `Created user ${email} with role ${role}`,
      ipAddress: req.ip || 'unknown'
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify NGO Registration
// @route   PUT /api/admin/ngos/:id/verify
exports.verifyNGO = async (req, res) => {
  const { verified } = req.body;

  try {
    const ngo = await User.findById(req.params.id);
    if (!ngo || ngo.role !== 'ngo') {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }

    ngo.ngoDetails.verified = !!verified;
    await ngo.save();

    // Notify NGO
    await sendEmail({
      to: ngo.email,
      subject: `NGO Verification Status Update`,
      text: `Your NGO profile verification has been updated. Verified: ${ngo.ngoDetails.verified}`,
      html: `
        <p>Dear NGO Partner,</p>
        <p>Your registration profile verification state has been updated to: <strong>${ngo.ngoDetails.verified ? 'VERIFIED (Approved)' : 'PENDING'}</strong>.</p>
        ${ngo.ngoDetails.verified ? '<p>You can now sign in and launch campaigns or support petitions.</p>' : ''}
      `
    });

    await AuditLog.create({
      action: 'ADMIN_VERIFY_NGO',
      performedBy: req.user._id,
      details: `Set verification status of NGO ${ngo.email} to ${ngo.ngoDetails.verified}`,
      ipAddress: req.ip || 'unknown'
    });

    res.status(200).json({ success: true, data: ngo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create announcement
// @route   POST /api/admin/announcements
exports.createAnnouncement = async (req, res) => {
  const { title, content } = req.body;

  try {
    const announcement = new Announcement({
      title,
      content,
      createdBy: req.user._id
    });

    await announcement.save();

    await AuditLog.create({
      action: 'ADMIN_ANNOUNCEMENT_CREATE',
      performedBy: req.user._id,
      details: `Created announcement: ${title}`,
      ipAddress: req.ip || 'unknown'
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get announcements
// @route   GET /api/admin/announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const list = await Announcement.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get system audit logs
// @route   GET /api/admin/logs
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().populate('performedBy', 'name email role').sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
