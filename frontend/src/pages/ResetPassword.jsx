import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ResetPassword = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ password }) => {
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      toast.success(t('auth.passwordResetSuccess'));
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold font-mono text-text-primary">{t('auth.resetPassword')}</h1>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="card flex flex-col gap-4">
          <div>
            <label className="label">{t('auth.password')}</label>
            <input
              type="password"
              {...register('password', {
                required: t('errors.required'),
                minLength: { value: 8, message: t('errors.passwordTooShort') },
              })}
              placeholder="New password (min 8 chars)"
              className="w-full"
            />
            {errors.password && <p className="text-status-rejected text-xs font-mono mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner size="sm" /> : t('common.submit')}
          </button>
          <p className="text-center text-xs font-mono">
            <Link to="/login" className="text-teal hover:underline">{t('nav.login')}</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
