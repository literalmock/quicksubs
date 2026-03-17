import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log('[v0] API Request:', {
        method: config.method.toUpperCase(),
        url: config.baseURL + config.url,
        headers: config.headers,
      });
    }
    return config;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('[v0] Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Response interceptor for debugging and error handling
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('[v0] API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('[v0] Response Error:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url,
        data: error.response?.data,
        code: error.code, // CORS errors show as ERR_NETWORK
      });
    }

    // Handle specific error cases
    if (error.code === 'ERR_NETWORK' || error.message.includes('CORS')) {
      error.message = `Network Error: Cannot connect to backend at ${API_URL}. Make sure the server is running.`;
    }

    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Check if backend is available on mount
export const checkBackendHealth = async () => {
  try {
    const { data } = await api.get('/health');
    if (import.meta.env.DEV) {
      console.log('[v0] Backend Health:', data);
    }
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[v0] Backend is not available at', API_URL);
    }
    return false;
  }
};

export default api;
