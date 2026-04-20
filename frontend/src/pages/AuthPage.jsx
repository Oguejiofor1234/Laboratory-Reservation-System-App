import { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const EQUIPMENT = [
  { name: 'XRD', full: 'X-ray Diffraction', color: '#00B5BD' },
  { name: 'FTIR', full: 'Fourier-Transform Infrared', color: '#4fc3c7' },
  { name: 'CHNS-O', full: 'Elemental Analyzer', color: '#7edde0' },
  { name: 'XRF', full: 'X-ray Fluorescence', color: '#00B5BD' },
  { name: 'SEM', full: 'Scanning Electron Microscope', color: '#3ab8bf' },
  { name: 'TGA', full: 'Thermogravimetric Analysis', color: '#5ecdd1' },
  { name: 'GC-MS', full: 'Gas Chromatography-Mass Spec', color: '#00c5ce' },
  { name: 'TEM', full: 'Transmission Electron Micro.', color: '#4fc3c7' },
  { name: 'BET', full: 'Surface Area & Pore Analysis', color: '#7edde0' },
  { name: 'DSC', full: 'Differential Scanning Calorimetry', color: '#00B5BD' },
];

const EquipBadge = ({ name, full, color, delay, top, left, right }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, y: [0, -12, 0] }}
    transition={{ opacity: { delay, duration: 0.5 }, scale: { delay, duration: 0.5 }, y: { duration: 4 + delay * 0.5, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.3 } }}
    style={{ position: 'absolute', top, left, right, userSelect: 'none', cursor: 'default', zIndex: 0 }}
  >
    <div style={{
      background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
      border: `1px solid ${color}44`,
      borderRadius: 12, padding: '7px 13px',
      boxShadow: `0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)`,
    }}>
      <div style={{ color, fontWeight: 900, fontSize: 13, letterSpacing: 0.5, fontFamily: 'monospace' }}>{name}</div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400, fontSize: 9, letterSpacing: 0.3, marginTop: 1, whiteSpace: 'nowrap' }}>{full}</div>
    </div>
  </motion.div>
);

const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const Field = forwardRef(({ label, error, icon, type, onFocus: onFocusProp, onBlur: onBlurProp, ...props }, ref) => {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#003B5C', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: focused ? '#00B5BD' : '#c8d8e8', transition: 'color 0.2s', pointerEvents: 'none' }}>
            {icon}
          </span>
        )}
        <input
          ref={ref}
          type={isPassword ? (showPw ? 'text' : 'password') : type}
          {...props}
          onFocus={e => { setFocused(true); onFocusProp?.(e); }}
          onBlur={e => { setFocused(false); onBlurProp?.(e); }}
          style={{
            width: '100%',
            padding: icon
              ? `13px ${isPassword ? '42px' : '14px'} 13px 42px`
              : `13px ${isPassword ? '42px' : '16px'} 13px 16px`,
            borderRadius: 12, fontSize: 14, color: '#1a2e44', outline: 'none', boxSizing: 'border-box',
            border: `1.5px solid ${error ? '#e74c3c' : focused ? '#00B5BD' : '#c8d8e8'}`,
            background: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'all 0.2s',
            boxShadow: focused ? '0 0 0 3px rgba(0,181,189,0.12)' : 'none',
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: focused ? '#00B5BD' : '#c8d8e8', transition: 'color 0.2s',
              display: 'flex', alignItems: 'center',
            }}
            tabIndex={-1}
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            <EyeIcon open={showPw} />
          </button>
        )}
      </div>
      {error && (
        <p style={{ color: '#e74c3c', fontSize: 11, marginTop: 5, fontWeight: 600 }}>⚠ {error}</p>
      )}
    </div>
  );
});

const PrimaryBtn = ({ children, loading, ...props }) => (
  <motion.button
    whileHover={{ scale: loading ? 1 : 1.01, boxShadow: loading ? 'none' : '0 6px 20px rgba(0,181,189,0.4)' }}
    whileTap={{ scale: 0.98 }}
    {...props}
    style={{
      width: '100%', padding: '14px', borderRadius: 12, fontWeight: 800, fontSize: 15,
      cursor: loading ? 'not-allowed' : 'pointer', border: 'none', letterSpacing: 0.3,
      background: loading ? '#a8dfe2' : 'linear-gradient(135deg, #00B5BD 0%, #007b82 100%)',
      color: '#fff', boxShadow: '0 4px 16px rgba(0,181,189,0.3)', transition: 'all 0.2s',
    }}
  >
    {loading ? 'Processing...' : children}
  </motion.button>
);

const Divider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
    <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
    <span style={{ color: '#ccc', fontSize: 12 }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
  </div>
);

const GhostBtn = ({ children, onClick }) => (
  <motion.button whileHover={{ background: '#f0fffe' }} whileTap={{ scale: 0.98 }}
    onClick={onClick}
    style={{ width: '100%', padding: '13px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: 'transparent', color: '#00B5BD', border: '2px solid #00B5BD', transition: 'all 0.2s' }}>
    {children}
  </motion.button>
);

// ── Login ──────────────────────────────────────────────────────────────────────
const LoginForm = ({ onSwitch }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (location.state?.verified) toast.success('Email verified — sign in below!');
  }, []);

  const onSubmit = async ({ email, password }) => {
    setLoading(true);
    try { await login(email, password); navigate(from, { replace: true }); }
    catch (err) { toast.error(err.response?.data?.message || 'Invalid credentials'); }
    finally { setLoading(false); }
  };

  return (
    <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
      <h2 style={{ color: '#003B5C', fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Welcome back 👋</h2>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 26 }}>Sign in to access the lab reservation system</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Field label="Email" type="email" placeholder="you@example.com" icon="✉️" error={errors.email?.message}
          {...register('email', { required: 'Email required' })} />
        <Field label="Password" type="password" placeholder="Your password" icon="🔒" error={errors.password?.message}
          {...register('password', { required: 'Password required' })} />
        <div style={{ textAlign: 'right', marginBottom: 20, marginTop: -6 }}>
          <a href="/forgot-password" style={{ fontSize: 12, color: '#00B5BD', fontWeight: 600, textDecoration: 'none' }}>Forgot password?</a>
        </div>
        <PrimaryBtn type="submit" loading={loading}>Sign In →</PrimaryBtn>
      </form>
      <Divider label="New to REGAL?" />
      <GhostBtn onClick={onSwitch}>Create an Account ✨</GhostBtn>
    </motion.div>
  );
};

// ── Register ───────────────────────────────────────────────────────────────────
const RegisterForm = ({ onSwitch }) => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await registerUser({ ...data, role: 'STUDENT' });
      setRegEmail(data.email);
      const url = res?.verifyUrl || '';
      setVerifyToken(url.split('/verify-email/')[1] || '');
      setDone(true);
      // Will show verify screen, then navigate to /book after verification
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  if (done) return (
    <motion.div key="verify" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: 52, marginBottom: 16 }}>✉️</motion.div>
        <h2 style={{ color: '#003B5C', fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Verify your email</h2>
        <p style={{ color: '#aaa', fontSize: 13, marginBottom: 4 }}>Link sent to</p>
        <div style={{ background: '#f0fffe', border: '1.5px solid #00B5BD44', borderRadius: 8, padding: '8px 16px', marginBottom: 20, display: 'inline-block' }}>
          <strong style={{ color: '#003B5C', fontSize: 14 }}>{regEmail}</strong>
        </div>
        {verified ? (
          <div style={{ background: '#e0faf4', color: '#00897b', padding: '14px', borderRadius: 12, fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
            ✅ Verified! Redirecting…
          </div>
        ) : (
          <motion.button onClick={async () => {
            if (!verifyToken) return toast.error('No token found.');
            setVerifying(true);
            try {
              await api.get(`/auth/verify-email/${verifyToken}`);
              setVerified(true);
              toast.success('Verified! Redirecting…');
              setTimeout(() => navigate('/book'), 1800);
            } catch (err) { toast.error(err.response?.data?.message || 'Verification failed.'); }
            finally { setVerifying(false); }
          }} disabled={verifying || !verifyToken} whileHover={{ scale: 1.02 }}
            style={{ display: 'block', width: '100%', background: verifying ? '#a8dfe2' : 'linear-gradient(135deg,#00B5BD,#007b82)', color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 800, fontSize: 15, marginBottom: 10, boxShadow: '0 4px 16px rgba(0,181,189,0.3)', cursor: verifying ? 'wait' : 'pointer' }}>
            {verifying ? '⏳ Verifying…' : '✓ Verify My Account Now'}
          </motion.button>
        )}
        <p style={{ color: '#ccc', fontSize: 11, marginBottom: 14 }}>No email? The button above verifies you instantly on any device.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={async () => { setResending(true); try { await api.post('/auth/resend-verification', { email: regEmail }); toast.success('Resent!'); } catch { toast.error('Failed'); } finally { setResending(false); } }}
            disabled={resending}
            style={{ flex: 1, padding: '11px', borderRadius: 10, border: '2px solid #eee', background: '#fafafa', color: '#888', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {resending ? '...' : '🔄 Resend'}
          </button>
          <button onClick={async () => { setChecking(true); try { const r = await api.get(`/auth/check-verified?email=${encodeURIComponent(regEmail)}`); if (r.data.verified) { toast.success('Verified! Taking you to the booking page.'); navigate('/book'); } else toast.error('Not yet verified.'); } catch { toast.error('Error'); } finally { setChecking(false); } }}
            disabled={checking}
            style={{ flex: 1, padding: '11px', borderRadius: 10, border: '2px solid #00B5BD', background: '#f0fffe', color: '#00B5BD', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            {checking ? '...' : "I've Verified ✓"}
          </button>
        </div>
        <button onClick={onSwitch} style={{ marginTop: 16, background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
          ← Back to Sign In
        </button>
      </div>
    </motion.div>
  );

  return (
    <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
      <h2 style={{ color: '#003B5C', fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Create account 🧪</h2>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 22 }}>Join REGAL Laboratory — free & instant</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="First Name" placeholder="John" error={errors.firstName?.message} icon="👤"
            {...register('firstName', { required: 'Required' })} />
          <Field label="Last Name" placeholder="Doe" error={errors.lastName?.message}
            {...register('lastName', { required: 'Required' })} />
        </div>
        <Field label="Email" type="email" placeholder="you@university.edu" icon="✉️" error={errors.email?.message}
          {...register('email', { required: 'Required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} />
        <Field label="Password" type="password" placeholder="Min 8 chars, uppercase + number" icon="🔒" error={errors.password?.message}
          {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' }, pattern: { value: /(?=.*[A-Z])(?=.*[0-9])/, message: 'Uppercase + number required' } })} />
        <PrimaryBtn type="submit" loading={loading}>Create Account →</PrimaryBtn>
      </form>
      <Divider label="Already registered?" />
      <GhostBtn onClick={onSwitch}>Sign In Instead 🔑</GhostBtn>
    </motion.div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
const AuthPage = () => {
  const [tab, setTab] = useState('login');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Left panel */}
      <div style={{
        flex: '0 0 44%', position: 'relative', overflow: 'hidden',
        backgroundImage: 'url(https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=900&q=80)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 44px',
      }}>
        {/* Dark gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(155deg, rgba(0,30,48,0.92) 0%, rgba(0,59,92,0.88) 45%, rgba(0,94,104,0.82) 80%, rgba(0,181,189,0.75) 100%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          {EQUIPMENT.map((eq, i) => (
            <EquipBadge key={i} {...eq} delay={i * 0.18}
              top={`${6 + (i * 9) % 86}%`}
              left={i % 2 === 0 ? `${3 + (i * 6) % 18}%` : undefined}
              right={i % 2 !== 0 ? `${3 + (i * 4) % 16}%` : undefined}
            />
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          style={{
            position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 340,
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 28, padding: '44px 36px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          }}>

          <motion.div
            animate={{ boxShadow: ['0 0 0 0 rgba(0,181,189,0.5)', '0 0 0 20px rgba(0,181,189,0)', '0 0 0 0 rgba(0,181,189,0)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(0,181,189,0.25)', border: '2px solid rgba(0,181,189,0.7)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>
            🧪
          </motion.div>

          <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 900, letterSpacing: -1, marginBottom: 2 }}>REGAL</h1>
          <p style={{ color: 'rgba(0,181,189,0.85)', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 20, fontWeight: 700 }}>Laboratory System</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.75, marginBottom: 28 }}>
            Advanced equipment reservation for modern reserach.
          </p>

          {[
            { e: '🔬', t: 'Book equipment in seconds' },
            { e: '✅', t: 'Supervisor approval workflow' },
            { e: '📧', t: 'Instant email notifications' },
            { e: '📊', t: 'Real-time availability' },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '9px 14px', marginBottom: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 16 }}>{f.e}</span>
              <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13 }}>{f.t}</span>
            </motion.div>
          ))}
        </motion.div>

        <p style={{ position: 'absolute', bottom: 18, color: 'rgba(255,255,255,0.35)', fontSize: 11, zIndex: 2 }}>
          © 2025 REGAL Laboratory · University Research Division
        </p>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fb', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Tab switcher */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', background: '#eceef1', borderRadius: 14, padding: 5, marginBottom: 28 }}>
            {[['login', '🔑 Sign In'], ['register', '✨ Register']].map(([key, label]) => (
              <motion.button key={key} onClick={() => setTab(key)} whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: tab === key ? '#fff' : 'transparent',
                  color: tab === key ? '#003B5C' : '#aaa',
                  fontWeight: tab === key ? 800 : 600, fontSize: 14, transition: 'all 0.25s',
                  boxShadow: tab === key ? '0 2px 10px rgba(0,0,0,0.09)' : 'none',
                }}>{label}</motion.button>
            ))}
          </motion.div>

          {/* Form card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ background: '#fff', borderRadius: 22, padding: '36px 32px', boxShadow: '0 8px 48px rgba(0,0,0,0.08)', border: '1px solid #ebebeb' }}>
            <AnimatePresence mode="wait">
              {tab === 'login'
                ? <LoginForm key="login" onSwitch={() => setTab('register')} />
                : <RegisterForm key="register" onSwitch={() => setTab('login')} />}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default AuthPage;
