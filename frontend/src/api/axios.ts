import axios from 'axios';

const baseURL = (import.meta as any).env?.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      originalRequest._retry = true;
      try {
        const refreshEndpoint = baseURL.endsWith('/') ? `${baseURL}auth/refresh` : `${baseURL}/auth/refresh`;
        await axios.post(refreshEndpoint, {}, { withCredentials: true });
        return api(originalRequest);
      } catch (refreshErr) {
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
