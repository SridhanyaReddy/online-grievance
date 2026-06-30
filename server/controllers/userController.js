const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/users/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('department', 'name')
      .select('-password');
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update profile details / avatar
// @route   PUT /api/users/me
exports.updateMe = async (req, res) => {
  const { name, password } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (password) user.password = password; // pre-save will hash

    // Handle avatar upload
    if (req.file) {
      user.profilePic = `/uploads/${req.file.filename}`;
    }

    await user.save();
    res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get list of employees (for department managers)
// @route   GET /api/users/employees
exports.getEmployees = async (req, res) => {
  try {
    // Only fetch employees belonging to the manager's department
    if (!req.user.department) {
      return res.status(400).json({ success: false, message: 'Manager has no assigned department' });
    }

    const employees = await User.find({
      role: 'employee',
      department: req.user.department
    }).select('name email profilePic');

    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
