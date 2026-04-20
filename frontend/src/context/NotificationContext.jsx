import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from './AuthContext';
import { playNotificationSound } from '../utils/notificationSound';

const NotificationContext = createContext(null);

// ─── Native browser notification helper ────────────────────────────────────
const ICONS = {
  BOOKING_REQUEST:   '📋',
  BOOKING_CONFIRMED: '✅',
  BOOKING_REJECTED:  '❌',
  BOOKING_CANCELLED: '🚫',
  TRAINING_CONFIRMED:'✅',
  TRAINING_REQUEST:  '📋',
  default:           '🔔',
};

const showBrowserNotification = (notification) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const icon = ICONS[notification.type] || ICONS.default;
    const n = new Notification(`${icon} ${notification.title}`, {
      body: notification.message,
      tag:  notification.id,   // prevents duplicate popups
      requireInteraction: false,
    });
    // Clicking the popup focuses the browser tab
    n.onclick = () => { window.focus(); n.close(); };
    // Auto-close after 8 s
    setTimeout(() => n.close(), 8000);
  } catch { /* unsupported browser — ignore */ }
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  // Ask for browser notification permission as soon as the user is logged in
  useEffect(() => {
    if (!user) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

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

      // 1. Native OS popup (works even when tab is in background)
      showBrowserNotification(notification);

      // 2. Audible alert
      playNotificationSound(notification.type);

      // 3. In-app toast (visible when tab is open)
      toast(notification.title, {
        icon: '🔔',
        style: {
          background: '#161b22',
          color: '#e6edf3',
          border: '1px solid #30363d',
          fontFamily: 'monospace',
        },
        duration: 5000,
      });
    });

    socket.on('booking:new', () => {
      // Technologists receive booking:new events for live dashboard updates
      // (sound already played via notification:new — no duplicate needed)
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
