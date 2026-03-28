import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { GraduationCap, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
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

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await registerUser({ ...data, role: selectedRole });
      setDone(true);
      toast.success(t('auth.emailVerificationSent'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card text-center max-w-md w-full">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="font-mono font-bold text-text-primary mb-2">{t('auth.emailVerificationSent')}</h2>
          <p className="text-xs text-text-secondary font-mono mb-6">Check your inbox and click the verification link.</p>
          <Link to="/login" className="btn-primary inline-block">{t('auth.login')}</Link>
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
                label={t('auth.roleTechnologist')}
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
