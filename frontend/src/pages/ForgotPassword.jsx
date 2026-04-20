import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email }) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSentEmail(email);
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetByCode = async () => {
    if (code.length !== 6) return toast.error('Enter the 6-digit code from your email.');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters.');
    setResetting(true);
    try {
      await api.post('/auth/reset-by-code', { email: sentEmail, code, password: newPassword });
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setResetting(false);
    }
  };

  const iStyle = { width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid #c8d8e8', background: '#fff', color: '#1a2e44', fontFamily: 'Inter,system-ui,sans-serif', outline: 'none', boxSizing: 'border-box' };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="card flex flex-col gap-4">
            <div className="text-center">
              <div className="text-4xl mb-2">📬</div>
              <h1 className="text-xl font-bold font-mono text-text-primary">Reset code sent!</h1>
              <p className="text-sm font-mono text-text-secondary mt-1">
                Check your inbox for <span className="text-teal font-bold">{sentEmail}</span>
              </p>
            </div>

            {/* Code entry form */}
            <div style={{ background: '#f0fffe', border: '1.5px solid #00B5BD44', borderRadius: 12, padding: '20px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#003B5C', marginBottom: 4 }}>Enter your 6-digit code</p>
              <p style={{ fontSize: 11, color: '#7a94a8', marginBottom: 14 }}>Open the email on any device, find the large code, and enter it below.</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="e.g. 482 916"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                style={{ ...iStyle, textAlign: 'center', fontSize: 28, fontWeight: 900, letterSpacing: 8, color: '#00B5BD', marginBottom: 12 }}
              />
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="New password (min 8 chars)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ ...iStyle, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#7a94a8', display: 'flex', alignItems: 'center', padding: 4 }}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
              <button onClick={handleResetByCode} disabled={resetting || code.length !== 6 || newPassword.length < 8}
                style={{ width: '100%', padding: '13px', borderRadius: 10, background: (resetting || code.length !== 6 || newPassword.length < 8) ? '#a8dfe2' : 'linear-gradient(135deg,#00B5BD,#007b82)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: resetting ? 'wait' : 'pointer' }}>
                {resetting ? 'Resetting…' : 'Reset Password →'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setSent(false); setSentEmail(''); setCode(''); setNewPassword(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #dde8f0', background: '#fff', color: '#4a6278', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                ← Try different email
              </button>
              <Link to="/login"
                style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#f4f9f9', color: '#4a6278', fontWeight: 600, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Back to Login
              </Link>
            </div>
            <p className="text-xs font-mono text-text-muted text-center">Code expires in 1 hour.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold font-mono text-text-primary">
            {t('auth.forgotPassword')}
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-1">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card flex flex-col gap-4">
          <div>
            <label className="label">{t('auth.email')}</label>
            <input
              type="email"
              autoComplete="email"
              {...register('email', {
                required: t('errors.required'),
                pattern: { value: /\S+@\S+\.\S+/, message: t('errors.invalidEmail') },
              })}
              placeholder="you@example.com"
              className="w-full"
            />
            {errors.email && (
              <p className="text-status-rejected text-xs font-mono mt-1">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Send Reset Link'}
          </button>

          <p className="text-center text-xs font-mono text-text-muted">
            Remember your password?{' '}
            <Link to="/login" className="text-teal hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
