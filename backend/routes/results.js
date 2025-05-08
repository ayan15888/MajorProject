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

// Get student's result for a specific exam
router.get('/student/exam/:examId', auth, async (req, res) => {
  try {
    // Find the student's result for this exam
    const result = await Result.findOne({ 
      examId: req.params.examId, 
      studentId: req.user._id 
    }).populate('examId');
    
    if (!result) {
      return res.status(404).json({ message: 'Result not found for this exam' });
    }

    // Get the exam to fetch questions and correct answers
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if exam is COMPLETED (results are published)
    if (exam.status !== 'COMPLETED') {
      return res.status(403).json({ message: 'Results are not published yet' });
    }

    // Get all questions for this exam to include correct answers
    const questions = await Question.find({ examId: req.params.examId });
    
    // Format the response with all necessary data
    const detailedResult = {
      ...result.toObject(),
      questions: questions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks
      }))
    };
    
    console.log(`Fetched result for student ${req.user._id} in exam ${req.params.examId}`);
    res.json(detailedResult);
  } catch (error) {
    console.error('Error fetching student exam result:', error);
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

// Check if student has submitted an exam (regardless of status)
router.get('/check-submission/:examId', auth, async (req, res) => {
  try {
    // Find if the student has submitted this exam
    const submission = await Result.findOne({ 
      examId: req.params.examId, 
      studentId: req.user._id 
    });
    
    // Return boolean result
    res.json({ 
      hasSubmitted: !!submission,
      submissionId: submission?._id || null
    });
  } catch (error) {
    console.error('Error checking student submission:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get exam submissions (for admin)
router.get('/admin/exam/:examId', [auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const results = await Result.find({ examId: req.params.examId })
      .populate('studentId', 'name email')
      .sort({ submittedAt: -1 });
    
    console.log(`Admin fetched ${results.length} submissions for exam ${req.params.examId}`);
    res.json(results);
  } catch (error) {
    console.error('Error fetching exam submissions for admin:', error);
    res.status(500).json({ message: error.message });
  }
}]);

// Cancel exam submission (admin only)
router.put('/admin/cancel-submission/:resultId', [auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ message: 'Cancellation reason is required' });
    }

    const result = await Result.findById(req.params.resultId);
    if (!result) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Update the result status and add cancellation details
    result.status = 'canceled';
    result.cancellationReason = reason;
    result.canceledBy = req.user._id;
    result.canceledAt = new Date();

    const updatedResult = await result.save();
    
    console.log(`Admin canceled submission ${req.params.resultId} due to: ${reason}`);
    res.json(updatedResult);
  } catch (error) {
    console.error('Error canceling submission:', error);
    res.status(500).json({ message: error.message });
  }
}]);

// Get exam submissions (for teachers)
router.get('/teacher/exam/:examId', auth, async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied. Teachers only.' });
    }

    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if the teacher created this exam
    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only view submissions for your own exams.' });
    }

    const results = await Result.find({ examId: req.params.examId })
      .populate('studentId', 'name email')
      .populate({
        path: 'examId',
        select: 'title subject totalMarks questions',
        populate: {
          path: 'questions',
          model: 'Question'
        }
      })
      .sort({ submittedAt: -1 });
    
    console.log(`Teacher fetched ${results.length} submissions for exam ${req.params.examId}`);
    res.json(results);
  } catch (error) {
    console.error('Error fetching exam submissions for teacher:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 