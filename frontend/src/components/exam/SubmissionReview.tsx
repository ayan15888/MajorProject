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
  alpha,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  Warning as WarningIcon
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
  const [publishingResults, setPublishingResults] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

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

  const handlePublishResults = async () => {
    if (!examId) return;
    
    try {
      setPublishingResults(true);
      setError(null);
      
      // Call the API to publish results
      const updatedExam = await examService.publishResults(examId);
      
      // Update the local exam state
      setExam(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
      
      setSuccess('Results published successfully! Students can now view their marks.');
      setConfirmPublishOpen(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Failed to publish results:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to publish results. Please try again.';
      setError(`Error: ${errorMessage}`);
      
      // Clear error message after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setPublishingResults(false);
    }
  };

  const openPublishConfirmation = () => {
    setConfirmPublishOpen(true);
  };
  
  const hasUnreviewedSubmissions = () => {
    return submissions.some(submission => submission.status === 'pending-review');
  };

  const getQuestionById = (questionId: string): Question | undefined => {
    return exam?.questions?.find(q => q._id === questionId);
  };

  // Calculate automatically if the answer is correct based on question type
  const isAnswerCorrect = (question: Question, selectedOption: string): boolean => {
    if (question.questionType === 'MCQ') {
      // For MCQ, check if the selected option matches the option marked as correct
      const correctOption = question.options?.find(opt => opt.isCorrect)?.text;
      return correctOption === selectedOption;
    } else {
      // For TRUE_FALSE and PARAGRAPH, compare with correctAnswer
      return question.correctAnswer === selectedOption;
    }
  };

  // Calculate suggested marks based on correctness
  const calculateSuggestedMarks = (question: Question, selectedOption: string): number => {
    return isAnswerCorrect(question, selectedOption) ? question.marks : 0;
  };

  // Auto-calculate marks for all answers
  const autoCalculateAllMarks = () => {
    if (!selectedSubmission || !exam?.questions) return;
    
    const updatedAnswers = reviewedAnswers.map(answer => {
      const question = getQuestionById(answer.questionId);
      if (!question) return answer;
      
      return {
        ...answer,
        marksObtained: calculateSuggestedMarks(question, answer.selectedOption)
      };
    });
    
    setReviewedAnswers(updatedAnswers);
    
    // Recalculate total marks
    const newTotal = updatedAnswers.reduce((total, answer) => total + (answer.marksObtained || 0), 0);
    setTotalMarksCalculated(newTotal);
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
        
        {exam && exam.status !== 'COMPLETED' && submissions.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="success"
              onClick={openPublishConfirmation}
              disabled={publishingResults}
              startIcon={publishingResults ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Publish Results to Students
            </Button>
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

      {/* Publish Confirmation Dialog */}
      <Dialog
        open={confirmPublishOpen}
        onClose={() => setConfirmPublishOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          Confirm Publish Results
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Are you sure you want to publish the results for {exam?.title}?
          </Typography>
          <Typography variant="body1" paragraph>
            Students will be able to see their marks and correct answers once you publish the results.
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
              Submission Summary:
            </Typography>
            <Box sx={{ 
              p: 2, 
              borderRadius: 1, 
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              display: 'flex',
              justifyContent: 'space-around'
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: theme.palette.primary.main }}>
                  {submissions.length}
                </Typography>
                <Typography variant="body2">Total Submissions</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: theme.palette.success.main }}>
                  {submissions.filter(s => s.status === 'completed').length}
                </Typography>
                <Typography variant="body2">Reviewed</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: theme.palette.warning.main }}>
                  {submissions.filter(s => s.status === 'pending-review').length}
                </Typography>
                <Typography variant="body2">Pending Review</Typography>
              </Box>
            </Box>
          </Box>
          
          {hasUnreviewedSubmissions() && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <AlertTitle>Warning: Unreviewed Submissions</AlertTitle>
              <Typography variant="body2">
                Some submissions have not been reviewed yet. It's recommended to review all submissions
                before publishing results.
              </Typography>
            </Alert>
          )}
          
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Student Results Preview:
          </Typography>
          <Box sx={{ maxHeight: '250px', overflowY: 'auto', mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell align="right">Percentage</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission._id}>
                    <TableCell>{submission.studentId.name}</TableCell>
                    <TableCell align="right">{submission.totalMarksObtained} / {exam?.totalMarks}</TableCell>
                    <TableCell align="right">
                      {Math.round((submission.totalMarksObtained / (exam?.totalMarks || 1)) * 100)}%
                    </TableCell>
                    <TableCell align="center">
                      {submission.status === 'completed' ? (
                        <Chip 
                          size="small" 
                          color="success" 
                          label="Reviewed" 
                          icon={<CheckCircleIcon />} 
                        />
                      ) : (
                        <Chip 
                          size="small" 
                          color="warning" 
                          label="Pending Review" 
                          icon={<WarningIcon />} 
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button onClick={() => setConfirmPublishOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            variant="contained"
            color="success"
            onClick={handlePublishResults}
            disabled={publishingResults}
            startIcon={publishingResults ? <CircularProgress size={20} /> : null}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {publishingResults ? 'Publishing...' : 'Confirm & Publish Results'}
          </Button>
        </DialogActions>
      </Dialog>

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
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Total Marks: {totalMarksCalculated} / {exam?.totalMarks}
            </Typography>
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={autoCalculateAllMarks}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Auto-Calculate Marks
            </Button>
          </Box>
          
          {exam?.questions?.map((question, index) => {
            const answer = reviewedAnswers.find(a => a.questionId === question._id);
            if (!answer) return null;
            
            const isCorrect = isAnswerCorrect(question, answer.selectedOption);
            const suggestedMarks = calculateSuggestedMarks(question, answer.selectedOption);
            
            return (
              <Accordion key={question._id} sx={{ mb: 2 }}>
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: isCorrect 
                      ? alpha(theme.palette.success.main, 0.05)
                      : alpha(theme.palette.error.main, 0.05)
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Typography sx={{ flexShrink: 0 }}>
                      Q{index + 1}: {question.questionText.substring(0, 40)}{question.questionText.length > 40 ? '...' : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {isCorrect ? (
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                      ) : (
                        <CancelIcon color="error" sx={{ mr: 1 }} />
                      )}
                      <Typography sx={{ 
                        color: answer.marksObtained === suggestedMarks 
                          ? theme.palette.text.secondary 
                          : theme.palette.warning.main,
                        fontWeight: 500
                      }}>
                        {answer.marksObtained} / {question.marks} marks
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 3, backgroundColor: alpha(theme.palette.background.default, 0.5) }}>
                  <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
                    {question.questionText}
                  </Typography>
                  
                  {/* Student Answer Highlight */}
                  <Box sx={{ 
                    mb: 3, 
                    p: 2, 
                    borderRadius: 1,
                    border: `1px solid ${isCorrect ? theme.palette.success.main : theme.palette.error.main}`,
                    backgroundColor: alpha(isCorrect ? theme.palette.success.main : theme.palette.error.main, 0.05)
                  }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: isCorrect ? theme.palette.success.main : theme.palette.error.main }}>
                      Student's Answer {isCorrect ? '(Correct)' : '(Incorrect)'}:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {answer.selectedOption}
                    </Typography>
                  </Box>
                  
                  {question.questionType === 'MCQ' && question.options && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                        Options:
                      </Typography>
                      <List dense sx={{ pl: 2 }}>
                        {question.options.map((option, optIndex) => (
                          <ListItem key={optIndex} sx={{ 
                            py: 0.5,
                            backgroundColor: option.isCorrect 
                              ? alpha(theme.palette.success.main, 0.1)
                              : option.text === answer.selectedOption && !option.isCorrect
                                ? alpha(theme.palette.error.main, 0.1)
                                : 'transparent',
                            borderRadius: 1
                          }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: option.isCorrect || option.text === answer.selectedOption ? 500 : 400
                                    }}
                                  >
                                    {String.fromCharCode(65 + optIndex)}. {option.text}
                                  </Typography>
                                  {option.isCorrect && (
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
                                  )}
                                  {option.text === answer.selectedOption && !option.isCorrect && (
                                    <Chip 
                                      size="small" 
                                      label="Student's Answer"
                                      sx={{ 
                                        ml: 1,
                                        height: 20,
                                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                                        color: theme.palette.error.main
                                      }}
                                    />
                                  )}
                                  {option.text === answer.selectedOption && option.isCorrect && (
                                    <Chip 
                                      size="small" 
                                      label="Student's Answer (Correct)"
                                      sx={{ 
                                        ml: 1,
                                        height: 20,
                                        backgroundColor: alpha(theme.palette.success.main, 0.1),
                                        color: theme.palette.success.main
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  
                  {question.questionType !== 'MCQ' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                        Correct Answer:
                      </Typography>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          backgroundColor: alpha(theme.palette.success.main, 0.1),
                          borderRadius: 1
                        }}
                      >
                        <Typography variant="body2">{question.correctAnswer}</Typography>
                      </Paper>
                      
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500, mt: 2 }}>
                        Student's Answer:
                      </Typography>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          backgroundColor: isCorrect 
                            ? alpha(theme.palette.success.main, 0.1)
                            : alpha(theme.palette.error.main, 0.1),
                          borderRadius: 1
                        }}
                      >
                        <Typography variant="body2">{answer.selectedOption}</Typography>
                      </Paper>
                    </Box>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mr: 2, fontWeight: 500 }}>
                      Marks Assignment:
                    </Typography>
                    <TextField
                      type="number"
                      label="Awarded Marks"
                      variant="outlined"
                      size="small"
                      value={answer.marksObtained || 0}
                      onChange={(e) => handleMarksChange(question._id!, parseInt(e.target.value) || 0)}
                      InputProps={{ inputProps: { min: 0, max: question.marks } }}
                      sx={{ width: 150 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      out of {question.marks} {suggestedMarks !== answer.marksObtained && 
                        `(Suggested: ${suggestedMarks})`}
                    </Typography>
                    {suggestedMarks !== answer.marksObtained && (
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => handleMarksChange(question._id!, suggestedMarks)}
                        sx={{ ml: 2, textTransform: 'none' }}
                      >
                        Use Suggested
                      </Button>
                    )}
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
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
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
              const isCorrect = question && isAnswerCorrect(question, answer.selectedOption);
              
              return (
                <React.Fragment key={answer.questionId}>
                  <ListItem alignItems="flex-start" sx={{
                    backgroundColor: isCorrect 
                      ? alpha(theme.palette.success.main, 0.05)
                      : alpha(theme.palette.error.main, 0.05),
                    borderRadius: 1,
                    mb: 1
                  }}>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          Question {index + 1}: {question?.questionText}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          {question?.questionType === 'MCQ' && question.options ? (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Options:
                              </Typography>
                              <Box sx={{ pl: 2 }}>
                                {question.options.map((option, optIndex) => (
                                  <Typography 
                                    key={optIndex} 
                                    variant="body2" 
                                    sx={{ 
                                      mb: 0.5,
                                      color: option.isCorrect 
                                        ? theme.palette.success.main
                                        : option.text === answer.selectedOption && !option.isCorrect
                                          ? theme.palette.error.main
                                          : theme.palette.text.secondary,
                                      fontWeight: (option.isCorrect || option.text === answer.selectedOption) ? 600 : 400
                                    }}
                                  >
                                    {String.fromCharCode(65 + optIndex)}. {option.text}
                                    {option.isCorrect && ' ✓ (Correct Answer)'}
                                    {option.text === answer.selectedOption && !option.isCorrect && ' ✗ (Student\'s Answer)'}
                                    {option.text === answer.selectedOption && option.isCorrect && ' ✓ (Student\'s Answer - Correct)'}
                                  </Typography>
                                ))}
                              </Box>
                            </Box>
                          ) : (
                            <>
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
                            </>
                          )}
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