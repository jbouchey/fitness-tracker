import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Read token directly from localStorage to avoid circular imports with the store
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear local auth state and redirect to login
// On X-Token-Refresh header, silently update the stored token
api.interceptors.response.use(
  (response) => {
    const refreshedToken = response.headers['x-token-refresh'];
    if (refreshedToken) {
      localStorage.setItem('auth_token', refreshedToken);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
