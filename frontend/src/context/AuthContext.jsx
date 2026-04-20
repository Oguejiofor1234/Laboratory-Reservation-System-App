import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: silently refresh token to restore session
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        localStorage.setItem('accessToken', data.data.accessToken);
        const meRes = await api.get('/auth/me');
        setUser(meRes.data.data);
      } catch {
        localStorage.removeItem('accessToken');
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();

    // Listen for forced logout triggered by the API interceptor
    const handleForceLogout = () => {
      localStorage.removeItem('accessToken');
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const meRes = await api.get('/auth/me');
      setUser(meRes.data.data);
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
