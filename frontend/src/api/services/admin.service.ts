import API from '../config';

export interface User {
  _id: string;
  name: string;
  email?: string;
  rollNumber?: string;
  batch?: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: string;
}

export interface CreateUserPayload {
  name: string;
  email?: string;
  rollNumber?: string;
  batch?: string;
  password: string;
  role: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  rollNumber?: string;
  batch?: string;
  password?: string;
  role?: string;
}

export const adminService = {
  // Get all users
  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await API.get('/admin/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<User> => {
    try {
      const response = await API.get(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  },

  // Create new user
  createUser: async (userData: CreateUserPayload): Promise<User> => {
    try {
      const response = await API.post('/admin/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Update user
  updateUser: async (userId: string, userData: UpdateUserPayload): Promise<User> => {
    try {
      const response = await API.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  },

  // Delete user
  deleteUser: async (userId: string): Promise<void> => {
    try {
      await API.delete(`/admin/users/${userId}`);
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  },

  // Create initial admin user (should only be used once during setup)
  setupAdmin: async (adminData: CreateUserPayload): Promise<User> => {
    try {
      const response = await API.post('/admin/setup-admin', adminData);
      return response.data.user;
    } catch (error) {
      console.error('Error setting up admin:', error);
      throw error;
    }
  }
}; 