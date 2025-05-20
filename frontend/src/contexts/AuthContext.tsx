import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../api/services/auth.service';
import API from '../api/config';

interface User {
  _id: string;
  name: string;
  email?: string;
  rollNumber?: string;
  batch?: string;
  role: 'student' | 'teacher';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string, isStudent?: boolean) => Promise<void>;
  register: (name: string, password: string, role: 'student' | 'teacher', email?: string, rollNumber?: string, batch?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const userData = await authService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('token');
        delete API.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (identifier: string, password: string, isStudent: boolean = false) => {
    try {
      console.log('Login attempt in context with identifier:', identifier);
      setLoading(true);
      
      const loginData = isStudent 
        ? { rollNumber: identifier, password }
        : { email: identifier, password };
      
      const response = await authService.login(loginData);
      console.log('Login response in context:', response);
      
      if (response && response.user) {
        console.log('Setting user state with data:', response.user);
        setUser(response.user);
        
        console.log('Setting isAuthenticated to true');
        setIsAuthenticated(true);
        
        console.log('User authenticated successfully');
        return response;
      } else {
        console.error('Login succeeded but no user data returned');
        throw new Error('Login succeeded but no user data returned');
      }
    } catch (error) {
      console.error('Login failed in context:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    password: string,
    role: 'student' | 'teacher',
    email?: string,
    rollNumber?: string,
    batch?: string
  ) => {
    try {
      console.log('Register attempt in context');
      setLoading(true);
      
      // Validate required fields based on role
      if (role === 'student') {
        if (!rollNumber || !batch) {
          throw new Error('Roll number and batch are required for student registration');
        }
      } else if (!email) {
        throw new Error('Email is required for teacher registration');
      }

      // Create register data object based on role
      let registerData: any;
      
      if (role === 'student') {
        registerData = {
          name: name.trim(),
          password,
          role,
          rollNumber: rollNumber?.trim(),
          batch: batch?.trim()
          // No email field for students
        };
      } else {
        registerData = {
          name: name.trim(),
          password,
          role,
          email: email?.trim()
        };
      }
      
      console.log('Sending registration data:', {
        ...registerData,
        password: '[REDACTED]'
      });

      const response = await authService.register(registerData);
      
      if (!response || !response.user) {
        throw new Error('Registration response is missing user data');
      }

      setUser(response.user);
      setIsAuthenticated(true);
      console.log('User registered and authenticated successfully');
      
      return response;
    } catch (error: any) {
      console.error('Registration failed in context:', error);
      // Enhance error message for user display
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    login,
    register,
    logout
  };

  if (loading) {
    return null; // or a loading spinner
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 