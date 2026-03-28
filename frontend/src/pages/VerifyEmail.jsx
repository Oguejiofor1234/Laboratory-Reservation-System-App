import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import api from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    api.get(`/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="card text-center max-w-md w-full">
        {status === 'loading' && <><LoadingSpinner size="lg" className="mx-auto mb-4" /><p className="font-mono text-text-secondary text-sm">{t('common.loading')}</p></>}
        {status === 'success' && <>
          <div className="text-4xl mb-4">✅</div>
          <h2 className="font-mono font-bold text-text-primary mb-2">{t('auth.emailVerified')}</h2>
          <Link to="/login" className="btn-primary inline-block mt-4">{t('auth.login')}</Link>
        </>}
        {status === 'error' && <>
          <div className="text-4xl mb-4">❌</div>
          <h2 className="font-mono font-bold text-text-primary mb-2">Verification Failed</h2>
          <p className="text-xs text-text-secondary font-mono mb-4">The link may be expired or invalid.</p>
          <Link to="/register" className="btn-secondary inline-block">{t('auth.register')}</Link>
        </>}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
