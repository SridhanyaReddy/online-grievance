const Petition = require('../models/Petition');
const Department = require('../models/Department');
const User = require('../models/User');
const { sendEmail } = require('../utils/mailer');
const AuditLog = require('../models/AuditLog');

// @desc    Get all petitions
// @route   GET /api/petitions
exports.getPetitions = async (req, res) => {
  try {
    const petitions = await Petition.find()
      .populate('creator', 'name email profilePic')
      .populate('department', 'name manager')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: petitions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create petition
// @route   POST /api/petitions
exports.createPetition = async (req, res) => {
  const { title, description, departmentId, targetVotes } = req.body;

  try {
    const petition = new Petition({
      title,
      description,
      creator: req.user._id,
      department: departmentId,
      targetVotes: targetVotes || 100,
      votes: [req.user._id] // Creator signs by default
    });

    await petition.save();

    await AuditLog.create({
      action: 'PETITION_CREATION',
      performedBy: req.user._id,
      details: `Created petition: ${title}`,
      ipAddress: req.ip || 'unknown'
    });

    res.status(201).json({ success: true, data: petition });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Vote/Sign a petition
// @route   POST /api/petitions/:id/vote
exports.votePetition = async (req, res) => {
  try {
    const petition = await Petition.findById(req.params.id);
    if (!petition) {
      return res.status(404).json({ success: false, message: 'Petition not found' });
    }

    // Check if user already voted
    if (petition.votes.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You have already signed this petition' });
    }

    petition.votes.push(req.user._id);

    // Check if target met -> Auto forward to department manager
    if (petition.votes.length >= petition.targetVotes && petition.status === 'Active') {
      petition.status = 'Forwarded';

      // Find department manager to notify
      const dept = await Department.findById(petition.department).populate('manager');
      if (dept && dept.manager) {
        await sendEmail({
          to: dept.manager.email,
          subject: `Petition Escalation: "${petition.title}" has reached its signature target`,
          text: `The petition titled "${petition.title}" has reached ${petition.votes.length} votes and is forwarded to your department.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h3 style="color: #c2410c;">Community Petition Escalated</h3>
              <p>Dear Department Manager (${dept.name}),</p>
              <p>The citizen petition titled "<strong>${petition.title}</strong>" has reached its threshold goal of <strong>${petition.targetVotes}</strong> signatures.</p>
              <p><strong>Description:</strong> ${petition.description}</p>
              <p>The community is requesting administrative review. Please examine details inside your department reports.</p>
            </div>
          `
        });
      }
    }

    await petition.save();
    res.status(200).json({ success: true, data: petition });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add comment to petition
// @route   POST /api/petitions/:id/comments
exports.addComment = async (req, res) => {
  const { text } = req.body;

  try {
    const petition = await Petition.findById(req.params.id);
    if (!petition) {
      return res.status(404).json({ success: false, message: 'Petition not found' });
    }

    const comment = {
      author: req.user._id,
      text,
      timestamp: new Date()
    };

    petition.comments.push(comment);
    await petition.save();

    res.status(200).json({ success: true, data: petition.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
