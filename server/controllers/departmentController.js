const Department = require('../models/Department');
const User = require('../models/User');

// @desc    Get all departments
// @route   GET /api/departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().populate('manager', 'name email');
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create department
// @route   POST /api/departments
exports.createDepartment = async (req, res) => {
  const { name, description } = req.body;

  try {
    const deptExists = await Department.findOne({ name });
    if (deptExists) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }

    const department = new Department({ name, description });
    await department.save();

    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update department (assign manager, etc)
// @route   PUT /api/departments/:id
exports.updateDepartment = async (req, res) => {
  const { description, managerId } = req.body;

  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    if (description) department.description = description;

    if (managerId) {
      const manager = await User.findById(managerId);
      if (!manager || manager.role !== 'manager') {
        return res.status(400).json({ success: false, message: 'User is not a department manager' });
      }
      department.manager = managerId;

      // Update manager's department
      manager.department = department._id;
      await manager.save();
    }

    await department.save();
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
