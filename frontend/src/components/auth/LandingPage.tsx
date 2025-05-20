import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  useTheme,
  alpha,
  Card,
  CardContent,
  CardActions,
  Grid,
  Fade
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  SupervisorAccount as TeacherIcon,
  AdminPanelSettings as AdminIcon,
  Login as LoginIcon,
  PersonAdd as RegisterIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const RoleCard = ({ 
  icon: Icon, 
  title, 
  description, 
  onClick, 
  selected 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  onClick: () => void; 
  selected: boolean;
}) => {
  const theme = useTheme();
  
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
        border: selected ? `2px solid ${theme.palette.primary.main}` : 'none',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: theme.shadows[4]
        }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
        <Icon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
        <Typography variant="h6" component="h2" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

const ActionButton = ({ 
  icon: Icon, 
  title, 
  onClick 
}: { 
  icon: React.ElementType; 
  title: string; 
  onClick: () => void;
}) => {
  const theme = useTheme();
  
  return (
    <Button
      variant="contained"
      startIcon={<Icon />}
      onClick={onClick}
      fullWidth
      sx={{
        py: 2,
        px: 4,
        borderRadius: 2,
        textTransform: 'none',
        fontSize: '1.1rem',
        fontWeight: 500,
        backgroundColor: alpha(theme.palette.primary.main, 0.9),
        '&:hover': {
          backgroundColor: theme.palette.primary.main,
        }
      }}
    >
      {title}
    </Button>
  );
};

const LandingPage = () => {
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | 'admin' | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();

  const handleRoleSelect = (role: 'student' | 'teacher' | 'admin') => {
    setSelectedRole(role);
  };

  const handleAction = (action: 'login' | 'register') => {
    if (!selectedRole) return;
    
    // Store the selected role in session storage for the next component
    sessionStorage.setItem('selectedRole', selectedRole);
    
    // Navigate to the appropriate page
    navigate(`/${action}`);
  };

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          mt: 8,
          mb: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3
          }}
        >
          <SchoolIcon
            sx={{
              fontSize: 48,
              color: theme.palette.primary.main
            }}
          />
        </Box>
        
        <Typography
          component="h1"
          variant="h3"
          align="center"
          sx={{
            mb: 2,
            fontWeight: 700,
            color: theme.palette.text.primary
          }}
        >
          Welcome to the Online Examination System
        </Typography>
        
        <Typography
          variant="h6"
          align="center"
          sx={{
            mb: 6,
            color: theme.palette.text.secondary,
            maxWidth: 600
          }}
        >
          Please select your role to continue
        </Typography>

        <Grid container spacing={3} justifyContent="center" sx={{ mb: selectedRole ? 6 : 0 }}>
          <Grid item xs={12} md={4}>
            <RoleCard
              icon={PersonIcon}
              title="Student"
              description="Access your exams, view results, and track your progress"
              onClick={() => handleRoleSelect('student')}
              selected={selectedRole === 'student'}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <RoleCard
              icon={TeacherIcon}
              title="Teacher"
              description="Create and manage exams, grade submissions, and monitor student performance"
              onClick={() => handleRoleSelect('teacher')}
              selected={selectedRole === 'teacher'}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <RoleCard
              icon={AdminIcon}
              title="Administrator"
              description="Manage users, oversee system settings, and maintain the platform"
              onClick={() => handleRoleSelect('admin')}
              selected={selectedRole === 'admin'}
            />
          </Grid>
        </Grid>

        <Fade in={!!selectedRole}>
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            <Typography
              variant="h6"
              align="center"
              sx={{
                mb: 3,
                color: theme.palette.text.primary
              }}
            >
              Choose an action to continue
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <ActionButton
                  icon={LoginIcon}
                  title="Sign In"
                  onClick={() => handleAction('login')}
                />
              </Grid>
              {selectedRole !== 'admin' && (
                <Grid item xs={12}>
                  <ActionButton
                    icon={RegisterIcon}
                    title="Create New Account"
                    onClick={() => handleAction('register')}
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        </Fade>
      </Box>
    </Container>
  );
};

export default LandingPage; 