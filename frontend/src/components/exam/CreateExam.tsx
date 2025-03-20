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
      
      console.log('Received exam data:', exam); // Debug log

      // Ensure we have valid data
      if (!exam || typeof exam !== 'object') {
        throw new Error('Invalid exam data received');
      }

      let startDateTime;
      try {
        // Try parsing the date, handling different possible formats
        if (exam.startTime) {
          if (typeof exam.startTime === 'string') {
            // If it's already an ISO string, use it directly
            if (exam.startTime.includes('T')) {
              startDateTime = new Date(exam.startTime);
            } else {
              // If it's a different format, try parsing with Date.parse
              const timestamp = Date.parse(exam.startTime);
              if (isNaN(timestamp)) {
                throw new Error('Invalid date format');
              }
              startDateTime = new Date(timestamp);
            }
          } else if (exam.startTime instanceof Date) {
            startDateTime = exam.startTime;
          } else {
            throw new Error('Unsupported date format');
          }
        } else {
          // If no start time, use current date/time
          startDateTime = new Date();
        }

        if (isNaN(startDateTime.getTime())) {
          throw new Error('Invalid date value');
        }
      } catch (dateError) {
        console.error('Date parsing error:', dateError);
        // Fallback to current date if parsing fails
        startDateTime = new Date();
      }

      // Format the exam data
      const formattedExamData = {
        title: exam.title || '',
        description: exam.description || '',
        subject: exam.subject || '',
        duration: Number(exam.duration) || 60,
        startDate: format(startDateTime, 'yyyy-MM-dd'),
        startTime: format(startDateTime, 'HH:mm'),
        totalMarks: Number(exam.totalMarks) || 0,
        status: exam.status || 'DRAFT'
      };

      console.log('Formatted exam data:', formattedExamData); // Debug log
      setExamData(formattedExamData);

      // Handle questions
      let formattedQuestions = [];
      if (exam.questions && Array.isArray(exam.questions)) {
        formattedQuestions = exam.questions.map(q => ({
          _id: q._id,
          examId: q.examId,
          questionText: q.questionText || '',
          questionType: q.questionType || 'MCQ',
          marks: Number(q.marks) || 0,
          correctAnswer: q.correctAnswer || '',
          options: Array.isArray(q.options) 
            ? q.options.map(opt => ({
                text: opt.text || '',
                isCorrect: Boolean(opt.isCorrect)
              }))
            : [
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false }
              ]
        }));
      }

      console.log('Formatted questions:', formattedQuestions); // Debug log
      setQuestions(formattedQuestions);
    } catch (error) {
      console.error('Failed to load exam:', error);
      alert('Failed to load exam data. Please try again.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calculateEndDateTime = () => {
    try {
      const startDateTime = new Date(`${examData.startDate}T${examData.startTime}`);
      if (isNaN(startDateTime.getTime())) {
        throw new Error('Invalid start date/time');
      }
      return new Date(startDateTime.getTime() + (examData.duration || 0) * 60000);
    } catch (error) {
      console.error('Error calculating end time:', error);
      throw error; // Re-throw to handle in the calling function
    }
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
      
      // Validate required fields
      if (!examData.title || !examData.description || !examData.subject) {
        throw new Error('Please fill in all required exam details (title, description, and subject)');
      }

      if (questions.length === 0) {
        throw new Error('Please add at least one question to the exam');
      }

      // Create a valid date object from the form data
      const startDateTime = new Date(`${examData.startDate}T${examData.startTime}`);
      console.log('Start DateTime:', startDateTime);
      
      if (isNaN(startDateTime.getTime())) {
        throw new Error('Invalid start date/time format');
      }

      const endDateTime = calculateEndDateTime();
      console.log('End DateTime:', endDateTime);
      
      if (isNaN(endDateTime.getTime())) {
        throw new Error('Invalid end date/time calculation');
      }

      const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
      
      const examPayload = {
        title: examData.title.trim(),
        description: examData.description.trim(),
        subject: examData.subject.trim(),
        duration: Number(examData.duration),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        totalMarks: totalMarks,
        status: examData.status || 'DRAFT'
      };

      console.log('Submitting exam payload:', examPayload);

      if (examId) {
        // Update existing exam
        console.log('Updating exam with ID:', examId);
        const updatedExam = await examService.updateExam(examId, examPayload);
        console.log('Exam updated successfully:', updatedExam);
        
        // First get the existing questions to determine which ones to update vs. add
        console.log('Fetching existing questions');
        let existingQuestions = [];
        try {
          const questionsResponse = await examService.getQuestions(examId);
          existingQuestions = questionsResponse;
          console.log('Existing questions:', existingQuestions);
        } catch (error) {
          console.warn('Could not fetch existing questions:', error);
          // Continue with the assumption that no questions exist
        }
        
        // Create a map of existing questions by MongoDB ID
        const existingQuestionsMap = new Map();
        existingQuestions.forEach(q => {
          if (q._id && q._id.toString().length > 10) {
            existingQuestionsMap.set(q._id, q);
          }
        });
        
        // Process questions
        for (const question of questions) {
          try {
            // Check if this is an existing MongoDB question (has an _id longer than 10 chars and exists in our map)
            if (question._id && question._id.toString().length > 10 && existingQuestionsMap.has(question._id)) {
              // Update existing question
              console.log('Updating existing question:', question._id);
              await examService.updateQuestion(examId, question._id, {
                questionText: question.questionText,
                questionType: question.questionType,
                options: question.options?.map(opt => ({
                  text: opt.text || '',
                  isCorrect: Boolean(opt.isCorrect)
                })),
                marks: Number(question.marks),
                correctAnswer: question.correctAnswer
              });
            } else {
              // This is a new question or one with a temporary ID, so add it
              console.log('Adding new question to existing exam');
              await examService.addQuestion(examId, {
                questionText: question.questionText,
                questionType: question.questionType,
                options: question.options?.map(opt => ({
                  text: opt.text || '',
                  isCorrect: Boolean(opt.isCorrect)
                })),
                marks: Number(question.marks),
                correctAnswer: question.correctAnswer
              });
            }
          } catch (questionError) {
            console.error('Error processing question:', questionError);
            throw new Error(`Failed to save question: ${questionError.message}`);
          }
        }
      } else {
        // Create new exam
        console.log('Creating new exam');
        const createdExam = await examService.createExam(examPayload);
        console.log('Exam created successfully:', createdExam);
        
        // Add questions one by one
        for (const question of questions) {
          try {
            console.log('Adding question to new exam:', question);
            await examService.addQuestion(createdExam._id!, {
              questionText: question.questionText,
              questionType: question.questionType,
              options: question.options?.map(opt => ({
                text: opt.text || '',
                isCorrect: Boolean(opt.isCorrect)
              })),
              marks: Number(question.marks),
              correctAnswer: question.correctAnswer
            });
          } catch (questionError) {
            console.error('Error adding question:', questionError);
            throw new Error(`Failed to add question: ${questionError.message}`);
          }
        }
      }
      
      console.log('Exam and questions saved successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to save exam:', error);
      alert(error.message || 'Failed to save exam. Please check all fields and try again.');
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
      _id: `temp_${Date.now()}`,
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
      _id: isEditMode && selectedQuestion?._id ? selectedQuestion._id : `temp_${Date.now()}`,
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

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
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
              name="questionText"
              value={currentQuestion.questionText}
              onChange={handleQuestionChange}
              multiline
              rows={2}
              sx={{ mb: 2 }}
              disabled={isViewMode}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Question Type</InputLabel>
              <Select
                name="questionType"
                value={currentQuestion.questionType}
                onChange={handleQuestionChange}
                label="Question Type"
                disabled={isViewMode || isEditMode}
              >
                <MenuItem value="MCQ">Multiple Choice</MenuItem>
                <MenuItem value="TRUE_FALSE">True/False</MenuItem>
                <MenuItem value="PARAGRAPH">Paragraph</MenuItem>
              </Select>
            </FormControl>

            <TextField
              required
              fullWidth
              label="Marks"
              name="marks"
              type="number"
              value={currentQuestion.marks}
              onChange={handleQuestionChange}
              sx={{ mb: 2 }}
              InputProps={{ inputProps: { min: 1 } }}
              disabled={isViewMode}
            />

            {currentQuestion.questionType === 'MCQ' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Options
                </Typography>
                {currentQuestion.options?.map((option, index) => (
                  <Box key={index} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      required
                      fullWidth
                      label={`Option ${index + 1}`}
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                      disabled={isViewMode}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={option.isCorrect}
                          onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                          disabled={isViewMode}
                        />
                      }
                      label="Correct"
                    />
                  </Box>
                ))}
              </Box>
            )}

            {currentQuestion.questionType === 'TRUE_FALSE' && (
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Correct Answer
                </Typography>
                <RadioGroup
                  name="correctAnswer"
                  value={currentQuestion.correctAnswer || ''}
                  onChange={(e) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                  disabled={isViewMode}
                >
                  <FormControlLabel value="true" control={<Radio />} label="True" />
                  <FormControlLabel value="false" control={<Radio />} label="False" />
                </RadioGroup>
              </FormControl>
            )}

            {currentQuestion.questionType === 'PARAGRAPH' && (
              <TextField
                required
                fullWidth
                label="Correct Answer"
                name="correctAnswer"
                value={currentQuestion.correctAnswer || ''}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                multiline
                rows={3}
                sx={{ mb: 2 }}
                disabled={isViewMode}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {isViewMode ? 'Close' : 'Cancel'}
          </Button>
          {!isViewMode && (
            <Button 
              onClick={handleSaveQuestion} 
              variant="contained" 
              color="primary"
            >
              {isEditMode ? 'Save Changes' : 'Add Question'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CreateExam; 