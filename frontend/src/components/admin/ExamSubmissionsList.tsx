import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
  Button,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Timer as TimerIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { examService } from '../../api/services/exam.service';
import { authService } from '../../api/services/auth.service';

interface ExamSubmissionsListProps {
  examId: string;
  open: boolean;
  onClose: () => void;
}

interface Submission {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  totalMarksObtained: number;
  submittedAt: string;
  status: 'completed' | 'pending-review' | 'canceled';
}

const ExamSubmissionsList: React.FC<ExamSubmissionsListProps> = ({ examId, open, onClose }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [examDetails, setExamDetails] = useState<any>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is admin
    const checkAdminAccess = async () => {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
        if (user.role !== 'admin') {
          setError('Access denied. Admin privileges required.');
          setLoading(false);
          return;
        }
        if (open && examId) {
          fetchSubmissions();
        }
      } catch (err) {
        setError('Failed to verify admin access.');
        setLoading(false);
      }
    };
    
    checkAdminAccess();
  }, [open, examId]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First fetch exam details
      const examData = await examService.getExamById(examId);
      setExamDetails(examData);

      // Then fetch submissions using admin endpoint
      const submissionsData = await examService.getExamSubmissions(examId, true);
      setSubmissions(submissionsData);
    } catch (err: any) {
      console.error('Error fetching exam data:', err);
      if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
      } else if (err.response?.status === 404) {
        setError('Exam not found or has been deleted.');
      } else {
        setError(err.message || 'Failed to fetch submissions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubmission = async () => {
    try {
      if (!selectedSubmission || !cancellationReason) return;
      
      await examService.cancelSubmission(selectedSubmission._id, cancellationReason);
      await fetchSubmissions(); // Refresh the list
      setCancelDialogOpen(false);
      setCancellationReason('');
      setSelectedSubmission(null);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel submission');
    }
  };

  const openCancelDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setCancelDialogOpen(true);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Chip
            icon={<CheckCircleIcon />}
            label="Completed"
            color="success"
            size="small"
            sx={{ fontWeight: 500 }}
          />
        );
      case 'pending-review':
        return (
          <Chip
            icon={<TimerIcon />}
            label="Pending Review"
            color="warning"
            size="small"
            sx={{ fontWeight: 500 }}
          />
        );
      case 'canceled':
        return (
          <Chip
            icon={<BlockIcon />}
            label="Canceled"
            color="error"
            size="small"
            sx={{ fontWeight: 500 }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Exam Submissions
            {examDetails && (
              <Typography variant="subtitle1" color="text.secondary">
                {examDetails.title} - {examDetails.subject}
              </Typography>
            )}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error ? (
          <Paper sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: alpha(theme.palette.error.main, 0.1),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            <Typography color="error" variant="h6" align="center">
              {error}
            </Typography>
            {error.includes('Admin privileges required') && (
              <Typography color="textSecondary" variant="body2" align="center">
                This section is only accessible to administrators.
              </Typography>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={onClose}
              sx={{ mt: 1 }}
            >
              Go Back
            </Button>
          </Paper>
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : currentUser?.role !== 'admin' ? (
          <Paper sx={{ 
            p: 3, 
            textAlign: 'center', 
            bgcolor: alpha(theme.palette.warning.main, 0.1)
          }}>
            <Typography color="warning" variant="h6" gutterBottom>
              Access Restricted
            </Typography>
            <Typography color="textSecondary" paragraph>
              You need administrator privileges to view exam submissions.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={onClose}
              sx={{ mt: 2 }}
            >
              Go Back
            </Button>
          </Paper>
        ) : submissions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No submissions found for this exam.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center">Marks Obtained</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Submitted At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission._id} hover>
                    <TableCell>{submission.studentId.name}</TableCell>
                    <TableCell>{submission.studentId.email}</TableCell>
                    <TableCell align="center">
                      {submission.totalMarksObtained} / {examDetails?.totalMarks || '-'}
                    </TableCell>
                    <TableCell align="center">
                      {getStatusChip(submission.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(submission.submittedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {submission.status !== 'canceled' && (
                        <Tooltip title="Cancel Submission">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => openCancelDialog(submission)}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      {/* Cancel Submission Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Submission</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to cancel this submission?
            {selectedSubmission && (
              <Box mt={1}>
                <Typography variant="body2" color="textSecondary">
                  Student: {selectedSubmission.studentId.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Email: {selectedSubmission.studentId.email}
                </Typography>
              </Box>
            )}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for Cancellation"
            fullWidth
            multiline
            rows={3}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCancelSubmission}
            color="error"
            variant="contained"
            disabled={!cancellationReason}
          >
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default ExamSubmissionsList; 