import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  DialogActions,
  Button,
  TablePagination
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { examService } from '../../api/services/exam.service';

interface CheatReport {
  _id: string;
  examId: string;
  studentId: string;
  studentName: string;
  type: 'tab_change' | 'lost_focus' | 'dev_tools' | 'copy_paste';
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface CheatReportsListProps {
  examId: string;
  open: boolean;
  onClose: () => void;
}

const CheatReportsList: React.FC<CheatReportsListProps> = ({ examId, open, onClose }) => {
  const [reports, setReports] = useState<CheatReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (open && examId) {
      fetchReports();
    }
  }, [open, examId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await examService.getCheatReports(examId);
      setReports(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cheat reports');
    } finally {
      setLoading(false);
    }
  };

  const getCheatTypeLabel = (type: string) => {
    switch (type) {
      case 'tab_change':
        return { label: 'Tab Change', color: 'warning' };
      case 'lost_focus':
        return { label: 'Lost Focus', color: 'info' };
      case 'dev_tools':
        return { label: 'Dev Tools', color: 'error' };
      case 'copy_paste':
        return { label: 'Copy/Paste', color: 'secondary' };
      default:
        return { label: type, color: 'default' };
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Group reports by student for better analysis
  const studentReports = reports.reduce((acc: Record<string, CheatReport[]>, report) => {
    if (!acc[report.studentId]) {
      acc[report.studentId] = [];
    }
    acc[report.studentId].push(report);
    return acc;
  }, {});

  // Count violations by student
  const violationCounts = Object.entries(studentReports).map(([studentId, reports]) => {
    const studentName = reports[0].studentName;
    const totalViolations = reports.length;
    const byType = reports.reduce((acc: Record<string, number>, report) => {
      if (!acc[report.type]) {
        acc[report.type] = 0;
      }
      acc[report.type]++;
      return acc;
    }, {});
    
    return {
      studentId,
      studentName,
      totalViolations,
      byType,
      lastViolation: reports[0].timestamp // Reports are sorted by timestamp desc
    };
  }).sort((a, b) => b.totalViolations - a.totalViolations);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Cheating Reports</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : reports.length === 0 ? (
          <Typography align="center" sx={{ p: 2 }}>No cheating reports found for this exam</Typography>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              Summary by Student
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell align="center">Total Violations</TableCell>
                    <TableCell align="center">Tab Changes</TableCell>
                    <TableCell align="center">Lost Focus</TableCell>
                    <TableCell align="center">Dev Tools</TableCell>
                    <TableCell align="center">Copy/Paste</TableCell>
                    <TableCell>Last Violation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {violationCounts.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>{student.studentName}</TableCell>
                      <TableCell align="center">{student.totalViolations}</TableCell>
                      <TableCell align="center">{student.byType['tab_change'] || 0}</TableCell>
                      <TableCell align="center">{student.byType['lost_focus'] || 0}</TableCell>
                      <TableCell align="center">{student.byType['dev_tools'] || 0}</TableCell>
                      <TableCell align="center">{student.byType['copy_paste'] || 0}</TableCell>
                      <TableCell>{new Date(student.lastViolation).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="h6" gutterBottom>
              Detailed Reports
            </Typography>
            <TableContainer component={Paper}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Violation Type</TableCell>
                    <TableCell>IP Address</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((report) => {
                      const { label, color } = getCheatTypeLabel(report.type);
                      return (
                        <TableRow key={report._id} hover>
                          <TableCell>
                            {new Date(report.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>{report.studentName}</TableCell>
                          <TableCell>
                            <Chip 
                              label={label} 
                              color={color as any} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>{report.ipAddress || 'Not available'}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={reports.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CheatReportsList; 