import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Button,
  Divider,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  useTheme,
  alpha
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { examService, Exam, Question, ExamSubmission } from '../../api/services/exam.service';

const SubmissionReview = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewedAnswers, setReviewedAnswers] = useState<Array<{
    questionId: string;
    selectedOption: string;
    marksObtained: number;
  }>>([]);
  const [totalMarksCalculated, setTotalMarksCalculated] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!examId) return;
        
        setLoading(true);
        setError(null);
        
        // Fetch exam details
        console.log(`Fetching exam details for ID: ${examId}`);
        const examData = await examService.getExamById(examId);
        setExam(examData);
        
        // Fetch submissions for this exam
        console.log(`Fetching submissions for exam ID: ${examId}`);
        const submissionsData = await examService.getExamSubmissions(examId);
        console.log(`Received ${submissionsData.length} submissions:`, submissionsData);
        setSubmissions(submissionsData);

      } catch (error: any) {
        console.error('Failed to fetch data:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load data. Please try again.';
        setError(`Error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId]);

  const handleViewSubmission = (submission: ExamSubmission) => {
    setSelectedSubmission(submission);
    setReviewMode(false);
  };

  const handleReviewSubmission = (submission: ExamSubmission) => {
    setSelectedSubmission(submission);
    setReviewedAnswers([...submission.answers]);
    setTotalMarksCalculated(submission.totalMarksObtained);
    setReviewMode(true);
  };

  const handleMarksChange = (questionId: string, marks: number) => {
    const updatedAnswers = reviewedAnswers.map(answer => 
      answer.questionId === questionId 
        ? { ...answer, marksObtained: marks } 
        : answer
    );
    
    setReviewedAnswers(updatedAnswers);
    
    // Recalculate total marks
    const newTotal = updatedAnswers.reduce((total, answer) => total + (answer.marksObtained || 0), 0);
    setTotalMarksCalculated(newTotal);
  };

  const handleSaveReview = async () => {
    try {
      if (!selectedSubmission) return;
      
      setLoading(true);
      
      const updatedData = {
        answers: reviewedAnswers,
        totalMarksObtained: totalMarksCalculated
      };
      
      await examService.updateSubmissionReview(selectedSubmission._id, updatedData);
      
      // Update the submission in the list
      const updatedSubmissions = submissions.map(sub => 
        sub._id === selectedSubmission._id 
          ? { 
              ...sub, 
              answers: reviewedAnswers, 
              totalMarksObtained: totalMarksCalculated,
              status: 'completed' 
            } 
          : sub
      );
      
      setSubmissions(updatedSubmissions);
      setSelectedSubmission(null);
      setReviewMode(false);
      setSuccess('Submission review has been saved successfully.');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to save review:', error);
      setError('Failed to save review. Please try again.');
      
      // Clear error message after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionById = (questionId: string): Question | undefined => {
    return exam?.questions?.find(q => q._id === questionId);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ my: 4 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" gutterBottom>
            {exam?.title} - Submissions
          </Typography>
        </Box>
        
        {exam && (
          <Box sx={{ display: 'flex', mb: 3 }}>
            <Chip 
              label={`Subject: ${exam.subject}`} 
              sx={{ mr: 1, backgroundColor: alpha(theme.palette.primary.main, 0.1) }} 
            />
            <Chip 
              label={`Total Marks: ${exam.totalMarks}`} 
              sx={{ mr: 1, backgroundColor: alpha(theme.palette.success.main, 0.1) }} 
            />
            <Chip 
              label={`Status: ${exam.status}`} 
              color={
                exam.status === 'PUBLISHED' ? 'success' : 
                exam.status === 'SUBMITTED' ? 'info' : 
                exam.status === 'COMPLETED' ? 'default' : 'warning'
              }
              sx={{ mr: 1 }} 
            />
            {exam.status === 'SUBMITTED' && (
              <Chip 
                label={`Ends: ${format(new Date(exam.endTime), 'PPp')}`} 
                variant="outlined" 
                sx={{ mr: 1 }} 
              />
            )}
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Success</AlertTitle>
          {success}
        </Alert>
      )}

      {selectedSubmission && reviewMode ? (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2">
              Review Submission - {selectedSubmission.studentId.name}
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => setSelectedSubmission(null)}
            >
              Back to List
            </Button>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Total Marks: {totalMarksCalculated} / {exam?.totalMarks}
          </Typography>
          
          {exam?.questions?.map((question, index) => {
            const answer = reviewedAnswers.find(a => a.questionId === question._id);
            const isCorrect = question.correctAnswer === answer?.selectedOption;
            
            return (
              <Accordion key={question._id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ width: '60%', flexShrink: 0 }}>
                    Question {index + 1}: {question.questionText.substring(0, 50)}...
                  </Typography>
                  <Typography sx={{ color: theme.palette.text.secondary }}>
                    {answer?.marksObtained || 0} / {question.marks} marks
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body1" paragraph>
                    {question.questionText}
                  </Typography>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Correct Answer: {question.correctAnswer}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mr: 2 }}>
                      Student's Answer: {answer?.selectedOption}
                    </Typography>
                    {isCorrect ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <CancelIcon color="error" />
                    )}
                  </Box>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Marks:
                    </Typography>
                    <TextField
                      type="number"
                      label="Marks"
                      variant="outlined"
                      size="small"
                      value={answer?.marksObtained || 0}
                      onChange={(e) => handleMarksChange(question._id!, parseInt(e.target.value))}
                      InputProps={{ inputProps: { min: 0, max: question.marks } }}
                      sx={{ width: 100 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      out of {question.marks}
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSaveReview}
              sx={{ borderRadius: 2 }}
            >
              Save Review
            </Button>
          </Box>
        </Paper>
      ) : selectedSubmission ? (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} />
              <Typography variant="h5" component="h2">
                {selectedSubmission.studentId.name}'s Submission
              </Typography>
            </Box>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => setSelectedSubmission(null)}
            >
              Back to List
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', mb: 3 }}>
            <Chip 
              label={`Status: ${selectedSubmission.status}`} 
              color={selectedSubmission.status === 'completed' ? 'success' : 'warning'}
              sx={{ mr: 1 }} 
            />
            <Chip 
              label={`Submitted: ${format(new Date(selectedSubmission.submittedAt), 'PPp')}`} 
              variant="outlined" 
              sx={{ mr: 1 }} 
            />
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Total Marks: {selectedSubmission.totalMarksObtained} / {exam?.totalMarks}
          </Typography>
          
          <List>
            {selectedSubmission.answers.map((answer, index) => {
              const question = getQuestionById(answer.questionId);
              const isCorrect = question?.correctAnswer === answer.selectedOption;
              
              return (
                <React.Fragment key={answer.questionId}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1">
                          Question {index + 1}: {question?.questionText}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Correct Answer: {question?.correctAnswer}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                              Student's Answer: {answer.selectedOption}
                            </Typography>
                            {isCorrect ? (
                              <CheckCircleIcon color="success" fontSize="small" />
                            ) : (
                              <CancelIcon color="error" fontSize="small" />
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Marks: <strong>{answer.marksObtained}</strong> / {question?.marks}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              );
            })}
          </List>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => handleReviewSubmission(selectedSubmission)}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600 
              }}
            >
              Review Submission
            </Button>
          </Box>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {submissions.length > 0 ? (
            submissions.map((submission) => (
              <Grid item xs={12} sm={6} md={4} key={submission._id}>
                <Card 
                  elevation={2} 
                  sx={{ 
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[4]
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PersonIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        {submission.studentId.name}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {submission.studentId.email}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', mb: 2, mt: 2 }}>
                      <Chip 
                        label={`Marks: ${submission.totalMarksObtained}/${exam?.totalMarks}`} 
                        sx={{ 
                          mr: 1, 
                          backgroundColor: alpha(theme.palette.primary.main, 0.1) 
                        }} 
                      />
                      <Chip 
                        label={submission.status === 'completed' ? 'Complete' : 'Needs Review'} 
                        color={submission.status === 'completed' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      Submitted: {format(new Date(submission.submittedAt), 'PPp')}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => handleViewSubmission(submission)}
                        sx={{ textTransform: 'none' }}
                      >
                        View Details
                      </Button>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        size="small" 
                        onClick={() => handleReviewSubmission(submission)}
                        sx={{ 
                          textTransform: 'none',
                          borderRadius: 2
                        }}
                      >
                        Review
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No submissions found for this exam.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
    </Container>
  );
};

export default SubmissionReview; 