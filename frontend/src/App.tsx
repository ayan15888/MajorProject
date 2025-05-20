import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import LandingPage from './components/auth/LandingPage';
import Dashboard from './components/dashboard/Dashboard';
import CreateExam from './components/exam/CreateExam';
import TakeExam from './components/exam/TakeExam';
import SubmissionReview from './components/exam/SubmissionReview';
import ExamResults from './components/exam/ExamResults';
import AdminDashboard from './components/admin/AdminDashboard';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuth } from './contexts/AuthContext';
// Import Google Fonts
import '@fontsource/bricolage-grotesque/300.css';
import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/bricolage-grotesque/500.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/700.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Bricolage Grotesque", sans-serif',
    h1: {
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 500,
    },
    h6: {
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 500,
    },
    subtitle1: {
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 500,
    },
    subtitle2: {
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 500,
    },
    body1: {
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 400,
    },
    body2: {
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 400,
    },
    button: {
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 500,
    },
  },
});

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  console.log('PrivateRoute render - isAuthenticated:', isAuthenticated, 'path:', location.pathname);
  
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  console.log('Authenticated, rendering children');
  return <>{children}</>;
};

const TeacherRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  
  console.log('AdminRoute render - isAuthenticated:', isAuthenticated, 'role:', user?.role, 'path:', location.pathname);
  
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (user?.role !== 'admin') {
    console.log('Not an admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('Authenticated as admin, rendering children');
  return <>{children}</>;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  );
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    console.log('App routes render - Current path:', location.pathname, 'isAuthenticated:', isAuthenticated);
  }, [location.pathname, isAuthenticated]);
  
  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginForm />
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterForm />
      } />
      <Route path="/landing" element={<LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/create-exam"
        element={
          <TeacherRoute>
            <CreateExam />
          </TeacherRoute>
        }
      />
      <Route
        path="/edit-exam/:examId"
        element={
          <TeacherRoute>
            <CreateExam />
          </TeacherRoute>
        }
      />
      <Route
        path="/exam-submissions/:examId"
        element={
          <TeacherRoute>
            <SubmissionReview />
          </TeacherRoute>
        }
      />
      <Route
        path="/take-exam/:examId"
        element={
          <PrivateRoute>
            <TakeExam />
          </PrivateRoute>
        }
      />
      <Route
        path="/exam-results/:examId"
        element={
          <PrivateRoute>
            <ExamResults />
          </PrivateRoute>
        }
      />
      <Route path="/" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/landing" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
