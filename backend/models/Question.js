const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    enum: ['MCQ', 'TRUE_FALSE', 'PARAGRAPH'],
    required: true
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: {
    type: String, // For paragraph questions or true/false
    required: function() {
      return this.questionType === 'PARAGRAPH' || this.questionType === 'TRUE_FALSE';
    }
  },
  marks: {
    type: Number,
    required: true,
    min: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', QuestionSchema); 