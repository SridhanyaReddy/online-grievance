const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../utils/mailer');
const AuditLog = require('../models/AuditLog');

// Generate JWT token
const generateToken = (id, rememberMe) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET || 'fallback_secret_key', 
    { expiresIn: rememberMe ? '30d' : '1d' }
  );
};

// Generate 6 digit numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register Citizen
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password, role, registrationNo } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const verificationOTP = generateOTP();

    const userFields = {
      name,
      email,
      password,
      role: role === 'ngo' ? 'ngo' : 'citizen',
      verificationOTP,
      isEmailVerified: false
    };

    if (role === 'ngo') {
      userFields.ngoDetails = {
        registrationNo: registrationNo || '',
        verified: false // Admin must verify NGOs
      };
    }

    user = new User(userFields);
    await user.save();

    // Send Verification Email
    await sendEmail({
      to: user.email,
      subject: 'Verify Your Account - Grievance Portal',
      text: `Welcome to the Online Grievance Redressal Portal. Your registration OTP is: ${verificationOTP}.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e3a8a;">Welcome to the Grievance Redressal System</h2>
          <p>Thank you for registering. Please verify your email using the verification code below:</p>
          <div style="background-color: #f1f5f9; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #1e293b; border-radius: 4px; margin: 20px 0;">
            ${verificationOTP}
          </div>
          <p>This code will expire in 24 hours.</p>
        </div>
      `
    });

    await AuditLog.create({
      action: 'USER_REGISTRATION',
      performedBy: user._id,
      details: `Registered new account with role: ${user.role}`,
      ipAddress: req.ip || 'unknown'
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Verification OTP sent to email.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login User
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password, rememberMe } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if NGO user is approved
    if (user.role === 'ngo' && !user.ngoDetails.verified) {
      return res.status(403).json({ success: false, message: 'Your NGO account is pending administrator approval.' });
    }

    const token = generateToken(user._id, rememberMe);

    // Set HTTP-Only Cookie
    const cookieOptions = {
      expires: new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    };

    res.cookie('token', token, cookieOptions);

    await AuditLog.create({
      action: 'USER_LOGIN',
      performedBy: user._id,
      details: `User logged in. Role: ${user.role}`,
      ipAddress: req.ip || 'unknown'
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        profilePic: user.profilePic,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Email OTP
// @route   POST /api/auth/verify-email
exports.verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.verificationOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    user.isEmailVerified = true;
    user.verificationOTP = null;
    await user.save();

    await AuditLog.create({
      action: 'EMAIL_VERIFIED',
      performedBy: user._id,
      details: 'Email verification completed',
      ipAddress: req.ip || 'unknown'
    });

    res.status(200).json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot Password OTP Request
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const resetOTP = generateOTP();
    user.resetPasswordOTP = resetOTP;
    await user.save();

    // Send Email
    await sendEmail({
      to: user.email,
      subject: 'Reset Password OTP - Grievance Portal',
      text: `Your password reset OTP is: ${resetOTP}.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #c2410c;">Reset Your Password</h2>
          <p>We received a request to reset your password. Use the following OTP to proceed:</p>
          <div style="background-color: #fff7ed; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #c2410c; border-radius: 4px; margin: 20px 0; border: 1px dashed #fdba74;">
            ${resetOTP}
          </div>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `
    });

    res.status(200).json({ success: true, message: 'Password reset OTP sent to email.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Reset OTP & Update Password
// @route   POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    user.password = newPassword;
    user.resetPasswordOTP = null;
    await user.save();

    await AuditLog.create({
      action: 'PASSWORD_RESET',
      performedBy: user._id,
      details: 'Password reset completed via OTP verification',
      ipAddress: req.ip || 'unknown'
    });

    res.status(200).json({ success: true, message: 'Password reset successful!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
