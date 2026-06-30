const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, forgotPassword, verifyOTP } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);

module.exports = router;
