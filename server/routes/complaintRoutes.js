const express = require('express');
const router = express.Router();
const { 
  createComplaint, 
  getComplaints, 
  getComplaintById, 
  assignEmployee, 
  updateStatus, 
  addComment, 
  resolveComplaint, 
  downloadReceipt 
} = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .post(authenticate, upload.array('attachments', 5), createComplaint)
  .get(authenticate, getComplaints);

router.route('/:id')
  .get(authenticate, getComplaintById);

router.put('/:id/assign', authenticate, authorize('manager', 'admin'), assignEmployee);
router.put('/:id/status', authenticate, authorize('employee', 'manager', 'admin'), updateStatus);
router.post('/:id/comments', authenticate, addComment);
router.post('/:id/resolution', authenticate, authorize('employee', 'manager', 'admin'), upload.single('attachment'), resolveComplaint);
router.get('/:id/download', authenticate, downloadReceipt);

module.exports = router;
