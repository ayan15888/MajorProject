const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Question = require('../models/Question');
const Exam = require('../models/Exam');

// Get all questions for an exam
router.get('/exam/:examId', auth, async (req, res) => {
  try {
    const questions = await Question.find({ examId: req.params.examId });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add question to exam
router.post('/', [auth, [
  body('examId').notEmpty().withMessage('Exam ID is required'),
  body('questionText').notEmpty().withMessage('Question text is required'),
  body('options').isArray().withMessage('Options must be an array'),
  body('options.*.text').notEmpty().withMessage('Option text is required'),
  body('options.*.isCorrect').isBoolean().withMessage('Option correctness must be boolean'),
  body('marks').isNumeric().withMessage('Marks must be a number'),
  body('questionType').isIn(['multiple-choice', 'true-false', 'descriptive']).withMessage('Invalid question type')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { examId, questionText, options, marks, questionType } = req.body;

    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const question = new Question({
      examId,
      questionText,
      options,
      marks,
      questionType,
      createdBy: req.user.id
    });

    const savedQuestion = await question.save();

    // Add question to exam's questions array
    await Exam.findByIdAndUpdate(examId, {
      $push: { questions: savedQuestion._id }
    });

    res.status(201).json(savedQuestion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update question
router.put('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if user is the creator of the question
    if (question.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(updatedQuestion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete question
router.delete('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if user is the creator of the question
    if (question.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Remove question from exam's questions array
    await Exam.findByIdAndUpdate(question.examId, {
      $pull: { questions: question._id }
    });

    await question.remove();
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 