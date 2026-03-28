import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

const NotificationBell = () => {
  const { t, i18n } = useTranslation();
  const { unreadCount, notifications, markAllRead, fetchNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const dateLocale = i18n.language?.startsWith('fr') ? fr : enUS;

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleOpen = () => {
    setOpen((p) => !p);
    if (!open) fetchNotifications(1);
  };

  return (
    <div className="relative" ref={ref}>
      <motion.button
        onClick={handleOpen}
        whileTap={{ scale: 0.9 }}
        className="relative p-2 text-text-secondary hover:text-teal transition-colors"
        aria-label={t('notifications.title')}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full
                       bg-teal text-dark-bg text-[10px] font-bold font-mono
                       flex items-center justify-center px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute right-0 top-10 w-80 bg-dark-surface border border-dark-border
                       rounded-xl shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
              <span className="text-xs font-mono tracking-widest text-text-secondary uppercase">
                {t('notifications.title')}
                {unreadCount > 0 && (
                  <span className="ml-2 text-teal">{unreadCount} {t('notifications.unread')}</span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-teal transition-colors font-mono"
                >
                  <CheckCheck size={12} />
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-text-muted text-xs font-mono">
                  {t('notifications.noNotifications')}
                </div>
              ) : (
                notifications.slice(0, 15).map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-dark-border/50 transition-colors
                      ${n.isRead ? '' : 'bg-teal/5 border-l-2 border-l-teal'}`}
                  >
                    <p className={`text-xs font-mono ${n.isRead ? 'text-text-secondary' : 'text-text-primary'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-dark-muted mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
