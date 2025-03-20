import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Initialize token from localStorage if it exists
const token = localStorage.getItem('token');
if (token) {
    API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Request interceptor
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If the error is 401 and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Try to refresh the token
                const response = await API.post('/auth/refresh');
                const newToken = response.data.token;
                
                if (newToken) {
                    localStorage.setItem('token', newToken);
                    API.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    
                    // Retry the original request with the new token
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return API(originalRequest);
                }
            } catch (refreshError) {
                // If refresh fails, clear token and redirect to login
                localStorage.removeItem('token');
                delete API.defaults.headers.common['Authorization'];
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // If it's still a 401 after refresh attempt, or any other error
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            delete API.defaults.headers.common['Authorization'];
            window.location.href = '/login';
        }
        
        return Promise.reject(error);
    }
);

export default API; 