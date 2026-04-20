import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { GraduationCap, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const RoleCard = ({ role, label, sublabel, icon: Icon, selected, onSelect }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.97 }}
    onClick={() => onSelect(role)}
    className={`card flex flex-col items-center gap-2 py-6 cursor-pointer border-2 transition-all ${
      selected ? 'border-teal bg-teal/5' : 'border-dark-border hover:border-teal/40'
    }`}
  >
    <Icon size={28} className={selected ? 'text-teal' : 'text-text-secondary'} />
    <span className={`font-mono font-bold text-sm ${selected ? 'text-teal' : 'text-text-primary'}`}>{label}</span>
    <span className="text-xs text-text-muted font-mono text-center">{sublabel}</span>
  </motion.button>
);

const Register = () => {
  const { t } = useTranslation();
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await registerUser({ ...data, role: selectedRole });
      setRegisteredEmail(data.email);
      // Extract the token from the returned verifyUrl
      const url = res?.verifyUrl || '';
      const token = url.split('/verify-email/')[1] || '';
      setVerifyToken(token);
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyNow = async () => {
    if (!verifyToken) return toast.error('No verification token found.');
    setVerifying(true);
    try {
      await api.get(`/auth/verify-email/${verifyToken}`);
      setVerified(true);
      toast.success('Email verified! Redirecting to login…');
      setTimeout(() => navigate('/login', { state: { verified: true } }), 1800);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed. Try resending the email.');
    } finally {
      setVerifying(false);
    }
  };

  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleCheckVerified = async () => {
    setChecking(true);
    try {
      const res = await api.get(`/auth/check-verified?email=${encodeURIComponent(registeredEmail)}`);
      if (res.data.verified) {
        toast.success('Email verified! Please log in to continue.');
        navigate('/login');
      } else {
        toast.error('Not verified yet. Please click the verify button or check your email.');
      }
    } catch {
      toast.error('Could not check status. Try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      // Login temporarily won't work since unverified — use public resend via email param
      await api.post('/auth/resend-verification', {}, { params: { email: registeredEmail } });
      toast.success('Verification email resent!');
    } catch {
      toast.error('Could not resend. Please try logging in first.');
    } finally {
      setResending(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Body */}
          <div className="px-8 pt-8 pb-6 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#e0f7f4' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" stroke="#00bfa5" strokeWidth="1.5" fill="#e0f7f4"/>
                  <path d="M22 6L12 13L2 6" stroke="#00bfa5" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="19" cy="5" r="5" fill="#00bfa5"/>
                  <path d="M16.5 5L18.2 6.7L21.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">Verify Your Email</h2>
            <p className="text-xs text-gray-400 mb-4">
              Registered as{' '}
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-600">{registeredEmail}</span>
            </p>

            {/* PRIMARY: Direct verify button — calls API directly, works on any device */}
            {verified ? (
              <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold mb-3" style={{ background: '#e0faf4', color: '#00897b' }}>
                ✅ Email Verified! Redirecting…
              </div>
            ) : (
              <button
                onClick={handleVerifyNow}
                disabled={verifying || !verifyToken}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold mb-3 transition-colors"
                style={{ background: verifying ? '#80cfc8' : '#00bfa5', color: '#fff', border: 'none', cursor: verifying ? 'wait' : 'pointer' }}
              >
                {verifying ? '⏳ Verifying…' : <><span style={{ fontSize: 18 }}>&#10003;</span> Verify My Account — Click Here</>}
              </button>
            )}

            <p className="text-xs text-gray-400 mb-4">
              🔒 No email needed — the button above verifies you instantly on any device.
            </p>

            {/* Divider */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400">or check your email</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Refresh check button */}
            <button
              onClick={handleCheckVerified}
              disabled={checking}
              className="w-full py-3 mb-3 text-sm font-semibold text-gray-700 border-2 border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {checking ? '⏳ Checking…' : '🔄 I’ve Verified — Check Status'}
            </button>

            {/* Secondary actions */}
            <div className="flex gap-2">
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex-1 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {resending ? 'Sending…' : '🔄 Resend Email'}
              </button>
              <a
                href={registeredEmail.endsWith('@gmail.com') ? 'https://mail.google.com' : `https://mail.${registeredEmail.split('@')[1]}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 text-sm text-white rounded-lg text-center hover:opacity-90 transition-colors"
                style={{ background: '#1a73e8' }}
              >
                📧 Open Webmail
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Footer */}
          <div className="flex justify-center px-6 py-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold font-mono text-text-primary mb-1">{t('auth.createAccount')}</h1>
          <p className="text-xs text-text-secondary font-mono">{t('app.lab')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card flex flex-col gap-4">
          {/* Role selection */}
          <div>
            <label className="label">{t('auth.role')}</label>
            <div className="grid grid-cols-2 gap-3">
              <RoleCard
                role="STUDENT"
                label={t('auth.roleStudent')}
                sublabel="Book lab equipment"
                icon={GraduationCap}
                selected={selectedRole === 'STUDENT'}
                onSelect={setSelectedRole}
              />
              <RoleCard
                role="TECHNOLOGIST"
                label="Supervisor"
                sublabel="Manage reservations"
                icon={Wrench}
                selected={selectedRole === 'TECHNOLOGIST'}
                onSelect={setSelectedRole}
              />
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('auth.firstName')}</label>
              <input {...register('firstName', { required: t('errors.required') })} placeholder="John" className="w-full" />
              {errors.firstName && <p className="text-status-rejected text-xs font-mono mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">{t('auth.lastName')}</label>
              <input {...register('lastName', { required: t('errors.required') })} placeholder="Doe" className="w-full" />
              {errors.lastName && <p className="text-status-rejected text-xs font-mono mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="label">{t('auth.email')}</label>
            <input
              type="email"
              autoComplete="email"
              {...register('email', {
                required: t('errors.required'),
                pattern: { value: /\S+@\S+\.\S+/, message: t('errors.invalidEmail') }
              })}
              placeholder="you@example.com"
              className="w-full"
            />
            {errors.email && <p className="text-status-rejected text-xs font-mono mt-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="label">{t('auth.password')}</label>
            <input
              type="password"
              autoComplete="new-password"
              {...register('password', {
                required: t('errors.required'),
                minLength: { value: 8, message: t('errors.passwordTooShort') },
                pattern: { value: /(?=.*[A-Z])(?=.*[0-9])/, message: t('errors.passwordRequirements') }
              })}
              placeholder="Min 8 chars, uppercase + number"
              className="w-full"
            />
            {errors.password && <p className="text-status-rejected text-xs font-mono mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner size="sm" /> : t('auth.register')}
          </button>

          <p className="text-center text-xs font-mono text-text-muted">
            {t('auth.alreadyAccount')}{' '}
            <Link to="/login" className="text-teal hover:underline">{t('auth.login')}</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Register;
