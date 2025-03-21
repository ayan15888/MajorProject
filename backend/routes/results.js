const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const Question = require('../models/Question');

// Submit exam
router.post('/submit/:examId', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if exam is still active
    if (!exam.isActive) {
      return res.status(400).json({ message: 'Exam is no longer active' });
    }

    // Check if exam time is valid
    const now = new Date();
    if (now < exam.startTime || now > exam.endTime) {
      return res.status(400).json({ message: 'Exam is not available at this time' });
    }

    const { answers } = req.body;
    let totalMarksObtained = 0;

    // Calculate marks for multiple choice and true-false questions
    for (let answer of answers) {
      const question = await Question.findById(answer.questionId);
      if (question.questionType !== 'descriptive') {
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption && answer.selectedOption === correctOption.text) {
          totalMarksObtained += question.marks;
        }
      }
    }

    const result = new Result({
      examId: req.params.examId,
      studentId: req.user._id,
      answers,
      totalMarksObtained,
      status: exam.questions.some(q => q.questionType === 'descriptive') ? 'pending-review' : 'completed'
    });

    const savedResult = await result.save();
    res.status(201).json(savedResult);
  } catch (error) {
    console.error('Error submitting exam result:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get student's results
router.get('/student', auth, async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.user._id })
      .populate('examId', 'title subject')
      .sort({ submittedAt: -1 });
    
    console.log(`Found ${results.length} results for student ${req.user._id}`);
    res.json(results);
  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get exam results (for teachers)
router.get('/exam/:examId', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is the creator of the exam
    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const results = await Result.find({ examId: req.params.examId })
      .populate('studentId', 'name email')
      .sort({ submittedAt: -1 });
    
    console.log(`Found ${results.length} submissions for exam ${req.params.examId}`);
    res.json(results);
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update result (for reviewing descriptive answers)
router.patch('/review/:resultId', auth, async (req, res) => {
  try {
    const result = await Result.findById(req.params.resultId);
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    const exam = await Exam.findById(result.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { answers, totalMarksObtained } = req.body;
    result.answers = answers;
    result.totalMarksObtained = totalMarksObtained;
    result.status = 'completed';

    const updatedResult = await result.save();
    console.log(`Updated result ${req.params.resultId} with total marks ${totalMarksObtained}`);
    res.json(updatedResult);
  } catch (error) {
    console.error('Error updating result review:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 