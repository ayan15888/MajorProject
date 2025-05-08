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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  useTheme,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../api/services/auth.service';
import { adminService } from '../../api/services/admin.service';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  SupervisorAccount as TeacherIcon,
  AdminPanelSettings as AdminIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { examService, Exam } from '../../api/services/exam.service';
import ExamManagement from './ExamManagement';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });

  // Add this state for pending approvals
  const [pendingExams, setPendingExams] = useState<Exam[]>([]);
  const [pendingExamsLoading, setPendingExamsLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch current user
        const user = await authService.getCurrentUser();
        if (user.role !== 'admin') {
          // Redirect non-admin users
          setError('Access denied. Admin privileges required.');
          navigate('/dashboard');
          return;
        }
        
        setCurrentUser(user);
        
        // Fetch all users
        const usersData = await adminService.getAllUsers();
        setUsers(usersData);
        
        // Fetch pending exam approvals
        setPendingExamsLoading(true);
        try {
          console.log('About to fetch pending approval exams...');
          const pendingExamsData = await examService.getPendingApprovalExams();
          console.log('Received pending exams:', pendingExamsData);
          setPendingExams(pendingExamsData);
        } catch (pendingError: any) {
          console.error('Error loading pending exams:', pendingError);
          // Show the error in the UI for debugging
          const errorMessage = pendingError.response?.data?.message || pendingError.message || 'Failed to load pending exams';
          setError(`Failed to load pending exams: ${errorMessage}`);
        } finally {
          setPendingExamsLoading(false);
        }
      } catch (error: any) {
        console.error('Error loading admin dashboard:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load data';
        setError(`Failed to load data: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      const newUser = await adminService.createUser(formData);
      setUsers([...users, newUser]);
      setCreateDialogOpen(false);
      resetFormData();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      const updatedUser = await adminService.updateUser(selectedUser._id, formData);
      setUsers(users.map(user => user._id === updatedUser._id ? updatedUser : user));
      setEditDialogOpen(false);
      resetFormData();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      await adminService.deleteUser(selectedUser._id);
      setUsers(users.filter(user => user._id !== selectedUser._id));
      setDeleteDialogOpen(false);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'student'
    });
    setSelectedUser(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <AdminIcon sx={{ color: theme.palette.error.main }} />;
      case 'teacher':
        return <TeacherIcon sx={{ color: theme.palette.primary.main }} />;
      case 'student':
      default:
        return <PersonIcon sx={{ color: theme.palette.success.main }} />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <Chip 
            label="Admin" 
            size="small" 
            icon={<AdminIcon />}
            sx={{ 
              bgcolor: alpha(theme.palette.error.main, 0.1),
              color: theme.palette.error.main,
              fontWeight: 500
            }} 
          />
        );
      case 'teacher':
        return (
          <Chip 
            label="Teacher" 
            size="small" 
            icon={<TeacherIcon />}
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              fontWeight: 500
            }} 
          />
        );
      case 'student':
      default:
        return (
          <Chip 
            label="Student" 
            size="small" 
            icon={<PersonIcon />}
            sx={{ 
              bgcolor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
              fontWeight: 500
            }} 
          />
        );
    }
  };

  const handleApproveExam = async (examId: string) => {
    try {
      setPendingExamsLoading(true);
      await examService.approvePublishResults(examId);
      
      // Update the UI
      setPendingExams(prevExams => prevExams.filter(exam => exam._id !== examId));
      alert('Exam results have been approved and published to students.');
    } catch (error) {
      console.error('Failed to approve exam results:', error);
      setError('Failed to approve exam results. Please try again.');
    } finally {
      setPendingExamsLoading(false);
    }
  };

  const openRejectExamDialog = (exam: Exam) => {
    setSelectedExam(exam);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectExam = async () => {
    if (!selectedExam) return;
    
    try {
      setPendingExamsLoading(true);
      await examService.rejectPublishResults(selectedExam._id!, rejectReason);
      
      // Update the UI
      setPendingExams(prevExams => prevExams.filter(exam => exam._id !== selectedExam._id));
      setRejectDialogOpen(false);
      alert('Exam publication has been rejected and sent back to teacher for review.');
    } catch (error) {
      console.error('Failed to reject exam results:', error);
      setError('Failed to reject exam publication. Please try again.');
    } finally {
      setPendingExamsLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !currentUser) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/login')}
            sx={{ mt: 2 }}
          >
            Back to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
      <AppBar position="static">
        <Toolbar>
          <AdminIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Admin Dashboard
          </Typography>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {error && (
          <Paper sx={{ p: 2, mb: 4, bgcolor: alpha(theme.palette.error.main, 0.1) }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        )}

        {/* Exam Management Section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" gutterBottom>
            Exam Management Overview
          </Typography>
          <ExamManagement />
        </Box>

        {/* Pending Approvals Section */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4" gutterBottom>
                  Pending Approvals
                </Typography>
                <Badge badgeContent={pendingExams.length} color="warning" sx={{ '& .MuiBadge-badge': { fontSize: '0.8rem', height: '1.5rem', minWidth: '1.5rem' } }}>
                  <WarningIcon color="warning" />
                </Badge>
              </Box>
              {pendingExamsLoading && <CircularProgress size={24} />}
            </Box>
          </Grid>

          <Grid item xs={12}>
            {pendingExams.length > 0 ? (
              pendingExams.map((exam) => (
                <Accordion key={exam._id} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <Typography variant="h6">{exam.title}</Typography>
                      <Chip 
                        label={`${exam.subject}`}
                        size="small" 
                        sx={{ 
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main
                        }} 
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={8}>
                        <Typography variant="body1" gutterBottom>
                          <strong>Teacher Notes:</strong> {exam.reviewNotes || 'No notes provided by teacher.'}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Created By:</strong> {exam.createdBy?.name || 'Unknown'} ({exam.createdBy?.email || 'No email'})
                        </Typography>
                        <Typography variant="body2">
                          <strong>Total Marks:</strong> {exam.totalMarks}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Duration:</strong> {exam.duration} minutes
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            <strong>Start Time:</strong> {new Date(exam.startTime).toLocaleString()}
                          </Typography>
                          <Typography variant="body2">
                            <strong>End Time:</strong> {new Date(exam.endTime).toLocaleString()}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleApproveExam(exam._id!)}
                            disabled={pendingExamsLoading}
                            fullWidth
                          >
                            Approve & Publish
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => openRejectExamDialog(exam)}
                            disabled={pendingExamsLoading}
                            fullWidth
                          >
                            Reject
                          </Button>
                          <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<VisibilityIcon />}
                            onClick={() => window.open(`/exam-submissions/${exam._id}`, '_blank')}
                            fullWidth
                          >
                            View Submissions
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <Typography color="textSecondary">No pending approval requests at this time.</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h4" gutterBottom>
                User Management
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  resetFormData();
                  setCreateDialogOpen(true);
                }}
              >
                Add User
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell component="th" scope="row">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getRoleIcon(user.role)}
                          <Typography sx={{ ml: 1 }}>
                            {user.name}
                            {currentUser?._id === user._id && (
                              <Chip 
                                label="You" 
                                size="small" 
                                sx={{ 
                                  ml: 1, 
                                  height: 20, 
                                  bgcolor: alpha(theme.palette.info.main, 0.1),
                                  color: theme.palette.info.main
                                }} 
                              />
                            )}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => openEditDialog(user)}
                          disabled={loading}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => openDeleteDialog(user)}
                          disabled={loading || user._id === currentUser?._id}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Container>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  label="Role"
                  onChange={handleInputChange}
                >
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="teacher">Teacher</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreateUser} color="primary" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="password"
                label="Password (leave empty to keep current)"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  label="Role"
                  onChange={handleInputChange}
                >
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="teacher">Teacher</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpdateUser} color="primary" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user <strong>{selectedUser?.name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Publication Request</DialogTitle>
        <DialogContent>
          <Typography gutterBottom sx={{ mb: 2 }}>
            Please provide a reason for rejecting the publication request for <strong>{selectedExam?.title}</strong>.
            This will be visible to the teacher.
          </Typography>
          <TextField
            label="Rejection Reason"
            multiline
            rows={4}
            fullWidth
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why the publication request is being rejected..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={pendingExamsLoading}>
            Cancel
          </Button>
          <Button onClick={handleRejectExam} color="error" variant="contained" disabled={pendingExamsLoading}>
            {pendingExamsLoading ? <CircularProgress size={24} /> : 'Reject Publication'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard; 