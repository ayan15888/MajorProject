const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Exam = require('../models/Exam');
const Question = require('../models/Question');

// Get all exams
router.get('/', auth, async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new exam
router.post('/', [auth, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('duration').isNumeric().withMessage('Duration must be a number'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('totalMarks').isNumeric().withMessage('Total marks must be a number'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, duration, subject, totalMarks, startTime, endTime } = req.body;

    const exam = new Exam({
      title,
      description,
      duration,
      subject,
      totalMarks,
      startTime,
      endTime,
      createdBy: req.user.id
    });

    const savedExam = await exam.save();
    res.status(201).json(savedExam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get exam by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('questions');
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update exam
router.put('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is the creator of the exam
    if (exam.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(updatedExam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete exam
router.delete('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is the creator of the exam
    if (exam.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Question.deleteMany({ examId: req.params.id });
    await exam.remove();

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 