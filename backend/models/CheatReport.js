const mongoose = require('mongoose');

const CheatReportSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['tab_change', 'lost_focus', 'dev_tools', 'copy_paste'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Add index for efficient querying
CheatReportSchema.index({ examId: 1, studentId: 1, timestamp: -1 });

const CheatReport = mongoose.model('CheatReport', CheatReportSchema);

module.exports = CheatReport; 