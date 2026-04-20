import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Login = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  // Show success message if coming from email verification
  useEffect(() => {
    if (location.state?.verified) {
      toast.success('Email verified! Log in to continue your booking.');
    }
  }, []);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email, password }) => {
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold font-mono text-text-primary mb-1">{t('auth.welcomeBack')}</h1>
          <p className="text-xs text-text-secondary font-mono">{t('app.lab')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card flex flex-col gap-4">
          <div>
            <label className="label">{t('auth.email')}</label>
            <input
              type="email"
              autoComplete="email"
              {...register('email', { required: t('errors.required'), pattern: { value: /\S+@\S+\.\S+/, message: t('errors.invalidEmail') } })}
              placeholder="you@example.com"
              className="w-full"
            />
            {errors.email && <p className="text-status-rejected text-xs font-mono mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">{t('auth.password')}</label>
              <Link to="/forgot-password" className="text-xs text-text-muted hover:text-teal font-mono transition-colors">
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <input
              type="password"
              autoComplete="current-password"
              {...register('password', { required: t('errors.required') })}
              placeholder="••••••••"
              className="w-full"
            />
            {errors.password && <p className="text-status-rejected text-xs font-mono mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2 flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner size="sm" /> : t('auth.login')}
          </button>

          <p className="text-center text-xs font-mono text-text-muted">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-teal hover:underline">{t('auth.register')}</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
