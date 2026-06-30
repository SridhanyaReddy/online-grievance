const express = require('express');
const router = express.Router();
const { getUsers, createUser, verifyNGO, createAnnouncement, getAnnouncements, getAuditLogs } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.route('/users')
  .get(authenticate, authorize('admin'), getUsers)
  .post(authenticate, authorize('admin'), createUser);

router.put('/ngos/:id/verify', authenticate, authorize('admin'), verifyNGO);

router.route('/announcements')
  .post(authenticate, authorize('admin'), createAnnouncement)
  .get(authenticate, getAnnouncements); // All authenticated roles can read announcements

router.get('/logs', authenticate, authorize('admin'), getAuditLogs);

module.exports = router;
