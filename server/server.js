require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Configs
const connectDB = require('./config/db');

// Models (for Seeding)
const User = require('./models/User');
const Department = require('./models/Department');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const petitionRoutes = require('./routes/petitionRoutes');
const groupRoutes = require('./routes/groupRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Security Middleware setup
app.use(helmet({
  contentSecurityPolicy: false // Allows loading script charts & icons from CDNs easily
}));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(mongoSanitize());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use('/api/', apiLimiter);

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/petitions', petitionRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notifications', notificationRoutes);

// Static client path configuration
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// Route for serving client files directly (fallback to index.html for undefined routes)
app.get('*', (req, res, next) => {
  // If request is API or upload, bypass static redirect
  if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
    return next();
  }
  
  // Clean up clean routing e.g. /login serves login.html
  let requestPath = req.path;
  if (requestPath === '/') {
    requestPath = '/index.html';
  } else if (!requestPath.includes('.')) {
    requestPath += '.html';
  }

  const filePath = path.join(clientPath, requestPath);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Database seeding helper
const seedDatabase = async () => {
  try {
    console.log('Checking database seeds...');
    
    // 1. Seed Departments
    const deptsList = [
      'Roads', 'Water Supply', 'Drainage', 'Street Lights',
      'Garbage', 'Health', 'Education', 'Electricity',
      'Transport', 'Public Safety', 'Revenue', 'Others'
    ];

    for (const deptName of deptsList) {
      const exists = await Department.findOne({ name: deptName });
      if (!exists) {
        await Department.create({
          name: deptName,
          description: `Public grievance redresses related to municipal ${deptName.toLowerCase()} systems.`
        });
      }
    }

    const roadsDept = await Department.findOne({ name: 'Roads' });

    // 2. Seed Default Credentials
    const defaultCredentials = [
      {
        name: 'System Admin',
        email: 'admin@grievance.gov',
        password: 'Admin@123',
        role: 'admin',
        isEmailVerified: true
      },
      {
        name: 'Roads Department Manager',
        email: 'manager@roads.gov',
        password: 'Manager@123',
        role: 'manager',
        department: roadsDept._id,
        isEmailVerified: true
      },
      {
        name: 'Roads Department Field Officer',
        email: 'employee@roads.gov',
        password: 'Employee@123',
        role: 'employee',
        department: roadsDept._id,
        isEmailVerified: true
      },
      {
        name: 'Sample Citizen',
        email: 'citizen@gmail.com',
        password: 'Citizen@123',
        role: 'citizen',
        isEmailVerified: true
      },
      {
        name: 'GreenEarth Welfare NGO',
        email: 'ngo@gmail.com',
        password: 'NGO@123',
        role: 'ngo',
        isEmailVerified: true,
        ngoDetails: { registrationNo: 'NGO-8829-281', verified: true }
      }
    ];

    for (const cred of defaultCredentials) {
      const exists = await User.findOne({ email: cred.email });
      if (!exists) {
        const newUser = new User(cred);
        await newUser.save();
        console.log(`Seeded user credential: ${cred.email}`);
        
        // Tie Roads Manager object back to Roads department
        if (cred.role === 'manager') {
          roadsDept.manager = newUser._id;
          await roadsDept.save();
        }
      }
    }

    console.log('Database verification and seeding complete.');
  } catch (error) {
    console.error('Error seeding database:', error.message);
  }
};

// Database Initialization
const PORT = process.env.PORT || 3000;

if (process.env.MONGODB_URI) {
  connectDB().then(() => {
    seedDatabase();
  });
} else {
  console.log('WARNING: MONGODB_URI not found. Skip DB connection for local builds or vercel building phases.');
}

// Server execution check
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Grievance Redressal server listening on port ${PORT}`);
  });
}

module.exports = app;
