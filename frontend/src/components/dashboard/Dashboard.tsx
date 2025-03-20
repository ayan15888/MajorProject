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
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../api/services/auth.service';
import { examService, Exam, Question } from '../../api/services/exam.service';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { format } from 'date-fns';

interface User {
  name: string;
  email: string;
  role: 'student' | 'teacher';
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await authService.getCurrentUser();
        console.log('User data:', userData);
        setUser(userData);
        
        if (userData.role === 'teacher') {
          const teacherExams = await examService.getTeacherExams();
          console.log('Teacher exams:', teacherExams);
          setExams(teacherExams);
        } else if (userData.role === 'student') {
          console.log('Fetching student exams...');
          const studentExams = await examService.getStudentExams();
          console.log('Student exams:', studentExams);
          setExams(studentExams);
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
    setSelectedExam(exam);
    setViewDialogOpen(true);
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Online Examination System
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Welcome, {user?.name}!
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                {user?.email} - {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
              </Typography>
            </Box>
          </Box>

          {user?.role === 'student' ? (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" gutterBottom>
                Your Upcoming Exams
              </Typography>
              <Grid container spacing={3}>
                {exams.map((exam) => (
                  <Grid item xs={12} sm={6} md={4} key={exam._id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {exam.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Subject: {exam.subject}
                        </Typography>
                        <Typography variant="body2">
                          Duration: {exam.duration} minutes
                        </Typography>
                        <Typography variant="body2">
                          Total Marks: {exam.totalMarks}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          Start Time: {new Date(exam.startTime).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="error">
                          End Time: {new Date(exam.endTime).toLocaleString()}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="primary"
                          onClick={() => navigate(`/take-exam/${exam._id}`)}
                        >
                          Take Exam
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
                {exams.length === 0 && (
                  <Grid item xs={12}>
                    <Typography color="text.secondary">
                      No exams available at the moment. Check back later.
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          ) : (
            // Teacher view
            <Box sx={{ mt: 4 }}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" gutterBottom>
                  Manage Exams
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCreateExam}
                >
                  Create New Exam
                </Button>
              </Box>
              <Grid container spacing={3}>
                {exams.map((exam) => (
                  <Grid item xs={12} sm={6} md={4} key={exam._id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {exam.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Subject: {exam.subject}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Status: {exam.status}
                        </Typography>
                        <Typography variant="body2">
                          Duration: {exam.duration} minutes
                        </Typography>
                        <Typography variant="body2">
                          Total Marks: {exam.totalMarks}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <IconButton size="small" onClick={() => handleViewExam(exam)}>
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleEditExam(exam._id!)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteExam(exam._id!)}>
                          <DeleteIcon />
                        </IconButton>
                        {exam.status === 'DRAFT' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handlePublishExam(exam._id!)}
                          >
                            Publish
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
                {exams.length === 0 && (
                  <Grid item xs={12}>
                    <Typography color="text.secondary">
                      No exams created yet. Click "Create New Exam" to get started.
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </Paper>
      </Container>

      {/* Add View Questions Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedExam?.title} - Questions
        </DialogTitle>
        <DialogContent>
          {selectedExam?.questions && selectedExam.questions.length > 0 ? (
            <List>
              {selectedExam.questions.map((question: Question, index: number) => (
                <React.Fragment key={question._id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1">
                          Question {index + 1}: {question.questionText}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Options:
                          </Typography>
                          <List dense>
                            {question.options?.map((option, optIndex: number) => (
                              <ListItem key={optIndex}>
                                <ListItemText
                                  primary={
                                    <Typography
                                      variant="body2"
                                      color={option.text === question.correctAnswer ? "success.main" : "text.primary"}
                                    >
                                      {String.fromCharCode(65 + optIndex)}. {option.text}
                                      {option.text === question.correctAnswer && " (Correct Answer)"}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                          <Typography variant="body2" color="text.secondary">
                            Marks: {question.marks}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < (selectedExam.questions?.length || 0) - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">
              No questions available for this exam.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button
            color="primary"
            onClick={() => {
              setViewDialogOpen(false);
              handleEditExam(selectedExam?._id!);
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