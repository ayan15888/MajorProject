import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../api/services/auth.service';
import API from '../api/config';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'student' | 'teacher') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on component mount
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Token found on initial load, setting authorization header');
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      checkAuthStatus();
    } else {
      console.log('No token found on initial load');
      setLoading(false);
    }
  }, []);

  // Debug useEffect to log state changes
  useEffect(() => {
    console.log('Auth state changed - isAuthenticated:', isAuthenticated, 'user:', user);
  }, [isAuthenticated, user]);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status with API');
      const userData = await authService.getCurrentUser();
      console.log('User data from auth check:', userData);
      
      setUser(userData);
      setIsAuthenticated(true);
      console.log('Auth status check successful, user authenticated');
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('Login attempt in context with email:', email);
      setLoading(true);
      
      const response = await authService.login({ email, password });
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

  const register = async (name: string, email: string, password: string, role: 'student' | 'teacher') => {
    try {
      console.log('Register attempt in context for:', email);
      setLoading(true);
      
      const response = await authService.register({ name, email, password, role });
      console.log('Register response in context:', response);
      
      if (response && response.user) {
        console.log('Setting user state with data:', response.user);
        setUser(response.user);
        
        console.log('Setting isAuthenticated to true');
        setIsAuthenticated(true);
        
        console.log('User registered and authenticated successfully');
        return response;
      } else {
        console.error('Registration succeeded but no user data returned');
        throw new Error('Registration succeeded but no user data returned');
      }
    } catch (error) {
      console.error('Registration failed in context:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('Logging out user');
    localStorage.removeItem('token');
    delete API.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    console.log('User logged out, state cleared');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 