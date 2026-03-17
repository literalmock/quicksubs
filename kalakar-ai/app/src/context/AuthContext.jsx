import { createContext, useContext, useState, useEffect } from 'react';
import api, { checkBackendHealth } from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [error, setError] = useState(null);

  // Check auth on mount and verify backend is available
  useEffect(() => {
    const init = async () => {
      // First check if backend is available
      const isAvailable = await checkBackendHealth();
      setBackendAvailable(isAvailable);
      
      if (!isAvailable) {
        setError('Backend server is not running. Please start the server on port 5000.');
        setLoading(false);
        return;
      }

      await fetchUser();
    };

    init();
  }, []);

  const fetchUser = async () => {
    try {
      setError(null);
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (err) {
      // 401 means user is not authenticated - that's OK
      if (err.response?.status !== 401) {
        setError(err.message || 'Failed to fetch user');
        if (import.meta.env.DEV) {
          console.error('[v0] fetchUser error:', err);
        }
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);

      if (!backendAvailable) {
        throw new Error('Backend server is not running. Please start the server on port 5000.');
      }

      const { data } = await api.post('/auth/login', { email, password });
      setUser(data.user);
      return data;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Login failed';

      if (import.meta.env.DEV) {
        console.error('[v0] Login error:', err);
      }

      setError(errorMessage);
      throw err;
    }
  };

  const signup = async (name, email, password) => {
    try {
      setError(null);

      if (!backendAvailable) {
        throw new Error('Backend server is not running. Please start the server on port 5000.');
      }

      const { data } = await api.post('/auth/signup', { name, email, password });
      setUser(data.user);
      return data;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Signup failed';

      if (import.meta.env.DEV) {
        console.error('[v0] Signup error:', err);
      }

      setError(errorMessage);
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await api.post('/auth/logout');
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[v0] Logout error:', err);
      }
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        backendAvailable,
        login,
        signup,
        logout,
        fetchUser,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
