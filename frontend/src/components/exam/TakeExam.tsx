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
  TextField,
  Snackbar
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { examService } from '../../api/services/exam.service';
import { authService } from '../../api/services/auth.service';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const examContainerRef = useRef<HTMLDivElement>(null);
  
  // Store the initial height of window for devtools detection
  const windowHeight = useRef(window.innerHeight);
  const initialHeight = useRef(window.innerHeight);
  const devToolsWarningShown = useRef(false);
  const blurWarningShown = useRef(false);
  
  // Constants
  const MAX_WARNINGS = 3; // Maximum number of warnings before disqualification
  const WARN_THRESHOLD = 2; // Number of cheat attempts before showing a warning

  // Add a state variable to track warning visibility
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningType, setWarningType] = useState<'info' | 'warning' | 'error'>('warning');
  const warningTimeoutRef = useRef<any>(null);

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

  // Fullscreen mode functionality
  const enterFullscreen = async () => {
    // Check if browser supports fullscreen
    if (!document.documentElement.requestFullscreen && 
        !document.documentElement.webkitRequestFullscreen && 
        !document.documentElement.mozRequestFullScreen && 
        !document.documentElement.msRequestFullscreen) {
      console.warn('Fullscreen API not supported by this browser');
      // Allow exam to start anyway if fullscreen is not supported
      setExamStarted(true);
      return true;
    }

    try {
      // If already in fullscreen, don't try to request it again
      if (document.fullscreenElement || 
          document.webkitFullscreenElement || 
          document.mozFullScreenElement || 
          document.msFullscreenElement) {
        console.log('Already in fullscreen mode');
        setIsFullscreen(true);
        return true;
      }

      if (examContainerRef.current) {
        // Try different fullscreen methods based on browser
        if (examContainerRef.current.requestFullscreen) {
          await examContainerRef.current.requestFullscreen();
        } else if (examContainerRef.current.webkitRequestFullscreen) {
          // @ts-ignore - Safari
          await examContainerRef.current.webkitRequestFullscreen();
        } else if (examContainerRef.current.mozRequestFullScreen) {
          // @ts-ignore - Firefox
          await examContainerRef.current.mozRequestFullScreen();
        } else if (examContainerRef.current.msRequestFullscreen) {
          // @ts-ignore - IE/Edge
          await examContainerRef.current.msRequestFullscreen();
        }
        
        // Give browser a moment to enter fullscreen
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if we're in fullscreen now
        const isInFullscreen = !!(document.fullscreenElement || 
                                document.webkitFullscreenElement || 
                                document.mozFullScreenElement || 
                                document.msFullscreenElement);
        
        setIsFullscreen(isInFullscreen);
        return isInFullscreen;
      }
      return false;
    } catch (error) {
      console.error('Failed to enter fullscreen mode:', error);
      // Allow exam to proceed anyway after showing an error
      alert('Fullscreen mode could not be activated. You may continue with the exam, but this will be logged.');
      return true;
    }
  };

  // Handle fullscreen change event
  useEffect(() => {
    const isInFullscreen = () => !!(document.fullscreenElement || 
                                  document.webkitFullscreenElement || 
                                  document.mozFullScreenElement || 
                                  document.msFullscreenElement);
                                  
    const handleFullscreenChange = () => {
      const inFullscreen = isInFullscreen();
      setIsFullscreen(inFullscreen);
      
      // If exam has started and user exits fullscreen, show warning
      if (examStarted && !inFullscreen) {
        showWarningBanner('Exiting fullscreen mode is not allowed. Please return to fullscreen immediately.', 'error');
        setShowFullscreenWarning(true);
        // Log this as a cheating attempt
        logCheatAttempt('lost_focus');
      }
    };

    // Add multiple event listeners for different browsers
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      
      // Exit fullscreen when component unmounts if needed
      if (isInFullscreen()) {
        try {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            // @ts-ignore
            document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            // @ts-ignore
            document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            // @ts-ignore
            document.msExitFullscreen();
          }
        } catch (err) {
          console.error('Error exiting fullscreen on unmount:', err);
        }
      }
    };
  }, [examStarted]);

  // Modified verifySecureCode function to enter fullscreen after verification
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
        
        // Try to enter fullscreen mode
        const fullscreenSuccess = await enterFullscreen();
        
        // Always proceed with exam, but log if fullscreen failed
        setExamStarted(true);
        setSecureCodeError('');
        
        if (!fullscreenSuccess) {
          // Log the event but don't block the exam
          console.warn('Fullscreen failed but allowing exam to proceed');
          setShowFullscreenWarning(true);
        }
      } else {
        console.log('Code verification failed');
        setSecureCodeError('Invalid secure code. Please try again.');
      }
    } catch (error: any) {
      console.error('Error during code verification:', error);
      setSecureCodeError(error.message || 'Failed to verify code');
    }
  };

  // Create a function to handle fullscreen warning dismissal
  const handleFullscreenWarningClose = () => {
    setShowFullscreenWarning(false);
    
    // Try to re-enter fullscreen
    enterFullscreen();
  };

  // Function to show warnings
  const showWarningBanner = (message: string, type: 'info' | 'warning' | 'error' = 'warning', duration: number = 8000) => {
    // Clear any existing timeout
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Update warning content
    setWarningMessage(message);
    setWarningType(type);
    setWarningVisible(true);

    // Auto-hide after duration
    warningTimeoutRef.current = setTimeout(() => {
      setWarningVisible(false);
    }, duration);

    // Log warning
    console.log(`Warning displayed (${type}):`, message);
  };

  // Modify the warning display in useEffect for anti-cheat
  useEffect(() => {
    if (!examStarted) return;

    // Handle tab visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        showWarningBanner('Attempting to switch tabs is not allowed and has been reported.', 'error');
        logCheatAttempt('tab_change');
      }
    };

    // Handle window blur (clicking outside the browser)
    const handleBlur = () => {
      if (!blurWarningShown.current) {
        showWarningBanner('Clicking outside the exam window is not allowed and has been reported.', 'error');
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
        showWarningBanner('Suspicious window resize detected. This has been reported.', 'error');
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
      showWarningBanner('Copy/paste actions are not allowed and have been reported.', 'error');
      logCheatAttempt('copy_paste');
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('resize', handleResize);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);

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
      clearInterval(clearConsoleInterval);
    };
  }, [examStarted, examId, cheatAttempts, disqualified, user]);

  // Modify the logCheatAttempt function to use the enhanced warning system
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
      openWarningDialog(); // Use the new function
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

  // Add this to modify the function that opens the warning dialog
  const openWarningDialog = () => {
    setShowWarning(true);
    showWarningBanner(`WARNING: This is warning ${warningCount+1} of ${MAX_WARNINGS}. Continued violations will result in disqualification.`, 'error', 10000);
  };

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
              startIcon={<FullscreenIcon />}
            >
              Start Exam in Fullscreen Mode
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Note: Entering fullscreen mode is required. Exiting fullscreen during the exam will be logged.
            </Typography>
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
    <div ref={examContainerRef} style={{ width: '100vw', height: '100vh', overflow: 'auto', backgroundColor: '#f5f5f5', position: 'relative' }}>
      {/* Warning Banner - always visible on top */}
      {warningVisible && (
        <div 
          style={{
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100%', 
            padding: '15px',
            backgroundColor: warningType === 'error' ? '#f44336' : 
                            warningType === 'warning' ? '#ff9800' : '#2196f3',
            color: 'white',
            fontWeight: 'bold',
            textAlign: 'center',
            zIndex: 9999,
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}
        >
          {warningMessage}
          <button 
            onClick={() => setWarningVisible(false)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            ×
          </button>
        </div>
      )}

      <Container maxWidth="md" sx={{ my: 4, pb: 4, pt: warningVisible ? 6 : 3 }}>
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

      {/* Fullscreen Warning */}
      <Snackbar
        open={showFullscreenWarning}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClose={handleFullscreenWarningClose}
        sx={{ zIndex: 10000 }} // Ensure it's on top of everything
      >
        <Alert
          severity="error"
          onClose={handleFullscreenWarningClose}
          sx={{ width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
          action={
            <Button color="inherit" size="small" onClick={enterFullscreen} variant="outlined" sx={{ fontWeight: 'bold' }}>
              Return to Fullscreen
            </Button>
          }
        >
          Exiting fullscreen mode is not allowed and has been reported. Please return to fullscreen.
        </Alert>
      </Snackbar>

      {/* Warning Dialog - enhanced with better visibility */}
      <Dialog
        open={showWarning}
        onClose={handleWarningClose}
        sx={{ zIndex: 10000 }} // Ensure it's visible in fullscreen
      >
        <DialogTitle sx={{ color: 'error.main', bgcolor: 'error.light', fontWeight: 'bold' }}>⚠️ WARNING</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ my: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'error.main' }}>
              Suspicious activity has been detected and reported to the administrator.
            </Typography>
            <Typography variant="body1">
              Please focus on your exam. You have received {warningCount} out of {MAX_WARNINGS} warnings.
            </Typography>
            {warningCount >= MAX_WARNINGS - 1 && (
              <Typography variant="body1" sx={{ color: 'error.main', mt: 2, fontWeight: 'bold', border: '1px solid red', p: 2, bgcolor: 'error.light' }}>
                THIS IS YOUR FINAL WARNING. One more violation will result in disqualification.
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'grey.100' }}>
          <Button onClick={handleWarningClose} color="primary" variant="contained">
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
    </div>
  );
};

export default TakeExam; 