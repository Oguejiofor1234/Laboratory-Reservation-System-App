import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    api.get(`/auth/verify-email/${token}`)
      .then(async () => {
        // Refresh user in memory so isEmailVerified becomes true
        await refreshUser();
        setStatus('success');
        // Redirect to login after 2s so user can log in and complete booking
        setTimeout(() => navigate('/login', { state: { verified: true } }), 2000);
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="card text-center max-w-md w-full">
        {status === 'loading' && <><LoadingSpinner size="lg" className="mx-auto mb-4" /><p className="font-mono text-text-secondary text-sm">{t('common.loading')}</p></>}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-mono font-bold text-text-primary mb-2">Email Verified! ✅</h2>
            <p className="text-xs font-mono text-text-secondary mb-4">Redirecting you to login to complete your booking…</p>
            <LoadingSpinner size="sm" />
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="font-mono font-bold text-text-primary mb-2">Verification Failed</h2>
            <p className="text-xs text-text-secondary font-mono mb-4">The link may be expired or already used.</p>
            <button onClick={() => navigate('/book')} className="btn-secondary">Back to Booking</button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
