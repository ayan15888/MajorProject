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
  CardActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../api/services/auth.service';
import { examService, Exam } from '../../api/services/exam.service';

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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        if (userData.role === 'teacher') {
          const teacherExams = await examService.getTeacherExams();
          setExams(teacherExams);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
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

  const handleDeleteExam = async (examId: string) => {
    try {
      await examService.deleteExam(examId);
      setExams(exams.filter(exam => exam._id !== examId));
    } catch (error) {
      console.error('Failed to delete exam:', error);
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
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.name}!
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {user?.email} - {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
          </Typography>

          {user?.role === 'student' ? (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" gutterBottom>
                Your Upcoming Exams
              </Typography>
              <Typography color="text.secondary">
                No upcoming exams scheduled.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 4 }}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">
                  Teacher Dashboard
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
                  <Grid item xs={12} md={6} lg={4} key={exam._id}>
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
                        <Button size="small" onClick={() => handleEditExam(exam._id!)}>
                          Edit
                        </Button>
                        <Button size="small" color="error" onClick={() => handleDeleteExam(exam._id!)}>
                          Delete
                        </Button>
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
    </Box>
  );
};

export default Dashboard; 