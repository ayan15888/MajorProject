import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Alert,
  Paper,
  CircularProgress,
  useTheme,
  alpha,
  IconButton,
  InputAdornment
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Badge as BadgeIcon,
  Class as ClassIcon
} from '@mui/icons-material';

const RegisterForm = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const theme = useTheme();

  // Get the selected role from session storage
  const selectedRole = sessionStorage.getItem('selectedRole') as 'student' | 'teacher' | 'admin' | null;

  useEffect(() => {
    // If no role is selected, redirect to landing page
    if (!selectedRole) {
      navigate('/landing');
      return;
    }

    // If admin role is selected, redirect to login
    if (selectedRole === 'admin') {
      navigate('/login');
      return;
    }

    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, selectedRole, navigate]);

  const validationSchema = Yup.object({
    name: Yup.string()
      .required('Name is required'),
    ...(selectedRole === 'student' ? {
      rollNumber: Yup.string()
        .required('Roll number is required'),
      batch: Yup.string()
        .required('Batch is required')
    } : {
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required')
    }),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Please confirm your password')
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      rollNumber: '',
      batch: '',
      password: '',
      confirmPassword: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError('');
        setLoading(true);
        
        if (selectedRole === 'student') {
          await register(
            values.name,
            values.password,
            selectedRole,
            undefined,
            values.rollNumber,
            values.batch
          );
        } else {
          await register(
            values.name,
            values.password,
            selectedRole,
            values.email
          );
        }
        
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Registration error:', err);
        if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('Registration failed. Please try again with different credentials.');
        }
      } finally {
        setLoading(false);
      }
    },
  });

  // If no role is selected or admin role is selected, don't render the form
  if (!selectedRole || selectedRole === 'admin') {
    return null;
  }

  return (
    <Container component="main" maxWidth="sm">
      <Paper
        elevation={2}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 8,
          borderRadius: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 3
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2
            }}
          >
            <SchoolIcon
              sx={{
                fontSize: 32,
                color: theme.palette.primary.main
              }}
            />
          </Box>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 1
            }}
          >
            Create Account
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              textAlign: 'center'
            }}
          >
            Register as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              width: '100%', 
              mb: 2,
              borderRadius: 1
            }}
          >
            {error}
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit} style={{ width: '100%' }}>
          <TextField
            fullWidth
            id="name"
            name="name"
            label="Full Name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
            disabled={loading}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon sx={{ color: theme.palette.text.secondary }} />
                </InputAdornment>
              )
            }}
          />

          {selectedRole === 'student' ? (
            <>
              <TextField
                fullWidth
                id="rollNumber"
                name="rollNumber"
                label="Roll Number"
                value={formik.values.rollNumber}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.rollNumber && Boolean(formik.errors.rollNumber)}
                helperText={formik.touched.rollNumber && formik.errors.rollNumber}
                disabled={loading}
                autoComplete="off"
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon sx={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  )
                }}
              />

              <TextField
                fullWidth
                id="batch"
                name="batch"
                label="Batch"
                value={formik.values.batch}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.batch && Boolean(formik.errors.batch)}
                helperText={formik.touched.batch && formik.errors.batch}
                disabled={loading}
                autoComplete="off"
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ClassIcon sx={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  )
                }}
              />
            </>
          ) : (
            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              disabled={loading}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: theme.palette.text.secondary }} />
                  </InputAdornment>
                )
              }}
            />
          )}

          <TextField
            fullWidth
            id="password"
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            disabled={loading}
            autoComplete="new-password"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: theme.palette.text.secondary }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <TextField
            fullWidth
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
            helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
            disabled={loading}
            autoComplete="new-password"
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: theme.palette.text.secondary }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle confirm password visibility"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            onClick={formik.handleSubmit}
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem'
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Create Account'
            )}
          </Button>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Button
                onClick={() => navigate('/login')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline'
                  }
                }}
              >
                Sign In
              </Button>
            </Typography>
            <Button
              onClick={() => {
                sessionStorage.removeItem('selectedRole');
                navigate('/landing');
              }}
              sx={{
                mt: 1,
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: 'transparent',
                  textDecoration: 'underline'
                }
              }}
            >
              Change Role
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default RegisterForm; 