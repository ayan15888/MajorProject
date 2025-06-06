const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
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
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    selectedOption: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    marksObtained: {
      type: Number,
      default: 0
    }
  }],
  totalMarksObtained: {
    type: Number,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['completed', 'pending-review', 'canceled'],
    default: 'completed'
  },
  cancellationReason: {
    type: String,
    required: function() {
      return this.status === 'canceled';
    }
  },
  canceledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.status === 'canceled';
    }
  },
  canceledAt: {
    type: Date
  }
});

module.exports = mongoose.model('Result', resultSchema); 