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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  School as SchoolIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';

const LoginForm = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<'email' | 'rollNumber'>('email');
  const theme = useTheme();

  // Get the selected role from session storage
  const selectedRole = sessionStorage.getItem('selectedRole') as 'student' | 'teacher' | 'admin' | null;

  useEffect(() => {
    // If no role is selected, redirect to landing page
    if (!selectedRole) {
      navigate('/landing');
      return;
    }

    // Set the appropriate login type based on role
    if (selectedRole === 'student') {
      setLoginType('rollNumber');
    } else {
      setLoginType('email');
    }

    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, selectedRole, navigate]);

  const formik = useFormik({
    initialValues: {
      identifier: '',
      password: '',
    },
    validationSchema: Yup.object({
      identifier: Yup.string()
        .required(loginType === 'email' ? 'Email is required' : 'Roll number is required')
        .test('identifier-validation', 'Invalid format', function (value) {
          if (loginType === 'email') {
            return Yup.string().email('Invalid email address').isValidSync(value);
          }
          return true; // For roll number, just ensure it's not empty
        }),
      password: Yup.string()
        .required('Password is required')
    }),
    onSubmit: async (values) => {
      try {
        setError('');
        setLoading(true);
        await login(values.identifier, values.password, loginType === 'rollNumber');
        setLoginSuccess(true);
      } catch (err: any) {
        console.error('Login form submission error:', err);
        if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('Failed to login. Please check your credentials.');
        }
      } finally {
        setLoading(false);
      }
    },
  });

  // If no role is selected, don't render the form
  if (!selectedRole) {
    return null;
  }

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

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
            Welcome Back
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              textAlign: 'center'
            }}
          >
            Sign in as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
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
            id="identifier"
            name="identifier"
            label={loginType === 'email' ? 'Email Address' : 'Roll Number'}
            value={formik.values.identifier}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.identifier && Boolean(formik.errors.identifier)}
            helperText={formik.touched.identifier && formik.errors.identifier}
            disabled={loading}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loginType === 'email' ? (
                    <EmailIcon sx={{ color: theme.palette.text.secondary }} />
                  ) : (
                    <BadgeIcon sx={{ color: theme.palette.text.secondary }} />
                  )}
                </InputAdornment>
              )
            }}
          />

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
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
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
                    onClick={handleClickShowPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
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
              'Sign In'
            )}
          </Button>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            {selectedRole !== 'admin' && (
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Button
                  onClick={() => navigate('/register')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Sign Up
                </Button>
              </Typography>
            )}
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

export default LoginForm; 