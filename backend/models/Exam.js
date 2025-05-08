const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 1
  },
  subject: {
    type: String,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 0
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'SUBMITTED', 'PENDING_APPROVAL', 'COMPLETED'],
    default: 'DRAFT'
  },
  reviewNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Ensure endTime is after startTime
ExamSchema.pre('save', function(next) {
  if (this.endTime <= this.startTime) {
    next(new Error('End time must be after start time'));
  }
  next();
});

module.exports = mongoose.model('Exam', ExamSchema); 