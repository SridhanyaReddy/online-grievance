const express = require('express');
const router = express.Router();
const { getMe, updateMe, getEmployees } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/me', authenticate, getMe);
router.put('/me', authenticate, upload.single('profilePic'), updateMe);
router.get('/employees', authenticate, authorize('manager', 'admin'), getEmployees);

module.exports = router;
