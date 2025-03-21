import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Button,
  useTheme,
  alpha
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  School as SchoolIcon,
  AccessTime as AccessTimeIcon,
  Grade as GradeIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { examService, Exam, Question } from '../../api/services/exam.service';

interface ExamResultProps {}

interface ResultQuestion extends Question {
  studentAnswer?: string;
  marksObtained?: number;
}

interface ExamResult {
  _id: string;
  examId: {
    _id: string;
    title: string;
    subject: string;
    duration: number;
    totalMarks: number;
    status: string;
    startTime: string;
    endTime: string;
  };
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  answers: Array<{
    questionId: string;
    selectedOption: string;
    marksObtained: number;
  }>;
  totalMarksObtained: number;
  submittedAt: string;
  status: string;
  questions: ResultQuestion[];
}

const ExamResults: React.FC<ExamResultProps> = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [questionsWithAnswers, setQuestionsWithAnswers] = useState<ResultQuestion[]>([]);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        if (!examId) return;
        
        setLoading(true);
        setError(null);
        
        // Fetch the student's result for this exam
        const resultData = await examService.getStudentExamResult(examId);
        setResult(resultData);
        
        // Process questions with student answers
        if (resultData && resultData.questions && resultData.answers) {
          const processedQuestions = resultData.questions.map(question => {
            const studentAnswer = resultData.answers.find(
              answer => answer.questionId === question._id
            );
            return {
              ...question,
              studentAnswer: studentAnswer?.selectedOption || '',
              marksObtained: studentAnswer?.marksObtained || 0
            };
          });
          setQuestionsWithAnswers(processedQuestions);
        }
      } catch (error: any) {
        console.error('Failed to fetch result:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load your result. Please try again.';
        setError(`Error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [examId]);

  const calculatePercentage = (): number => {
    if (!result) return 0;
    const percentage = (result.totalMarksObtained / result.examId.totalMarks) * 100;
    return Math.round(percentage);
  };

  const getGrade = (): string => {
    const percentage = calculatePercentage();
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const isAnswerCorrect = (question: ResultQuestion): boolean => {
    if (question.questionType === 'MCQ') {
      const correctOption = question.options?.find(opt => opt.isCorrect)?.text;
      return correctOption === question.studentAnswer;
    } else {
      return question.correctAnswer === question.studentAnswer;
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
      <Container maxWidth="md" sx={{ my: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" variant="h6" gutterBottom>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/dashboard')}
            sx={{ mt: 2 }}
          >
            Back to Dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!result) {
    return (
      <Container maxWidth="md" sx={{ my: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Result not found or not yet available
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/dashboard')}
            sx={{ mt: 2 }}
          >
            Back to Dashboard
          </Button>
        </Paper>
      </Container>
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
            Exam Results
          </Typography>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
              {result.examId.title}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 3, gap: 1 }}>
              <Chip 
                label={`Subject: ${result.examId.subject}`} 
                sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1) }} 
              />
              <Chip 
                icon={<AccessTimeIcon />} 
                label={`Duration: ${result.examId.duration} minutes`} 
                variant="outlined"
              />
              <Chip 
                icon={<GradeIcon />} 
                label={`Total Marks: ${result.examId.totalMarks}`} 
                variant="outlined"
              />
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Your Answers and Scores
            </Typography>
            
            <List>
              {questionsWithAnswers.map((question, index) => {
                const isCorrect = isAnswerCorrect(question);
                
                return (
                  <Paper 
                    key={question._id} 
                    elevation={0} 
                    sx={{ 
                      mb: 2, 
                      p: 2, 
                      backgroundColor: isCorrect 
                        ? alpha(theme.palette.success.light, 0.1) 
                        : alpha(theme.palette.error.light, 0.1),
                      borderRadius: 2
                    }}
                  >
                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            <Typography 
                              variant="subtitle1" 
                              sx={{ fontWeight: 500, flex: 1 }}
                            >
                              {index + 1}. {question.questionText}
                            </Typography>
                            <Chip 
                              label={`${question.marksObtained} / ${question.marks} marks`}
                              color={question.marksObtained > 0 ? "success" : "error"}
                              size="small"
                              sx={{ ml: 2 }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 2 }}>
                            {question.questionType === 'MCQ' && question.options ? (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Options:
                                </Typography>
                                {question.options.map((option, optIndex) => (
                                  <Box 
                                    key={optIndex}
                                    sx={{ 
                                      display: 'flex',
                                      alignItems: 'center',
                                      mb: 0.5,
                                      p: 1,
                                      borderRadius: 1,
                                      backgroundColor: 
                                        option.isCorrect 
                                          ? alpha(theme.palette.success.main, 0.1)
                                          : option.text === question.studentAnswer && !option.isCorrect
                                            ? alpha(theme.palette.error.main, 0.1)
                                            : 'transparent'
                                    }}
                                  >
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        fontWeight: 
                                          option.isCorrect || option.text === question.studentAnswer
                                            ? 600 
                                            : 400,
                                        color: 
                                          option.isCorrect 
                                            ? theme.palette.success.main
                                            : option.text === question.studentAnswer && !option.isCorrect
                                              ? theme.palette.error.main
                                              : theme.palette.text.secondary
                                      }}
                                    >
                                      {String.fromCharCode(65 + optIndex)}. {option.text}
                                    </Typography>
                                    {option.isCorrect && (
                                      <CheckCircleIcon 
                                        color="success" 
                                        fontSize="small"
                                        sx={{ ml: 1 }}
                                      />
                                    )}
                                    {option.text === question.studentAnswer && !option.isCorrect && (
                                      <CancelIcon 
                                        color="error" 
                                        fontSize="small"
                                        sx={{ ml: 1 }}
                                      />
                                    )}
                                  </Box>
                                ))}
                              </Box>
                            ) : question.questionType === 'TRUE_FALSE' ? (
                              <Box>
                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                                  True/False Question
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      p: 1.5,
                                      borderRadius: 1,
                                      backgroundColor: 
                                        question.correctAnswer === 'true'
                                          ? alpha(theme.palette.success.main, 0.1)
                                          : 'transparent',
                                      border: `1px solid ${
                                        question.correctAnswer === 'true'
                                          ? theme.palette.success.main
                                          : alpha(theme.palette.divider, 0.5)
                                      }`,
                                    }}
                                  >
                                    <ToggleOnIcon 
                                      color={question.correctAnswer === 'true' ? 'success' : 'disabled'} 
                                      sx={{ mr: 1 }}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: question.correctAnswer === 'true' ? 600 : 400,
                                        color: question.correctAnswer === 'true' 
                                          ? theme.palette.success.main 
                                          : theme.palette.text.secondary
                                      }}
                                    >
                                      True {question.correctAnswer === 'true' && '(Correct Answer)'}
                                    </Typography>
                                  </Box>
                                  
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      p: 1.5,
                                      borderRadius: 1,
                                      backgroundColor: 
                                        question.correctAnswer === 'false'
                                          ? alpha(theme.palette.success.main, 0.1)
                                          : 'transparent',
                                      border: `1px solid ${
                                        question.correctAnswer === 'false'
                                          ? theme.palette.success.main
                                          : alpha(theme.palette.divider, 0.5)
                                      }`,
                                    }}
                                  >
                                    <ToggleOffIcon 
                                      color={question.correctAnswer === 'false' ? 'success' : 'disabled'} 
                                      sx={{ mr: 1 }}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: question.correctAnswer === 'false' ? 600 : 400,
                                        color: question.correctAnswer === 'false' 
                                          ? theme.palette.success.main 
                                          : theme.palette.text.secondary
                                      }}
                                    >
                                      False {question.correctAnswer === 'false' && '(Correct Answer)'}
                                    </Typography>
                                  </Box>
                                </Box>
                                
                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500, mt: 2 }}>
                                  Your Answer:
                                </Typography>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    p: 1.5,
                                    borderRadius: 1,
                                    backgroundColor: isCorrect
                                      ? alpha(theme.palette.success.main, 0.1)
                                      : alpha(theme.palette.error.main, 0.1),
                                    border: `1px solid ${
                                      isCorrect
                                        ? theme.palette.success.main
                                        : theme.palette.error.main
                                    }`,
                                  }}
                                >
                                  {question.studentAnswer === 'true' ? (
                                    <ToggleOnIcon 
                                      color={isCorrect ? 'success' : 'error'} 
                                      sx={{ mr: 1 }}
                                    />
                                  ) : (
                                    <ToggleOffIcon 
                                      color={isCorrect ? 'success' : 'error'} 
                                      sx={{ mr: 1 }}
                                    />
                                  )}
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 500,
                                      color: isCorrect
                                        ? theme.palette.success.main
                                        : theme.palette.error.main
                                    }}
                                  >
                                    {question.studentAnswer === 'true' ? 'True' : 'False'}
                                  </Typography>
                                  {isCorrect ? (
                                    <CheckCircleIcon 
                                      color="success" 
                                      fontSize="small"
                                      sx={{ ml: 1 }}
                                    />
                                  ) : (
                                    <CancelIcon 
                                      color="error" 
                                      fontSize="small"
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            ) : (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.success.main }}>
                                  Correct Answer: {question.correctAnswer}
                                </Typography>
                                <Box 
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    mt: 1,
                                    p: 1.5,
                                    borderRadius: 1,
                                    backgroundColor: isCorrect
                                      ? alpha(theme.palette.success.main, 0.1)
                                      : alpha(theme.palette.error.main, 0.1)
                                  }}
                                >
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: 500,
                                      color: isCorrect
                                        ? theme.palette.success.main
                                        : theme.palette.error.main
                                    }}
                                  >
                                    Your Answer: {question.studentAnswer}
                                  </Typography>
                                  {isCorrect ? (
                                    <CheckCircleIcon 
                                      color="success" 
                                      fontSize="small"
                                      sx={{ ml: 1 }}
                                    />
                                  ) : (
                                    <CancelIcon 
                                      color="error" 
                                      fontSize="small"
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  </Paper>
                );
              })}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3, mb: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
              Your Score Summary
            </Typography>
            
            <Box 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                py: 3
              }}
            >
              <Box 
                sx={{ 
                  position: 'relative',
                  display: 'inline-flex',
                  mb: 2
                }}
              >
                <CircularProgress 
                  variant="determinate" 
                  value={calculatePercentage()} 
                  size={120}
                  thickness={5}
                  sx={{
                    color: 
                      calculatePercentage() >= 70 
                        ? theme.palette.success.main 
                        : calculatePercentage() >= 40 
                          ? theme.palette.warning.main 
                          : theme.palette.error.main
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    variant="h4"
                    component="div"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    {calculatePercentage()}%
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="h4" color="text.primary" sx={{ fontWeight: 700, mb: 1 }}>
                Grade: {getGrade()}
              </Typography>
              
              <Typography variant="h5" color="text.secondary">
                {result.totalMarksObtained} / {result.examId.totalMarks} marks
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Exam Date:
              </Typography>
              <Typography variant="body1">
                {format(new Date(result.examId.startTime), 'PPP')}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Submission Time:
              </Typography>
              <Typography variant="body1">
                {format(new Date(result.submittedAt), 'PPpp')}
              </Typography>
            </Box>
            
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/dashboard')}
              sx={{ 
                mt: 2,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Back to Dashboard
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ExamResults; 