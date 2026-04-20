import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import toast from 'react-hot-toast';

// Same colours as LandingPublic
const C = { teal: '#00B5BD', navy: '#003B5C', white: '#ffffff', muted: '#666', border: '#e0e0e0' };

const NavItem = ({ to, active, children, onClick }) => (
  <Link to={to} onClick={onClick} style={{
    padding: '7px 16px', borderRadius: 28, fontSize: 13, fontWeight: 700,
    textDecoration: 'none', transition: 'all 0.22s', whiteSpace: 'nowrap',
    background: active ? C.teal : 'transparent',
    color: active ? C.white : C.navy,
    boxShadow: active ? '0 2px 10px rgba(0,181,189,0.25)' : 'none',
  }}>
    {children}
  </Link>
);

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentLang = i18n.language?.slice(0, 2) || 'en';

  const handleLogout = async () => {
    await logout();
    toast.success(t('auth.logout'));
    navigate('/');
  };

  const is = (path) => location.pathname === path;

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: C.white, borderBottom: `1px solid ${C.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: C.white, fontWeight: 900, fontSize: 16 }}>R</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, color: C.navy, fontSize: 15, letterSpacing: 0.5 }}>REGAL</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', lineHeight: 1 }}>Laboratory</div>
          </div>
        </Link>

        {/* Desktop pill bar — same style as home page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#f4f6f8', borderRadius: 32, padding: '4px 6px' }}>

          <NavItem to="/" active={is('/')}>Home</NavItem>
          <NavItem to="/contact" active={is('/contact')}>Contact</NavItem>

          {user && (
            <>
              <NavItem to="/book" active={is('/book')}>{t('nav.book')}</NavItem>
              <NavItem to="/dashboard" active={is('/dashboard')}>{t('nav.dashboard')}</NavItem>
            </>
          )}

          {/* EN / FR toggle */}
          {['en', 'fr'].map(l => (
            <button key={l} onClick={() => i18n.changeLanguage(l)}
              style={{
                padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: currentLang === l ? C.navy : 'transparent',
                color: currentLang === l ? C.white : C.muted,
              }}>
              {l.toUpperCase()}
            </button>
          ))}

          <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

          {user ? (
            <>
              <div style={{ padding: '0 4px' }}><NotificationBell /></div>
              <span style={{ padding: '7px 10px', fontSize: 13, fontWeight: 700, color: C.navy }}>
                {user.firstName}
              </span>
              <button onClick={handleLogout} style={{
                padding: '7px 16px', borderRadius: 28, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: 'pointer', background: 'transparent',
                color: '#e74c3c', transition: 'all 0.2s',
              }}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <NavItem to="/login" active={is('/login')}>{t('nav.login') || 'Sign In'}</NavItem>
              <Link to="/register" style={{
                padding: '7px 16px', borderRadius: 28, fontSize: 13, fontWeight: 800,
                textDecoration: 'none', background: C.teal, color: C.white,
                boxShadow: '0 2px 10px rgba(0,181,189,0.3)',
              }}>
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button onClick={() => setMobileOpen(p => !p)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex' }}>
          {mobileOpen ? <X size={20} color={C.navy} /> : <Menu size={20} color={C.navy} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ borderTop: `1px solid ${C.border}`, background: C.white, overflow: 'hidden' }}>
            <div style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <NavItem to="/" active={is('/')} onClick={() => setMobileOpen(false)}>Home</NavItem>
              <NavItem to="/contact" active={is('/contact')} onClick={() => setMobileOpen(false)}>Contact</NavItem>
              {user ? (
                <>
                  <NavItem to="/book" active={is('/book')} onClick={() => setMobileOpen(false)}>{t('nav.book')}</NavItem>
                  <NavItem to="/dashboard" active={is('/dashboard')} onClick={() => setMobileOpen(false)}>{t('nav.dashboard')}</NavItem>
                  <button onClick={() => { handleLogout(); setMobileOpen(false); }}
                    style={{ padding: '7px 16px', borderRadius: 28, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'transparent', color: '#e74c3c', textAlign: 'left' }}>
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <NavItem to="/login" active={is('/login')} onClick={() => setMobileOpen(false)}>{t('nav.login') || 'Sign In'}</NavItem>
                  <NavItem to="/register" active={true} onClick={() => setMobileOpen(false)}>{t('nav.register')}</NavItem>
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
