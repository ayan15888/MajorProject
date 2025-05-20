import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  TablePagination
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  PlayArrow as OngoingIcon,
  Done as CompletedIcon,
  Group as GroupIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { examService, Exam } from '../../api/services/exam.service';
import { useNavigate } from 'react-router-dom';
import ExamSubmissionsList from './ExamSubmissionsList';
import CheatReportsList from './CheatReportsList';

const ExamManagement = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false);
  const [cheatReportsDialogOpen, setCheatReportsDialogOpen] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const fetchedExams = await examService.getAllExams();
      setExams(fetchedExams);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (exam: Exam) => {
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);

    let color;
    let label;
    let icon;

    if (exam.status === 'COMPLETED') {
      color = 'success';
      label = 'Completed';
      icon = <CompletedIcon />;
    } else if (now < startTime) {
      color = 'info';
      label = 'Scheduled';
      icon = <ScheduleIcon />;
    } else if (now >= startTime && now <= endTime) {
      color = 'warning';
      label = 'Ongoing';
      icon = <OngoingIcon />;
    } else if (exam.status === 'PENDING_APPROVAL') {
      color = 'warning';
      label = 'Pending Approval';
      icon = <CheckCircleIcon />;
    } else {
      color = 'default';
      label = exam.status;
      icon = null;
    }

    return (
      <Chip
        icon={icon}
        label={label}
        color={color as any}
        size="small"
        sx={{ fontWeight: 500 }}
      />
    );
  };

  const getSubmissionInfo = (exam: Exam) => {
    if (exam.status === 'COMPLETED') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupIcon fontSize="small" />
          <Typography variant="body2">
            {exam.submissionCount || 0} students
          </Typography>
        </Box>
      );
    }
    return '-';
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewExam = (examId: string) => {
    navigate(`/admin/exams/${examId}`);
  };

  const handleViewSubmissions = (examId: string) => {
    setSelectedExamId(examId);
    setSubmissionsDialogOpen(true);
  };

  const handleCloseSubmissionsDialog = () => {
    setSubmissionsDialogOpen(false);
    setSelectedExamId(null);
  };

  const handleViewCheatReports = (examId: string) => {
    setSelectedExamId(examId);
    setCheatReportsDialogOpen(true);
  };

  const handleCloseCheatReportsDialog = () => {
    setCheatReportsDialogOpen(false);
    setSelectedExamId(null);
  };

  const handlePublishExam = async (examId: string) => {
    if (window.confirm('Are you sure you want to publish this exam? Students will be able to take it once published.')) {
      try {
        setLoading(true);
        const updatedExam = await examService.publishExam(examId);
        
        if (!updatedExam || updatedExam.status !== 'PUBLISHED') {
          throw new Error('Failed to publish exam');
        }

        // Refresh the exam list
        await fetchExams();
        setError('');
      } catch (error: any) {
        setError(error.message || 'Failed to publish exam');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      {error && (
        <Paper sx={{ p: 2, mb: 4, bgcolor: alpha(theme.palette.error.main, 0.1) }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>End Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submissions</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : exams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No exams found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                exams
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((exam) => (
                    <TableRow key={exam._id} hover>
                      <TableCell>{exam.title}</TableCell>
                      <TableCell>{exam.subject}</TableCell>
                      <TableCell>
                        {exam.createdBy?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {new Date(exam.startTime).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(exam.endTime).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusChip(exam)}
                      </TableCell>
                      <TableCell>
                        {getSubmissionInfo(exam)}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Tooltip title="View Submissions">
                            <IconButton
                              size="small"
                              onClick={() => handleViewSubmissions(exam._id!)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Cheat Reports">
                            <IconButton
                              size="small"
                              onClick={() => handleViewCheatReports(exam._id!)}
                              color="warning"
                            >
                              <WarningIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={exams.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Submissions Dialog */}
      {selectedExamId && (
        <>
          <ExamSubmissionsList
            examId={selectedExamId}
            open={submissionsDialogOpen}
            onClose={handleCloseSubmissionsDialog}
          />
          <CheatReportsList
            examId={selectedExamId}
            open={cheatReportsDialogOpen}
            onClose={handleCloseCheatReportsDialog}
          />
        </>
      )}
    </>
  );
};

export default ExamManagement; 