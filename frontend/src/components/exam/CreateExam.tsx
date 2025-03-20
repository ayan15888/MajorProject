import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Edit as EditIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { examService, Exam, Question } from '../../api/services/exam.service';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';

const steps = ['Exam Details', 'Add Questions'];

const CreateExam = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openQuestionDialog, setOpenQuestionDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [examData, setExamData] = useState<Omit<Exam, '_id'>>({
    title: '',
    description: '',
    subject: '',
    duration: 60,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: format(new Date(), 'HH:mm'),
    totalMarks: 0,
    status: 'DRAFT'
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    questionText: '',
    questionType: 'MCQ',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    marks: 0
  });

  useEffect(() => {
    if (examId) {
      loadExamData();
    }
  }, [examId]);

  const loadExamData = async () => {
    try {
      setLoading(true);
      const exam = await examService.getExamById(examId);
      setExamData(exam);
      setQuestions(exam.questions || []);
    } catch (error) {
      console.error('Failed to load exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEndDateTime = () => {
    const startDateTime = new Date(`${examData.startDate}T${examData.startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + examData.duration * 60000);
    return endDateTime;
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExamData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setCurrentQuestion(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options?.map((option, i) =>
        i === index ? { ...option, [field]: value } : option
      )
    }));
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!examData.title || !examData.description || !examData.subject) {
        alert('Please fill in all required fields');
        return;
      }
      setActiveStep(1);
    }
  };

  const handleBack = () => {
    setActiveStep(0);
  };

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStep === 0) {
      handleNext();
      return;
    }

    try {
      setLoading(true);
      const startDateTime = new Date(`${examData.startDate}T${examData.startTime}`);
      const endDateTime = calculateEndDateTime();
      
      // Create the exam first without questions
      const examPayload = {
        title: examData.title,
        description: examData.description,
        subject: examData.subject,
        duration: Number(examData.duration),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        totalMarks: questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
        status: 'DRAFT'
      };

      if (examId) {
        await examService.updateExam(examId, examPayload);
        // Update questions
        for (const question of questions) {
          if (question._id && question._id.toString().length > 10) {
            // Existing question, update it
            await examService.updateQuestion(examId, question._id, {
              questionText: question.questionText,
              questionType: question.questionType,
              options: question.options,
              marks: Number(question.marks),
              correctAnswer: question.correctAnswer
            });
          } else {
            // New question, add it
            await examService.addQuestion(examId, {
              questionText: question.questionText,
              questionType: question.questionType,
              options: question.options?.map(opt => ({
                text: opt.text,
                isCorrect: Boolean(opt.isCorrect)
              })),
              marks: Number(question.marks),
              correctAnswer: question.correctAnswer
            });
          }
        }
      } else {
        // Create new exam
        const createdExam = await examService.createExam(examPayload);
        
        // Add questions one by one
        for (const question of questions) {
          await examService.addQuestion(createdExam._id!, {
            questionText: question.questionText,
            questionType: question.questionType,
            options: question.options?.map(opt => ({
              text: opt.text,
              isCorrect: Boolean(opt.isCorrect)
            })),
            marks: Number(question.marks),
            correctAnswer: question.correctAnswer
          });
        }
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to save exam:', error);
      alert('Failed to save exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.questionText || !currentQuestion.marks) {
      alert('Please fill in all required fields');
      return;
    }

    // For MCQ, validate options
    if (currentQuestion.questionType === 'MCQ') {
      const emptyOptions = currentQuestion.options?.some(opt => !opt.text.trim());
      if (emptyOptions) {
        alert('Please fill in all option texts');
        return;
      }
      const hasCorrectOption = currentQuestion.options?.some(opt => opt.isCorrect);
      if (!hasCorrectOption) {
        alert('Please mark at least one option as correct');
        return;
      }
    }

    // For TRUE_FALSE, validate that correctAnswer is set
    if (currentQuestion.questionType === 'TRUE_FALSE' && !currentQuestion.correctAnswer) {
      alert('Please select the correct answer');
      return;
    }

    // For PARAGRAPH, validate that correctAnswer is set
    if (currentQuestion.questionType === 'PARAGRAPH' && !currentQuestion.correctAnswer) {
      alert('Please provide the correct answer');
      return;
    }

    const newQuestion: Question = {
      _id: Date.now().toString(),
      examId: examId || '',
      questionText: currentQuestion.questionText || '',
      questionType: currentQuestion.questionType || 'MCQ',
      marks: Number(currentQuestion.marks) || 0,
      options: currentQuestion.questionType === 'MCQ' ? currentQuestion.options : undefined,
      correctAnswer: currentQuestion.correctAnswer
    };

    setQuestions(prev => [...prev, newQuestion]);

    // Reset form
    setCurrentQuestion({
      questionText: '',
      questionType: 'MCQ',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      marks: 0
    });
    setOpenQuestionDialog(false);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (examId) {
      try {
        await examService.deleteQuestion(examId, questionId);
      } catch (error) {
        console.error('Failed to delete question:', error);
        return;
      }
    }
    setQuestions(questions.filter(q => q._id !== questionId));
  };

  const handleEditQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setCurrentQuestion({
      ...question,
      options: question.questionType === 'MCQ' 
        ? question.options || [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ]
        : undefined
    });
    setIsEditMode(true);
    setOpenQuestionDialog(true);
  };

  const handleViewQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setCurrentQuestion(question);
    setIsViewMode(true);
    setOpenQuestionDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenQuestionDialog(false);
    setIsViewMode(false);
    setIsEditMode(false);
    setSelectedQuestion(null);
    setCurrentQuestion({
      questionText: '',
      questionType: 'MCQ',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      marks: 0
    });
  };

  const handleSaveQuestion = () => {
    if (!currentQuestion.questionText || !currentQuestion.marks) {
      alert('Please fill in all required fields');
      return;
    }

    // For MCQ, validate options
    if (currentQuestion.questionType === 'MCQ') {
      const emptyOptions = currentQuestion.options?.some(opt => !opt.text.trim());
      if (emptyOptions) {
        alert('Please fill in all option texts');
        return;
      }
      const hasCorrectOption = currentQuestion.options?.some(opt => opt.isCorrect);
      if (!hasCorrectOption) {
        alert('Please mark at least one option as correct');
        return;
      }
    }

    // For TRUE_FALSE, validate that correctAnswer is set
    if (currentQuestion.questionType === 'TRUE_FALSE' && !currentQuestion.correctAnswer) {
      alert('Please select the correct answer');
      return;
    }

    // For PARAGRAPH, validate that correctAnswer is set
    if (currentQuestion.questionType === 'PARAGRAPH' && !currentQuestion.correctAnswer) {
      alert('Please provide the correct answer');
      return;
    }

    const updatedQuestion: Question = {
      _id: isEditMode ? selectedQuestion?._id || Date.now().toString() : Date.now().toString(),
      examId: examId || '',
      questionText: currentQuestion.questionText || '',
      questionType: currentQuestion.questionType || 'MCQ',
      marks: Number(currentQuestion.marks) || 0,
      options: currentQuestion.questionType === 'MCQ' ? currentQuestion.options : undefined,
      correctAnswer: currentQuestion.correctAnswer
    };

    if (isEditMode) {
      setQuestions(prev => prev.map(q => 
        q._id === updatedQuestion._id ? updatedQuestion : q
      ));
    } else {
      setQuestions(prev => [...prev, updatedQuestion]);
    }

    handleCloseDialog();
  };

  const renderExamDetails = () => (
    <Box component="form" onSubmit={handleExamSubmit} noValidate sx={{ mt: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Title"
            name="title"
            value={examData.title}
            onChange={handleExamChange}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Description"
            name="description"
            multiline
            rows={4}
            value={examData.description}
            onChange={handleExamChange}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Subject"
            name="subject"
            value={examData.subject}
            onChange={handleExamChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            type="date"
            label="Start Date"
            name="startDate"
            value={examData.startDate}
            onChange={handleExamChange}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            type="time"
            label="Start Time"
            name="startTime"
            value={examData.startTime}
            onChange={handleExamChange}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            type="number"
            label="Duration (minutes)"
            name="duration"
            value={examData.duration}
            onChange={handleExamChange}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            disabled
            fullWidth
            label="End Time (Calculated)"
            value={format(calculateEndDateTime(), 'yyyy-MM-dd HH:mm')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>
      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        Next
      </Button>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 ? (
          renderExamDetails()
        ) : (
          <Box>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenQuestionDialog(true)}
              sx={{ mb: 3 }}
            >
              Add New Question
            </Button>

            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Questions ({questions.length})
              </Typography>
              <List>
                {questions.map((question, index) => (
                  <ListItem
                    key={question._id}
                    divider
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={`${index + 1}. ${question.questionText}`}
                      secondary={`Type: ${question.questionType} | Marks: ${question.marks}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="view"
                        onClick={() => handleViewQuestion(question)}
                        sx={{ mr: 1 }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => handleEditQuestion(question)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteQuestion(question._id!)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack}>
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleExamSubmit}
                disabled={questions.length === 0 || loading}
              >
                {loading ? 'Saving...' : 'Save Exam'}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      <Dialog 
        open={openQuestionDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {isViewMode ? 'View Question' : isEditMode ? 'Edit Question' : 'Add Question'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              required
              fullWidth
              label="Question Text"
              name="