const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const { verifyToken, isAdmin } = require('./auth');
const Result = require('../models/Result');
const User = require('../models/User');

// Middleware to check if user is a teacher or admin
const isTeacherOrAdmin = (req, res, next) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Teachers and admins only.' });
  }
  next();
};

// Create a new exam
router.post('/', [verifyToken, isTeacherOrAdmin], async (req, res) => {
  try {
    // Validate batch is provided
    if (!req.body.batch) {
      return res.status(400).json({ message: 'Batch is required for creating an exam' });
    }

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
router.post('/:examId/questions', [verifyToken, isTeacherOrAdmin], async (req, res) => {
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
router.get('/teacher', [verifyToken, isTeacherOrAdmin], async (req, res) => {
  try {
    // For admin, get all exams they created
    // For teacher, get only their exams
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    
    const exams = await Exam.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email role');

    console.log(`Fetched ${exams.length} exams for ${req.user.role}`);
    res.json(exams);
  } catch (error) {
    console.error('Error fetching teacher/admin exams:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get exams available for students
router.get('/student', verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const student = await User.findById(req.user._id);
    
    if (!student || !student.batch) {
      return res.status(400).json({ message: 'Student batch information not found' });
    }

    console.log('Fetching exams for student batch:', student.batch);

    // Get both: 
    // 1. Published exams that are currently active or upcoming for student's batch
    // 2. Completed exams (with results published) for student's batch
    const exams = await Exam.find({
      batch: { $regex: new RegExp(`^${student.batch}$`, 'i') }, // Case-insensitive batch matching
      $or: [
        { status: 'PUBLISHED', endTime: { $gte: now } }, // Active or upcoming exams
        { status: 'COMPLETED' } // Completed exams with results
      ]
    })
    .populate('createdBy', 'name email role') // Include role to identify creator type
    .sort({ startTime: 1 });

    console.log('Found exams:', {
      totalExams: exams.length,
      examDetails: exams.map(exam => ({
        id: exam._id,
        title: exam.title,
        status: exam.status,
        createdBy: exam.createdBy ? {
          role: exam.createdBy.role,
          name: exam.createdBy.name
        } : 'Unknown'
      }))
    });
    
    res.json(exams);
  } catch (error) {
    console.error('Error fetching student exams:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get pending approval exams (for admins) - MOVED UP to avoid path conflict
router.get('/pending-approval', [verifyToken, isAdmin], async (req, res) => {
  try {
    console.log('Finding exams with PENDING_APPROVAL status');
    const pendingExams = await Exam.find({ status: 'PENDING_APPROVAL' })
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });
    
    console.log(`Found ${pendingExams.length} pending approval exams`);
    res.json(pendingExams);
  } catch (error) {
    console.error('Error fetching pending approval exams:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all exams with their statuses (admin only)
router.get('/all-exams', [verifyToken, isAdmin], async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate('createdBy', 'name email')
      .sort({ startTime: -1 });

    // Get submission counts for all exams
    const examsWithSubmissions = await Promise.all(
      exams.map(async (exam) => {
        const submissionCount = await Result.countDocuments({ examId: exam._id });
        return {
          ...exam.toObject(),
          submissionCount
        };
      })
    );
    
    res.json(examsWithSubmissions);
  } catch (error) {
    console.error('Error fetching all exams:', error);
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

    // If student, check if they've already submitted this exam
    if (req.user.role === 'student') {
      const existingSubmission = await Result.findOne({
        examId: req.params.examId,
        studentId: req.user._id
      });

      if (existingSubmission) {
        return res.status(403).json({ message: 'You have already submitted this exam' });
      }
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
router.put('/:examId', [verifyToken, isTeacherOrAdmin], async (req, res) => {
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
router.delete('/:examId', [verifyToken, isTeacherOrAdmin], async (req, res) => {
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
router.put('/:examId/publish', [verifyToken, isTeacherOrAdmin], async (req, res) => {
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
router.put('/:examId/complete', [verifyToken, isTeacherOrAdmin], async (req, res) => {
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

    // Check if student has already submitted this exam
    const existingSubmission = await Result.findOne({
      examId: req.params.examId,
      studentId: req.user._id
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'You have already submitted this exam' });
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
router.get('/:examId/submission-status', [verifyToken, isTeacherOrAdmin], async (req, res) => {
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

// Teacher requests admin to publish results
router.put('/:examId/request-publish', [verifyToken, isTeacherOrAdmin], async (req, res) => {
  try {
    const { reviewNotes } = req.body;
    
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.examId, createdBy: req.user._id },
      { 
        status: 'PENDING_APPROVAL',
        reviewNotes: reviewNotes || ''
      },
      { new: true }
    );
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found or not authorized' });
    }

    console.log('Exam marked for admin approval:', {
      examId: exam._id,
      status: exam.status,
      teacher: req.user._id,
      reviewNotes: exam.reviewNotes
    });
    
    res.json(exam);
  } catch (error) {
    console.error('Error requesting result publication:', error);
    res.status(400).json({ message: error.message });
  }
});

// Admin approves and publishes results (accessible only to admins)
router.put('/:examId/approve-publish', [verifyToken, isAdmin], async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.examId, status: 'PENDING_APPROVAL' },
      { status: 'COMPLETED' },
      { new: true }
    );
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found or not in pending approval status' });
    }

    console.log('Exam results published by admin:', {
      examId: exam._id,
      status: exam.status,
      admin: req.user._id
    });
    
    res.json(exam);
  } catch (error) {
    console.error('Error approving exam results:', error);
    res.status(400).json({ message: error.message });
  }
});

// Admin rejects publication request
router.put('/:examId/reject-publish', [verifyToken, isAdmin], async (req, res) => {
  try {
    const { rejectReason } = req.body;
    
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.examId, status: 'PENDING_APPROVAL' },
      { 
        status: 'SUBMITTED',
        reviewNotes: rejectReason || 'Rejected by admin. Please review and resubmit.'
      },
      { new: true }
    );
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found or not in pending approval status' });
    }

    console.log('Exam result publication rejected by admin:', {
      examId: exam._id,
      status: exam.status,
      admin: req.user._id,
      reason: rejectReason
    });
    
    res.json(exam);
  } catch (error) {
    console.error('Error rejecting exam results:', error);
    res.status(400).json({ message: error.message });
  }
});

// Verify exam secure code
router.post('/:examId/verify-code', verifyToken, async (req, res) => {
  try {
    const { secureCode } = req.body;
    
    if (!secureCode || !secureCode.match(/^\d{6}$/)) {
      return res.status(400).json({ message: 'Invalid secure code format' });
    }

    // Find exam with secure code (explicitly select the secureCode field)
    const exam = await Exam.findById(req.params.examId).select('+secureCode');
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if exam is published and within time window
    const now = new Date();
    if (exam.status !== 'PUBLISHED' || now < exam.startTime || now > exam.endTime) {
      return res.status(403).json({ message: 'Exam is not available at this time' });
    }

    // Verify the secure code
    const verified = exam.secureCode === secureCode;
    
    res.json({ verified });
  } catch (error) {
    console.error('Error verifying exam code:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 