import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { examService } from '../../api/services/exam.service';

interface Answer {
  questionId: string;
  selectedOption: string;
}

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<any>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExam = async () => {
      try {
        if (!examId) return;
        const examData = await examService.getExamById(examId);
        console.log('Exam data:', examData);
        setExam(examData);
        
        // Initialize answers array
        if (examData.questions) {
          setAnswers(examData.questions.map((q: any) => ({
            questionId: q._id,
            selectedOption: ''
          })));
        }

        // Calculate time left
        const startTime = new Date(examData.startTime).getTime();
        const endTime = new Date(examData.endTime).getTime();
        const now = Date.now(); // Use Date.now() for consistency

        console.log('Time validation:', {
          status: examData.status,
          startTime: new Date(startTime).toLocaleString(),
          endTime: new Date(endTime).toLocaleString(),
          now: new Date(now).toLocaleString(),
          isBeforeStart: now < startTime,
          isAfterEnd: now > endTime,
          timeUntilStart: Math.floor((startTime - now) / 1000 / 60),
          timeUntilEnd: Math.floor((endTime - now) / 1000 / 60)
        });

        // First check if the exam exists and has questions
        if (!examData || !examData.questions || examData.questions.length === 0) {
          setError('This exam is not available or has no questions.');
          return;
        }

        // Then check if exam is published
        if (examData.status !== 'PUBLISHED') {
          setError(`This exam is not available yet. Current status: ${examData.status}`);
          return;
        }

        // Finally check timing
        if (now < startTime) {
          const timeToStart = Math.floor((startTime - now) / 1000 / 60); // minutes
          setError(`This exam has not started yet. It will start in ${timeToStart} minutes.`);
          return;
        }

        if (now > endTime) {
          setError('This exam has ended.');
          return;
        }

        // If we reach here, exam is available
        const timeUntilEnd = Math.floor((endTime - now) / 1000);
        const examDurationInSeconds = examData.duration * 60;
        const remainingTime = Math.min(timeUntilEnd, examDurationInSeconds);
        
        console.log('Setting time left:', {
          timeUntilEnd,
          examDurationInSeconds,
          remainingTime
        });
        
        setTimeLeft(remainingTime);
        setError(null); // Clear any previous errors

      } catch (error) {
        console.error('Failed to load exam:', error);
        setError('Failed to load exam. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId]);

  useEffect(() => {
    if (timeLeft > 0 && !examSubmitted) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, examSubmitted]);

  const handleAnswerChange = (questionId: string, selectedOption: string) => {
    setAnswers(prev =>
      prev.map(answer =>
        answer.questionId === questionId
          ? { ...answer, selectedOption }
          : answer
      )
    );
  };

  const handleSubmit = async () => {
    try {
      if (!examId) return;
      
      setLoading(true);
      await examService.submitExam(examId, { answers });
      setExamSubmitted(true);
      setConfirmSubmit(false);
      
      // Show success message and redirect after a delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error) {
      console.error('Failed to submit exam:', error);
      setError('Failed to submit exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (examSubmitted) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          Exam submitted successfully! Redirecting to dashboard...
        </Alert>
      </Container>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {exam?.title}
          </Typography>
          <Typography variant="h6" color="error">
            Time Left: {formatTime(timeLeft)}
          </Typography>
        </Box>

        <Typography variant="subtitle1" gutterBottom>
          Subject: {exam?.subject}
        </Typography>
        <Typography variant="body2" gutterBottom>
          Total Marks: {exam?.totalMarks}
        </Typography>

        <Box sx={{ mt: 4 }}>
          {exam?.questions?.map((question: any, index: number) => (
            <Paper key={question._id} sx={{ p: 3, mb: 3 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  <Typography variant="h6">
                    Question {index + 1} ({question.marks} marks)
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>
                    {question.questionText}
                  </Typography>
                </FormLabel>
                <RadioGroup
                  value={answers.find(a => a.questionId === question._id)?.selectedOption || ''}
                  onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                >
                  {question.options?.map((option: any, optIndex: number) => (
                    <FormControlLabel
                      key={optIndex}
                      value={option.text}
                      control={<Radio />}
                      label={option.text}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Paper>
          ))}
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setConfirmSubmit(true)}
            disabled={answers.some(a => !a.selectedOption)}
          >
            Submit Exam
          </Button>
        </Box>
      </Paper>

      <Dialog
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
      >
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to submit your exam? You cannot change your answers after submission.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSubmit(false)}>Cancel</Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TakeExam; 