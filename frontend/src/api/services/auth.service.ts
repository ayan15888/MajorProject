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
}

export const authService = {
    login: async (data: LoginData) => {
        const response = await API.post<AuthResponse>('/auth/login', data);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            // Update axios default headers
            API.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }
        return response.data;
    },

    register: async (data: RegisterData) => {
        const response = await API.post<AuthResponse>('/auth/register', data);
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        // Remove authorization header
        delete API.defaults.headers.common['Authorization'];
    },

    getCurrentUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No token found');
        }
        // Ensure the token is in the headers
        API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await API.get('/auth/me');
        return response.data;
    }
}; 