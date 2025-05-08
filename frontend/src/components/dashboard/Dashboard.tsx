import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  Button,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Avatar,
  useTheme,
  alpha,
  Tooltip,
  Alert,
  AlertTitle
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../api/services/auth.service';
import { examService, Exam, Question } from '../../api/services/exam.service';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  AccessTime as AccessTimeIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Grade as GradeIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

interface User {
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

interface ExamWithSubmissions extends Exam {
  submissionCount?: number;
  hasSubmitted?: boolean;
  submissionStatus?: string;
  cancellationReason?: string;
  reviewedCount?: number;
  pendingReviewCount?: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamWithSubmissions[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const theme = useTheme();

  const fetchSubmissionStatus = async (examId: string): Promise<number> => {
    try {
      const status = await examService.getExamSubmissionStatus(examId);
      console.log('Submission status for exam:', status);
      return status.submissionCount || 0;
    } catch (error) {
      console.error('Error fetching submission status:', error);
      return 0;
    }
  };

  const checkExamSubmission = async (examId: string): Promise<{ hasSubmitted: boolean; status?: string; reason?: string }> => {
    try {
      const result = await examService.getStudentExamResult(examId);
      return { 
        hasSubmitted: true, 
        status: result.status,
        reason: result.status === 'canceled' ? result.cancellationReason : undefined
      };
    } catch (error: any) {
      // Handle 404 (no result found) and 403 (results not published)
      if (error.response?.status === 404 || error.response?.status === 403) {
        // Also check if there's a submission in the backend but results not published yet
        try {
          const response = await fetch(`/api/results/check-submission/${examId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          return { 
            hasSubmitted: data.hasSubmitted || false,
            status: data.status,
            reason: data.status === 'canceled' ? data.cancellationReason : undefined
          };
        } catch (checkError) {
          console.error('Error checking submission directly:', checkError);
          return { hasSubmitted: false };
        }
      }
      console.error('Error checking exam submission:', error);
      return { hasSubmitted: false };
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await authService.getCurrentUser();
        console.log('User data:', userData);
        setUser(userData);
        
        if (userData.role === 'teacher') {
          const teacherExams = await examService.getTeacherExams();
          console.log('Teacher exams:', teacherExams);
          
          const examsWithSubmissions = await Promise.all(
            teacherExams.map(async (exam: Exam) => {
              if (exam.status === 'PUBLISHED') {
                const submissionCount = await fetchSubmissionStatus(exam._id!);
                return { ...exam, submissionCount };
              }
              return exam;
            })
          );
          
          setExams(examsWithSubmissions);
        } else if (userData.role === 'student') {
          console.log('Fetching student exams...');
          const studentExams = await examService.getStudentExams();
          console.log('Student exams:', studentExams);
          
          // Check submission status for each exam
          const examsWithSubmissionStatus = await Promise.all(
            studentExams.map(async (exam: Exam) => {
              if (exam.status === 'PUBLISHED') {
                const submissionStatus = await checkExamSubmission(exam._id!);
                return { 
                  ...exam, 
                  hasSubmitted: submissionStatus.hasSubmitted,
                  submissionStatus: submissionStatus.status,
                  cancellationReason: submissionStatus.reason
                };
              }
              return exam;
            })
          );
          
          setExams(examsWithSubmissionStatus);
        }
      } catch (error) {
        console.error('Failed to fetch user data or exams:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleCreateExam = () => {
    navigate('/create-exam');
  };

  const handleEditExam = (examId: string) => {
    navigate(`/edit-exam/${examId}`);
  };

  const handleViewExam = (exam: Exam) => {
    // Fetch the exam with questions before showing the dialog
    examService.getExamById(exam._id!)
      .then(completeExam => {
        setSelectedExam(completeExam);
        setViewDialogOpen(true);
      })
      .catch(error => {
        console.error('Failed to fetch exam details:', error);
        alert('Failed to load exam details. Please try again.');
      });
  };

  const handleDeleteExam = async (examId: string) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await examService.deleteExam(examId);
        setExams(exams.filter(exam => exam._id !== examId));
      } catch (error) {
        console.error('Failed to delete exam:', error);
        alert('Failed to delete exam. Please try again.');
      }
    }
  };

  const handlePublishExam = async (examId: string) => {
    if (window.confirm('Are you sure you want to publish this exam? Students will be able to take it once published.')) {
      try {
        console.log('Publishing exam:', examId);
        const updatedExam = await examService.publishExam(examId);
        console.log('Exam published successfully:', updatedExam);
        
        if (!updatedExam || updatedExam.status !== 'PUBLISHED') {
          throw new Error('Failed to publish exam - status not updated correctly');
        }

        // Update the exam in the current state immediately
        setExams(prevExams => 
          prevExams.map(exam => 
            exam._id === examId ? { ...exam, ...updatedExam } : exam
          )
        );
        
        // Refresh the exam list to get the latest data
        if (user?.role === 'teacher') {
          const teacherExams = await examService.getTeacherExams();
          console.log('Refreshed teacher exams:', teacherExams);
          setExams(teacherExams);
        } else if (user?.role === 'student') {
          const studentExams = await examService.getStudentExams();
          console.log('Refreshed student exams:', studentExams);
          setExams(studentExams);
        }
      } catch (error) {
        console.error('Failed to publish exam:', error);
        alert('Failed to publish exam. Please try again.');
      }
    }
  };

  const handleViewSubmissions = (examId: string) => {
    navigate(`/exam-submissions/${examId}`);
  };

  const handleViewResults = (examId: string) => {
    navigate(`/exam-results/${examId}`);
  };

  const handleRequestPublishResults = async (examId: string) => {
    // First check if all submissions are reviewed
    try {
      const submissionStatus = await examService.getExamSubmissionStatus(examId);
      if (submissionStatus.pendingReviewCount > 0) {
        alert('Please review all submissions before requesting publication. Some submissions are still pending review.');
        return;
      }
      
      if (window.confirm('Are you sure you want to request admin approval to publish these results? Students will be able to view their marks after admin approval.')) {
        try {
          console.log('Requesting publication for exam:', examId);
          const updatedExam = await examService.requestPublishResults(examId);
          console.log('Exam marked for admin approval:', updatedExam);
          
          if (!updatedExam || updatedExam.status !== 'PENDING_APPROVAL') {
            throw new Error('Failed to request publication - status not updated correctly');
          }

          // Update the exam in the current state immediately
          setExams(prevExams => 
            prevExams.map(exam => 
              exam._id === examId ? { ...exam, ...updatedExam } : exam
            )
          );
          
          // Refresh the exam list to get the latest data
          if (user?.role === 'teacher') {
            const teacherExams = await examService.getTeacherExams();
            console.log('Refreshed teacher exams:', teacherExams);
            setExams(teacherExams);
          }
          
          alert('Publication request submitted successfully! Results will be visible to students after admin approval.');
        } catch (error) {
          console.error('Failed to request publication:', error);
          alert('Failed to request publication. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error checking submission status:', error);
      alert('Failed to check submission status. Please try again.');
    }
  };

  const showRejectionNotes = (exam: any) => {
    if (exam.reviewNotes) {
      alert(`Admin feedback: ${exam.reviewNotes}`);
    } else {
      alert('The publication request was rejected by admin. Please review your exam submissions and try again.');
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ backgroundColor: theme.palette.background.default }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: theme.palette.background.default, minHeight: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ backgroundColor: theme.palette.primary.main }}>
        <Toolbar>
          <SchoolIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Online Examination System
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user?.role === 'admin' && (
              <Button
                color="inherit"
                variant="outlined"
                onClick={() => navigate('/admin')}
                sx={{
                  borderColor: alpha(theme.palette.common.white, 0.5),
                  '&:hover': {
                    borderColor: theme.palette.common.white,
                    backgroundColor: alpha(theme.palette.common.white, 0.1)
                  }
                }}
              >
                Admin Panel
              </Button>
            )}
            <Chip
              avatar={<Avatar>{user?.name[0]}</Avatar>}
              label={user?.name}
              variant="outlined"
              sx={{ 
                backgroundColor: alpha(theme.palette.common.white, 0.1),
                color: 'white',
                '& .MuiChip-avatar': {
                  backgroundColor: alpha(theme.palette.common.white, 0.8),
                  color: theme.palette.primary.main
                }
              }}
            />
            <Button 
              color="error" 
              onClick={handleLogout}
              variant="contained"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: theme.palette.error.main,
                '&:hover': {
                  backgroundColor: theme.palette.error.dark
                }
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {user?.role === 'student' ? (
            // Student Dashboard
            <>
              <Grid item xs={12}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  My Exams
                </Typography>
              </Grid>
              {exams.map((exam) => (
                <Grid item xs={12} sm={6} md={4} key={exam._id}>
                  <Card 
                    elevation={2}
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[4]
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      {exam.hasSubmitted && exam.submissionStatus === 'canceled' && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          <AlertTitle>Submission Canceled</AlertTitle>
                          Your submission for this exam has been canceled due to unfair practices.
                          {exam.cancellationReason && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              Reason: {exam.cancellationReason}
                            </Typography>
                          )}
                        </Alert>
                      )}
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                        {exam.title}
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          size="small"
                          label={exam.subject}
                          sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1) }}
                        />
                        {exam.status && (
                          <Chip
                            size="small"
                            label={exam.status}
                            sx={{ 
                              ml: 1,
                              backgroundColor: 
                                exam.status === 'PUBLISHED' ? alpha(theme.palette.success.main, 0.1) :
                                exam.status === 'COMPLETED' ? alpha(theme.palette.info.main, 0.1) :
                                alpha(theme.palette.grey[500], 0.1),
                              color:
                                exam.status === 'PUBLISHED' ? theme.palette.success.main :
                                exam.status === 'COMPLETED' ? theme.palette.info.main :
                                theme.palette.grey[700]
                            }}
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Duration: {exam.duration} minutes
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                        <GradeIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Total Marks: {exam.totalMarks}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Starts: {format(new Date(exam.startTime), 'PPp')}
                      </Typography>
                      <Typography variant="subtitle2" color="error">
                        Ends: {format(new Date(exam.endTime), 'PPp')}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      {exam.status === 'PUBLISHED' ? (
                        exam.hasSubmitted ? (
                          <Button 
                            fullWidth
                            variant="contained" 
                            disabled
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 600,
                              backgroundColor: theme.palette.grey[300],
                              color: theme.palette.text.secondary,
                              '&:hover': {
                                backgroundColor: theme.palette.grey[300]
                              }
                            }}
                          >
                            Already Appeared
                          </Button>
                        ) : (
                        <Button 
                          fullWidth
                          variant="contained" 
                          color="primary"
                          onClick={() => navigate(`/take-exam/${exam._id}`)}
                          sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600
                          }}
                        >
                          Take Exam
                        </Button>
                        )
                      ) : exam.status === 'COMPLETED' ? (
                        <Button 
                          fullWidth
                          variant="contained" 
                          color="success"
                          startIcon={<GradeIcon />}
                          onClick={() => handleViewResults(exam._id!)}
                          sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600
                          }}
                        >
                          View Results
                        </Button>
                      ) : (
                        <Button 
                          fullWidth
                          variant="outlined" 
                          disabled
                          sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600
                          }}
                        >
                          {new Date() > new Date(exam.endTime) ? 'Awaiting Results' : 'Coming Soon'}
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
              {exams.length === 0 && (
                <Grid item xs={12}>
                  <Paper 
                    sx={{ 
                      p: 4, 
                      textAlign: 'center',
                      backgroundColor: alpha(theme.palette.primary.main, 0.05)
                    }}
                  >
                    <AssignmentIcon sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 2 }} />
                    <Typography color="text.secondary">
                      No exams available at the moment. Check back later.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </>
          ) : (
            // Teacher Dashboard
            <>
              <Grid item xs={12}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 3
                }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    Manage Exams
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCreateExam}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 3
                    }}
                  >
                    Create New Exam
                  </Button>
                </Box>
              </Grid>
              {exams.map((exam) => (
                <Grid item xs={12} sm={6} md={4} key={exam._id}>
                  <Card 
                    elevation={2}
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[4]
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      {exam.hasSubmitted && exam.submissionStatus === 'canceled' && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          <AlertTitle>Submission Canceled</AlertTitle>
                          Your submission for this exam has been canceled due to unfair practices.
                          {exam.cancellationReason && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              Reason: {exam.cancellationReason}
                            </Typography>
                          )}
                        </Alert>
                      )}
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                        {exam.title}
                      </Typography>
                      <Box sx={{ display: 'flex', mb: 2, gap: 1 }}>
                        <Chip
                          size="small"
                          label={exam.subject}
                          sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1) }}
                        />
                        <Chip
                          size="small"
                          label={exam.status}
                          sx={{ 
                            backgroundColor: exam.status === 'PUBLISHED' 
                              ? alpha(theme.palette.success.main, 0.1)
                              : exam.status === 'SUBMITTED'
                                ? alpha(theme.palette.info.main, 0.1)
                                : exam.status === 'COMPLETED'
                                  ? alpha(theme.palette.grey[500], 0.1)
                                  : exam.status === 'PENDING_APPROVAL'
                                    ? alpha(theme.palette.warning.main, 0.1)
                                    : alpha(theme.palette.warning.main, 0.1),
                            color: exam.status === 'PUBLISHED'
                              ? theme.palette.success.main
                              : exam.status === 'SUBMITTED'
                                ? theme.palette.info.main
                                : exam.status === 'COMPLETED'
                                  ? theme.palette.grey[700]
                                  : exam.status === 'PENDING_APPROVAL'
                                    ? theme.palette.warning.main
                                    : theme.palette.warning.main
                          }}
                        />
                        {exam.status === 'PUBLISHED' && exam.submissionCount !== undefined && exam.submissionCount > 0 && (
                          <Chip
                            size="small"
                            label={`${exam.submissionCount} Submissions`}
                            sx={{ 
                              backgroundColor: alpha(theme.palette.info.main, 0.1),
                              color: theme.palette.info.main
                            }}
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Duration: {exam.duration} minutes
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                        <GradeIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Total Marks: {exam.totalMarks}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0, display: 'flex', justifyContent: exam.status === 'SUBMITTED' ? 'flex-end' : 'space-between', flexDirection: exam.status === 'SUBMITTED' ? 'column' : 'row', gap: 1 }}>
                      <Box>
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewExam(exam)}
                          sx={{ mr: 1 }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditExam(exam._id!)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteExam(exam._id!)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <Box sx={{ width: exam.status === 'PUBLISHED' && exam.submissionCount ? '100%' : 'auto', mt: exam.status === 'PUBLISHED' && exam.submissionCount ? 1 : 0 }}>
                        {exam.status === 'DRAFT' ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handlePublishExam(exam._id!)}
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 600
                            }}
                          >
                            Publish
                          </Button>
                        ) : exam.status === 'PUBLISHED' && exam.submissionCount && exam.submissionCount > 0 ? (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Tooltip title="Review student submissions before requesting publication">
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<PeopleIcon />}
                                onClick={() => handleViewSubmissions(exam._id!)}
                                sx={{ 
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  fontSize: '0.75rem'
                                }}
                              >
                                {exam.pendingReviewCount ? `Review (${exam.pendingReviewCount} pending)` : 'Review'}
                              </Button>
                            </Tooltip>
                            <Tooltip title={exam.pendingReviewCount ? "Review all submissions before requesting publication" : "Request publication to students"}>
                              <span>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  startIcon={<GradeIcon />}
                                  onClick={() => handleRequestPublishResults(exam._id!)}
                                  disabled={exam.pendingReviewCount ? true : false}
                                  sx={{ 
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {exam.pendingReviewCount ? 'Review All First' : 'Request Publication'}
                                </Button>
                              </span>
                            </Tooltip>
                          </Box>
                        ) : exam.status === 'PENDING_APPROVAL' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<HourglassEmptyIcon />}
                            disabled
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 600
                            }}
                          >
                            Pending Admin Approval
                          </Button>
                        ) : exam.status === 'SUBMITTED' && exam.reviewNotes ? (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<WarningIcon />}
                              onClick={() => showRejectionNotes(exam)}
                              sx={{ 
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600
                              }}
                            >
                              Publication Rejected
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<GradeIcon />}
                              onClick={() => handleRequestPublishResults(exam._id!)}
                              sx={{ 
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.75rem'
                              }}
                            >
                              Request Again
                            </Button>
                          </Box>
                        ) : exam.status === 'PUBLISHED' ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<PeopleIcon />}
                            onClick={() => handleViewSubmissions(exam._id!)}
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 600
                            }}
                          >
                            View Submissions
                          </Button>
                        ) : exam.status === 'COMPLETED' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleViewSubmissions(exam._id!)}
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 600
                            }}
                          >
                            Results Published
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<PeopleIcon />}
                            onClick={() => handleViewSubmissions(exam._id!)}
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 600
                            }}
                          >
                            View Submissions
                          </Button>
                        )}
                      </Box>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
              {exams.length === 0 && (
                <Grid item xs={12}>
                  <Paper 
                    sx={{ 
                      p: 4, 
                      textAlign: 'center',
                      backgroundColor: alpha(theme.palette.primary.main, 0.05)
                    }}
                  >
                    <AssignmentIcon sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 2 }} />
                    <Typography color="text.secondary">
                      No exams created yet. Click "Create New Exam" to get started.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </>
          )}
        </Grid>
      </Container>

      {/* View Questions Dialog with enhanced styling */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: 3,
          py: 2
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {selectedExam?.title} - Questions
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2 }}>
          {selectedExam?.questions && selectedExam.questions.length > 0 ? (
            <List>
              {selectedExam.questions.map((question: Question, index: number) => (
                <React.Fragment key={question._id}>
                  <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
                    <Box sx={{ width: '100%', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        Question {index + 1}: {question.questionText}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${question.marks} marks`}
                        sx={{ 
                          mt: 1,
                          backgroundColor: alpha(theme.palette.success.main, 0.1),
                          color: theme.palette.success.main
                        }}
                      />
                    </Box>
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Options:
                      </Typography>
                      <List dense sx={{ pl: 2 }}>
                        {question.options?.map((option, optIndex: number) => (
                          <ListItem key={optIndex} sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: option.isCorrect 
                                      ? theme.palette.success.main 
                                      : theme.palette.text.primary,
                                    fontWeight: option.isCorrect ? 600 : 400
                                  }}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option.text}
                                  {option.isCorrect && 
                                    <Chip 
                                      size="small" 
                                      label="Correct Answer"
                                      sx={{ 
                                        ml: 1,
                                        height: 20,
                                        backgroundColor: alpha(theme.palette.success.main, 0.1),
                                        color: theme.palette.success.main
                                      }}
                                    />
                                  }
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                    {/* Show correct answer for non-MCQ questions */}
                    {(question.questionType === 'TRUE_FALSE' || question.questionType === 'PARAGRAPH') && question.correctAnswer && (
                      <Box sx={{ width: '100%', mt: 2, p: 2, backgroundColor: alpha(theme.palette.success.light, 0.1), borderRadius: 1 }}>
                        <Typography variant="body2" color={theme.palette.success.main} fontWeight={600}>
                          Correct Answer: {question.correctAnswer}
                        </Typography>
                      </Box>
                    )}
                  </ListItem>
                  {index < (selectedExam.questions?.length || 0) - 1 && (
                    <Divider sx={{ my: 1 }} />
                  )}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AssignmentIcon sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 2 }} />
              <Typography color="text.secondary">
                No questions available for this exam.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button 
            onClick={() => setViewDialogOpen(false)}
            sx={{ 
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setViewDialogOpen(false);
              handleEditExam(selectedExam?._id!);
            }}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2
            }}
          >
            Edit Exam
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard; 