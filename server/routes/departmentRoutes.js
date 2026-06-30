const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment, updateDepartment } = require('../controllers/departmentController');
const { authenticate, authorize } = require('../middleware/auth');

router.route('/')
  .get(authenticate, getDepartments)
  .post(authenticate, authorize('admin'), createDepartment);

router.put('/:id', authenticate, authorize('admin'), updateDepartment);

module.exports = router;
