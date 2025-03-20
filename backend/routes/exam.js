const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const { verifyToken } = require('./auth');

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

// Get exam by ID with its questions
router.get('/:examId', verifyToken, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const questions = await Question.find({ examId: exam._id });
    res.json({ exam, questions });
  } catch (error) {
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

module.exports = router; 