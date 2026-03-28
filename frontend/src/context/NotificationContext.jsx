import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  // Fetch initial unread count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    const fetchCount = async () => {
      try {
        const { data } = await api.get('/notifications/unread-count');
        setUnreadCount(data.data.count);
      } catch { /* ignore */ }
    };
    fetchCount();
  }, [user]);

  // Socket.io connection for real-time notifications
  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || '', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('notification:new', (notification) => {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [notification, ...prev]);

      // Show toast
      toast(notification.title, {
        icon: '🔔',
        style: {
          background: '#161b22',
          color: '#e6edf3',
          border: '1px solid #30363d',
          fontFamily: 'monospace',
        },
        duration: 4000,
      });
    });

    socket.on('booking:new', () => {
      // Technologists receive booking:new events for live dashboard updates
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const markAllRead = useCallback(async () => {
    await api.patch('/notifications/read-all');
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const markRead = useCallback(async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const fetchNotifications = useCallback(async (page = 1) => {
    const { data } = await api.get(`/notifications?page=${page}&limit=20`);
    if (page === 1) {
      setNotifications(data.data);
      setUnreadCount(data.unreadCount);
    } else {
      setNotifications((prev) => [...prev, ...data.data]);
    }
    return data;
  }, []);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      notifications,
      markAllRead,
      markRead,
      fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider');
  return ctx;
};
