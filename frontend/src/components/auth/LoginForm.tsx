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
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginForm = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Check if user is already authenticated when component mounts
  useEffect(() => {
    console.log('LoginForm mounted, isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('User is already authenticated, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, []);

  // Monitor authentication state changes
  useEffect(() => {
    console.log('Auth state changed in LoginForm, isAuthenticated:', isAuthenticated);
    if (isAuthenticated && loginSuccess) {
      console.log('User is now authenticated and login was successful, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [isAuthenticated, loginSuccess, navigate]);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
    }),
    onSubmit: async (values) => {
      try {
        setError('');
        setLoading(true);
        console.log('Submitting login form with values:', values);
        
        // If already authenticated, just redirect
        if (isAuthenticated) {
          console.log('Already authenticated, redirecting immediately');
          navigate('/dashboard');
          return;
        }
        
        // Perform login
        await login(values.email, values.password);
        console.log('Login successful in form handler');
        setLoginSuccess(true);
        
        // Force a navigation attempt
        console.log('Attempting immediate navigation to dashboard');
        navigate('/dashboard', { replace: true });
        
        // If that doesn't work, try again after a short delay
        setTimeout(() => {
          console.log('Timeout navigation triggered');
          navigate('/dashboard', { replace: true });
        }, 500);
      } catch (err: any) {
        console.error('Login form submission error:', err);
        setLoginSuccess(false);
        if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else if (err.response?.data?.errors) {
          setError(err.response.data.errors.map((e: any) => e.msg).join(', '));
        } else {
          setError('Login failed. Please check your credentials and try again.');
        }
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5">
            Sign In
          </Typography>
          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              disabled={loading}
            />
            <TextField
              margin="normal"
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || formik.isSubmitting}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => navigate('/register')}
              disabled={loading}
            >
              Don't have an account? Sign Up
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginForm; 