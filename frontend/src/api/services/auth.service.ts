import API from '../config';

interface LoginData {
    email?: string;
    rollNumber?: string;
    password: string;
}

interface RegisterData {
    name: string;
    email?: string;
    rollNumber?: string;
    batch?: string;
    password: string;
    role?: 'student' | 'teacher';
}

interface AuthResponse {
    token: string;
    user: {
        _id: string;
        name: string;
        email?: string;
        rollNumber?: string;
        batch?: string;
        role: 'student' | 'teacher';
    };
}

export const authService = {
    login: async (data: LoginData) => {
        try {
            console.log('Login request data:', data);
            const response = await API.post<AuthResponse>('/auth/login', data);
            console.log('Login response:', response.data);
            
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                API.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            } else {
                console.error('No token received in login response');
            }
            
            return response.data;
        } catch (error: any) {
            console.error('Login error:', error);
            console.error('Login error details:', error.response?.data);
            throw error;
        }
    },

    register: async (data: RegisterData) => {
        try {
            console.log('Register request data:', {
                ...data,
                password: '[REDACTED]' // Don't log passwords
            });
            
            // Make sure email is not sent for students
            const requestData = { ...data };
            if (requestData.role === 'student') {
                delete requestData.email;
            }
            
            const response = await API.post<AuthResponse>('/auth/register', requestData);
            console.log('Register response:', {
                ...response.data,
                token: '[REDACTED]' // Don't log tokens
            });
            
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                API.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            } else {
                console.error('No token received in register response');
            }
            
            return response.data;
        } catch (error: any) {
            console.error('Register error:', error);
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Register error details:', {
                    data: error.response.data,
                    status: error.response.status,
                    headers: error.response.headers
                });
            } else if (error.request) {
                // The request was made but no response was received
                console.error('Register error - No response:', error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Register error - Request setup:', error.message);
            }
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        delete API.defaults.headers.common['Authorization'];
        window.location.href = '/login';
    },

    getCurrentUser: async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No token found');
            }
            
            const response = await API.get('/auth/me');
            return response.data;
        } catch (error) {
            console.error('Error getting current user:', error);
            throw error;
        }
    },

    refreshToken: async () => {
        try {
            const response = await API.post<AuthResponse>('/auth/refresh');
            
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                API.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            } else {
                console.error('No token received in refresh response');
            }
            
            return response.data;
        } catch (error: any) {
            console.error('Refresh token error:', error);
            console.error('Refresh token error details:', error.response?.data);
            throw error;
        }
    }
}; 