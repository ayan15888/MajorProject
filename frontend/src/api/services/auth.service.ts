import API from '../config';

interface LoginData {
    email: string;
    password: string;
}

interface RegisterData extends LoginData {
    name: string;
    role?: 'student' | 'teacher';
}

interface AuthResponse {
    token: string;
    user: {
        _id: string;
        name: string;
        email: string;
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
            console.log('Register request data:', data);
            const response = await API.post<AuthResponse>('/auth/register', data);
            console.log('Register response:', response.data);
            
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                API.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            } else {
                console.error('No token received in register response');
            }
            
            return response.data;
        } catch (error: any) {
            console.error('Register error:', error);
            console.error('Register error details:', error.response?.data);
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        delete API.defaults.headers.common['Authorization'];
        window.location.href = '/login';
    },

    getCurrentUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No token found');
        }
        
        try {
            const response = await API.get('/auth/me');
            return response.data;
        } catch (error: any) {
            console.error('Get current user error:', error);
            console.error('Get current user error details:', error.response?.data);
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