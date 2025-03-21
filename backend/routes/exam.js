const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const { verifyToken } = require('./auth');
const Result = require('../models/Result');

// Middleware to check if user is a teacher
const isTeacher = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Access denied. Teachers only.' });
  }
  next();
};

// Create a new exam
router.post('/', [verifyToken, isTeacher], async (req, res) => {
  try {
    const exam = new Exam({
      ...req.body,
      createdBy: req.user._id
    });
    await exam.save();
    res.status(201).json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add question to exam
router.post('/:examId/questions', [verifyToken, isTeacher], async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findOne({ _id: examId, createdBy: req.user._id });
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const question = new Question({
      ...req.body,
      examId,
      createdBy: req.user._id
    });

    await question.save();
    res.status(201).json(question);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all exams for a teacher
router.get('/teacher', [verifyToken, isTeacher], async (req, res) => {
  try {
    const exams = await Exam.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get exams available for students
router.get('/student', verifyToken, async (req, res) => {
  try {
    const now = new Date();
    // Get both: 
    // 1. Published exams that are currently active or upcoming
    // 2. Completed exams (with results published)
    const exams = await Exam.find({
      $or: [
        { status: 'PUBLISHED', endTime: { $gte: now } }, // Active or upcoming exams
        { status: 'COMPLETED' } // Completed exams with results
      ]
    })
    .populate('createdBy', 'name')
    .sort({ startTime: 1 });
    
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get exam by ID with its questions
router.get('/:examId', verifyToken, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId)
      .populate('createdBy', 'name email')
      .lean(); // Use lean() to get a plain JavaScript object
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const questions = await Question.find({ examId: exam._id }).lean();
    
    // Create a complete exam object with all necessary fields
    const completeExam = {
      ...exam,
      questions,
      status: exam.status || 'DRAFT', // Ensure status is always present
      duration: Number(exam.duration) || 0,
      totalMarks: Number(exam.totalMarks) || 0
    };

    console.log('Sending exam data:', {
      examId: completeExam._id,
      status: completeExam.status,
      questionCount: completeExam.questions.length,
      startTime: completeExam.startTime,
      endTime: completeExam.endTime
    });

    res.json(completeExam);
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update exam
router.put('/:examId', [verifyToken, isTeacher], async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.examId, createdBy: req.user._id },
      req.body,
      { new: true }
    );
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    res.json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete exam and its questions
router.delete('/:examId', [verifyToken, isTeacher], async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({
      _id: req.params.examId,
      createdBy: req.user._id
    });
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Delete all questions associated with this exam
    await Question.deleteMany({ examId: req.params.examId });
    
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Publish exam
router.put('/:examId/publish', [verifyToken, isTeacher], async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.examId, createdBy: req.user._id },
      { status: 'PUBLISHED' },
      { new: true }
    );
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found or not authorized' });
    }

    console.log('Exam published successfully:', {
      examId: exam._id,
      status: exam.status,
      startTime: exam.startTime,
      endTime: exam.endTime
    });
    
    res.json(exam);
  } catch (error) {
    console.error('Error publishing exam:', error);
    res.status(400).json({ message: error.message });
  }
});

// Complete exam and publish results
router.put('/:examId/complete', [verifyToken, isTeacher], async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.examId, createdBy: req.user._id },
      { status: 'COMPLETED' },
      { new: true }
    );
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found or not authorized' });
    }

    console.log('Exam marked as completed and results published:', {
      examId: exam._id,
      status: exam.status,
      startTime: exam.startTime,
      endTime: exam.endTime
    });
    
    res.json(exam);
  } catch (error) {
    console.error('Error completing exam and publishing results:', error);
    res.status(400).json({ message: error.message });
  }
});

// Submit exam
router.post('/:examId/submit', verifyToken, async (req, res) => {
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
      if (!question) {
        return res.status(404).json({ message: `Question ${answer.questionId} not found` });
      }
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
    
    // Don't update the exam status when an individual student submits
    // The exam should remain PUBLISHED until the end time
    // Only mark as COMPLETED by teacher when publishing results
    
    res.status(201).json(savedResult);
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get submission status for an exam
router.get('/:examId/submission-status', [verifyToken, isTeacher], async (req, res) => {
  try {
    const { examId } = req.params;
    
    // Get the exam
    const exam = await Exam.findOne({ _id: examId, createdBy: req.user._id });
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Count submissions
    const submissionCount = await Result.countDocuments({ examId });
    
    // Return submission information
    res.json({
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      submissionCount,
      startTime: exam.startTime,
      endTime: exam.endTime,
      isEnded: new Date() > new Date(exam.endTime)
    });
  } catch (error) {
    console.error('Error fetching exam submission status:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 