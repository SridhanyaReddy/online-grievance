const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  complaintNumber: {
    type: String,
    required: true,
    unique: true
  },
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  subDepartment: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    trim: true,
    default: ''
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  location: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  attachments: [{
    name: { type: String },
    path: { type: String },
    mimeType: { type: String }
  }],
  status: {
    type: String,
    enum: ['Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Rejected', 'Escalated', 'Closed'],
    default: 'Submitted'
  },
  assignedEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  timeline: [{
    status: { type: String, required: true },
    remarks: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  resolution: {
    remarks: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    attachment: { type: String, default: '' } // path/URL to image/PDF visit report
  },
  feedback: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feedback',
    default: null
  },
  qrCode: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
