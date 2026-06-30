const express = require('express');
const router = express.Router();
const { submitFeedback } = require('../controllers/feedbackController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, submitFeedback);

module.exports = router;
