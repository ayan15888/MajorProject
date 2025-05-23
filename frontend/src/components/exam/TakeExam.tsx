import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  TextField
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { examService } from '../../api/services/exam.service';
import { authService } from '../../api/services/auth.service';

interface Answer {
  questionId: string;
  selectedOption: string;
}

interface CheatAttempt {
  type: 'tab_change' | 'lost_focus' | 'dev_tools' | 'copy_paste';
  timestamp: number;
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [secureCode, setSecureCode] = useState('');
  const [secureCodeError, setSecureCodeError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [cheatAttempts, setCheatAttempts] = useState<CheatAttempt[]>([]);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  
  // Store the initial height of window for devtools detection
  const windowHeight = useRef(window.innerHeight);
  const initialHeight = useRef(window.innerHeight);
  const devToolsWarningShown = useRef(false);
  const blurWarningShown = useRef(false);
  
  // Constants
  const MAX_WARNINGS = 3; // Maximum number of warnings before disqualification
  const WARN_THRESHOLD = 2; // Number of cheat attempts before showing a warning

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Failed to get current user:", error);
      }
    };
    
    getCurrentUser();
  }, []);

  useEffect(() => {
    const loadExam = async () => {
      try {
        if (!examId) return;
        
        setLoading(true);
        
        try {
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

        } catch (error: any) {
          // Handle case where student already submitted the exam
          if (error.response?.status === 403 && error.response?.data?.message === 'You have already submitted this exam') {
            console.log('Student has already submitted this exam');
            setError('You have already submitted this exam. You cannot take it again.');
            
            // Redirect to dashboard after a delay
            setTimeout(() => {
              navigate('/dashboard');
            }, 3000);
          } else {
        console.error('Failed to load exam:', error);
        setError('Failed to load exam. Please try again.');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId, navigate]);

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
    } catch (error: any) {
      console.error('Failed to submit exam:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit exam. Please try again.';
      setError(errorMessage);
      if (error.response?.data?.message === 'You have already submitted this exam') {
        // If already submitted, redirect to dashboard after showing error
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifySecureCode = async () => {
    try {
      if (!secureCode.match(/^\d{6}$/)) {
        setSecureCodeError('Please enter a valid 6-digit code');
        return;
      }

      console.log('Attempting to verify secure code for exam:', examId);
      const response = await examService.verifyExamCode(examId!, secureCode);
      console.log('Verification response:', response);

      if (response.verified) {
        console.log('Code verified successfully, starting exam');
        setExamStarted(true);
        setSecureCodeError('');
      } else {
        console.log('Code verification failed');
        setSecureCodeError('Invalid secure code. Please try again.');
      }
    } catch (error: any) {
      console.error('Error during code verification:', error);
      setSecureCodeError(error.message || 'Failed to verify code');
    }
  };

  // Anti-cheat system
  useEffect(() => {
    if (!examStarted) return;

    // Function to log cheat attempts
    const logCheatAttempt = async (type: 'tab_change' | 'lost_focus' | 'dev_tools' | 'copy_paste') => {
      if (disqualified) return; // Don't log if already disqualified
      
      const newAttempt = { type, timestamp: Date.now() };
      setCheatAttempts(prev => [...prev, newAttempt]);

      try {
        // Report the attempt to backend
        await examService.reportCheatAttempt(examId!, {
          type,
          timestamp: Date.now(),
          examId: examId!,
          studentName: user?.name || 'Unknown',
          studentId: user?._id || 'Unknown'
        });
      } catch (error) {
        console.error("Failed to report cheat attempt:", error);
      }

      // Count recent attempts (in the last 5 minutes)
      const recentAttempts = [...cheatAttempts, newAttempt].filter(
        attempt => Date.now() - attempt.timestamp < 5 * 60 * 1000
      );

      // Show warning if exceeded threshold
      if (recentAttempts.length >= WARN_THRESHOLD) {
        setShowWarning(true);
        setWarningCount(prev => {
          const newCount = prev + 1;
          if (newCount >= MAX_WARNINGS) {
            setDisqualified(true);
            handleDisqualification();
          }
          return newCount;
        });
        
        // Clear recent attempts after warning
        setCheatAttempts(prev => 
          prev.filter(attempt => Date.now() - attempt.timestamp >= 5 * 60 * 1000)
        );
      }
    };

    // Handle tab visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logCheatAttempt('tab_change');
      }
    };

    // Handle window blur (clicking outside the browser)
    const handleBlur = () => {
      if (!blurWarningShown.current) {
        logCheatAttempt('lost_focus');
        blurWarningShown.current = true;
        // Reset after 5 seconds
        setTimeout(() => {
          blurWarningShown.current = false;
        }, 5000);
      }
    };

    // Handle resize (potential DevTools open)
    const handleResize = () => {
      const heightDifference = Math.abs(window.innerHeight - initialHeight.current);
      const threshold = initialHeight.current * 0.1; // 10% height change threshold
      
      if (heightDifference > threshold && !devToolsWarningShown.current) {
        logCheatAttempt('dev_tools');
        devToolsWarningShown.current = true;
        // Reset after 5 seconds
        setTimeout(() => {
          devToolsWarningShown.current = false;
        }, 5000);
      }
    };

    // Handle copy/paste attempts
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logCheatAttempt('copy_paste');
    };

    // Right-click prevention
    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('resize', handleResize);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('contextmenu', preventRightClick);

    // DevTools detection by console clearing
    const clearConsoleInterval = setInterval(() => {
      console.clear();
      console.log('%c⚠️ This exam is monitored. Please do not try to cheat.', 
        'color: red; font-size: 20px; font-weight: bold;');
    }, 3000);

    return () => {
      // Clean up event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('contextmenu', preventRightClick);
      clearInterval(clearConsoleInterval);
    };
  }, [examStarted, examId, cheatAttempts, disqualified, user]);

  const handleDisqualification = async () => {
    try {
      // Submit the exam with a flag indicating disqualification
      await examService.disqualifyExam(examId!, {
        studentId: user?._id,
        studentName: user?.name,
        reason: `Multiple violations detected: ${cheatAttempts.length} attempts`
      });
      
      alert("You have been disqualified from this exam due to multiple violations of exam rules.");
      navigate('/dashboard');
    } catch (error) {
      console.error("Failed to disqualify exam:", error);
    }
  };

  // Handle the warning dialog close
  const handleWarningClose = () => {
    setShowWarning(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
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

  if (!examStarted) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            {exam?.title}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Please enter the secure code provided by your teacher to start the exam.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Secure Code"
              value={secureCode}
              onChange={(e) => setSecureCode(e.target.value)}
              error={!!secureCodeError}
              helperText={secureCodeError}
              type="password"
              inputProps={{
                maxLength: 6,
                pattern: "\\d{6}"
              }}
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={verifySecureCode}
              disabled={!secureCode || secureCode.length !== 6}
            >
              Start Exam
            </Button>
          </Box>
        </Paper>
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
    <>
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
                    {question.questionType === 'MCQ' && question.options?.map((option: any, optIndex: number) => (
                      <FormControlLabel
                        key={optIndex}
                        value={option.text}
                        control={<Radio />}
                        label={option.text}
                      />
                    ))}
                    
                    {question.questionType === 'TRUE_FALSE' && (
                      <>
                        <FormControlLabel
                          value="true"
                          control={<Radio />}
                          label="True"
                        />
                        <FormControlLabel
                          value="false"
                          control={<Radio />}
                          label="False"
                        />
                      </>
                    )}
                    
                    {question.questionType === 'PARAGRAPH' && (
                      <Box sx={{ mt: 2 }}>
                        <textarea
                          style={{ 
                            width: '100%', 
                            padding: '10px', 
                            minHeight: '100px',
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                          }}
                          value={answers.find(a => a.questionId === question._id)?.selectedOption || ''}
                          onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                          placeholder="Enter your answer here..."
                        />
                      </Box>
                    )}
                  </RadioGroup>
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

      {/* Warning Dialog */}
      <Dialog
        open={showWarning}
        onClose={handleWarningClose}
      >
        <DialogTitle sx={{ color: 'error.main' }}>⚠️ Warning</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Suspicious activity has been detected and reported to the administrator. 
            Please focus on your exam. You have received {warningCount} out of {MAX_WARNINGS} warnings.
            {warningCount >= MAX_WARNINGS - 1 && (
              <Typography variant="body1" sx={{ color: 'error.main', mt: 2, fontWeight: 'bold' }}>
                THIS IS YOUR FINAL WARNING. One more violation will result in disqualification.
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleWarningClose} color="primary">
            I Understand
          </Button>
        </DialogActions>
      </Dialog>

      {/* Disqualification Dialog */}
      <Dialog
        open={disqualified}
        disableEscapeKeyDown
        disablePortal
      >
        <DialogTitle sx={{ color: 'error.main' }}>Exam Terminated</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your exam has been terminated due to multiple violations of exam rules. 
            This incident has been reported to administrators.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/dashboard')} color="primary">
            Return to Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TakeExam; 