import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, LogOut, User, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success(t('auth.logout'));
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-dark-border bg-dark-bg/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="w-2 h-2 rounded-full bg-teal animate-pulse-teal" />
            <span className="font-mono text-xs tracking-widest text-text-secondary group-hover:text-teal transition-colors uppercase">
              {t('app.lab')}
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            {user && (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-colors ${
                    isActive('/dashboard')
                      ? 'text-teal bg-teal/10 border border-teal/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-dark-hover'
                  }`}
                >
                  <LayoutDashboard size={14} />
                  {t('nav.dashboard')}
                </Link>

                <Link
                  to="/book"
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-colors ${
                    isActive('/book')
                      ? 'text-teal bg-teal/10 border border-teal/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-dark-hover'
                  }`}
                >
                  {t('nav.book')}
                </Link>
              </>
            )}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Language switcher — always visible */}
            <LanguageSwitcher compact />

            {user ? (
              <>
                <NotificationBell />
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-xs font-mono text-text-secondary border-l border-dark-border pl-2">
                    {user.firstName}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono
                               text-text-secondary hover:text-status-rejected hover:bg-dark-hover transition-colors"
                    title={t('nav.logout')}
                  >
                    <LogOut size={14} />
                    {t('nav.logout')}
                  </button>
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-xs">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn-primary text-xs px-4 py-2">
                  {t('nav.register')}
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-text-secondary hover:text-text-primary"
              onClick={() => setMobileOpen((p) => !p)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-dark-border bg-dark-surface overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-2">
              {user ? (
                <>
                  <Link to="/dashboard" className="btn-ghost text-sm" onClick={() => setMobileOpen(false)}>
                    {t('nav.dashboard')}
                  </Link>
                  <Link to="/book" className="btn-ghost text-sm" onClick={() => setMobileOpen(false)}>
                    {t('nav.book')}
                  </Link>
                  <button onClick={handleLogout} className="btn-ghost text-sm text-left text-status-rejected">
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost text-sm" onClick={() => setMobileOpen(false)}>
                    {t('nav.login')}
                  </Link>
                  <Link to="/register" className="btn-primary text-sm" onClick={() => setMobileOpen(false)}>
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
