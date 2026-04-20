import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Landing = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: equipmentData, isLoading } = useQuery({
    queryKey: ['equipment-public'],
    queryFn: () => api.get('/equipment').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen flex flex-col items-center pt-16 px-4">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 max-w-2xl"
      >
        {/* Lab badge */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center gap-2 bg-dark-surface border border-dark-border
                     rounded-full px-4 py-1.5 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-teal animate-pulse-teal" />
          <span className="text-xs font-mono tracking-widest text-text-secondary uppercase">
            {t('app.lab')}
          </span>
        </motion.div>

        <h1 className="text-4xl sm:text-5xl font-bold font-mono text-text-primary mb-3 leading-tight">
          Equipment
        </h1>
        <h2 className="text-4xl sm:text-5xl font-bold font-mono text-teal mb-6 leading-tight">
          {t('app.name')}
        </h2>
        <p className="text-text-secondary font-mono text-sm tracking-widest mb-10">
          {t('app.tagline')}
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link to="/book" className="btn-primary flex items-center gap-2">
              <span>{t('nav.book')}</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
                <span>{t('auth.register')}</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-secondary w-full sm:w-auto text-center">
                {t('auth.login')}
              </Link>
            </>
          )}
        </div>

        {/* Language switcher on hero */}
        <div className="flex justify-center mt-8">
          <LanguageSwitcher />
        </div>
      </motion.div>

      {/* Equipment preview grid */}
      <div className="w-full max-w-4xl">
        <p className="section-title text-center mb-6">{t('equipment.title')}</p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
            {(equipmentData || []).slice(0, 6).map((eq, i) => (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card"
              >
                <div className="text-2xl mb-2">{eq.icon}</div>
                <h3 className="font-mono text-sm font-bold text-text-primary mb-1">{eq.name}</h3>
                <p className="text-xs text-text-secondary font-mono mb-3">{eq.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-bold ${eq.availableNow === 0 ? 'text-status-rejected' : 'text-teal'}`}>
                    {eq.availableNow}/{eq.totalUnits} {t('equipment.available')}
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(eq.totalUnits, 10) }).map((_, j) => (
                      <span key={j} className={`w-2 h-2 rounded-full ${j < eq.availableNow ? 'bg-teal' : 'bg-dark-border'}`} />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!user && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-xs font-mono text-text-muted mt-8"
          >
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-teal hover:underline">
              {t('auth.register')}
            </Link>{' '}
            {t('common.or')}{' '}
            <Link to="/login" className="text-teal hover:underline">
              {t('auth.login')}
            </Link>
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default Landing;
