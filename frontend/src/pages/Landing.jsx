import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { resolveImageUrl } from '../utils/imageUrl';
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

      {/* Our Equipment — Alternating Feature Sections */}
      <section style={{ width: '100%', maxWidth: 960, marginTop: 80, paddingBottom: 80 }}>

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <p className="section-title" style={{ justifyContent: 'center', display: 'inline-flex' }}>
            {t('equipment.title')}
          </p>
          <p style={{ color: '#5a7a94', fontFamily: 'monospace', fontSize: 14, marginTop: 16, lineHeight: 1.8 }}>
            State-of-the-art instruments available for reservation by registered researchers and students.
          </p>
        </motion.div>

        {/* Alternating rows */}
        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : (
          (equipmentData || []).map((eq, i) => (
            <motion.div
              key={eq.id}
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 48,
                marginBottom: 80,
                flexWrap: 'wrap',
              }}
            >
              {/* Visual side */}
              <div style={{
                flex: '1 1 260px',
                display: 'flex',
                justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end',
                order: i % 2 === 0 ? 0 : 1,
              }}>
                <div style={{
                  width: 260,
                  height: 260,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 38% 38%, rgba(0,181,189,0.18) 0%, rgba(0,59,92,0.08) 70%)',
                  border: '2px solid rgba(0,181,189,0.22)',
                  boxShadow: '0 12px 48px rgba(0,181,189,0.13)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  flexShrink: 0,
                }}>
                  {/* Dashed outer ring */}
                  <div style={{
                    position: 'absolute', inset: -12,
                    borderRadius: '50%',
                    border: '1.5px dashed rgba(0,181,189,0.18)',
                  }} />
                  {/* Dot accents */}
                  {[45, 135, 225, 315].map((deg) => (
                    <div key={deg} style={{
                      position: 'absolute',
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#00B5BD',
                      opacity: 0.35,
                      top: `calc(50% + ${Math.sin(deg * Math.PI / 180) * 142}px - 4px)`,
                      left: `calc(50% + ${Math.cos(deg * Math.PI / 180) * 142}px - 4px)`,
                    }} />
                  ))}
                  {eq.imageUrl ? (
                    <img
                      src={resolveImageUrl(eq.imageUrl)}
                      alt={eq.name}
                      style={{ width: '62%', height: '62%', objectFit: 'cover', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,59,92,0.15)' }}
                    />
                  ) : (
                    <>
                      <span style={{ fontSize: 68, lineHeight: 1, marginBottom: 10 }}>{eq.icon}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: '#00B5BD', letterSpacing: 3 }}>{eq.name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Text side */}
              <div style={{
                flex: '1 1 280px',
                order: i % 2 === 0 ? 1 : 0,
              }}>
                <h3 style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 900, color: '#003B5C', marginBottom: 12, lineHeight: 1.3 }}>
                  {eq.name}
                </h3>
                <p style={{ color: '#5a7a94', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, lineHeight: 1.85, marginBottom: 24 }}>
                  {eq.description}
                </p>

                {/* Availability indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {Array.from({ length: Math.min(eq.totalUnits, 8) }).map((_, j) => (
                      <span key={j} style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: j < eq.availableNow ? '#00B5BD' : '#dde8f0',
                        display: 'inline-block',
                      }} />
                    ))}
                  </div>
                  <span style={{
                    fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                    color: eq.availableNow === 0 ? '#e74c3c' : '#00B5BD',
                  }}>
                    {eq.availableNow}/{eq.totalUnits} {t('equipment.available')}
                  </span>
                </div>

                {user ? (
                  <Link to="/book" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    Book Now <ArrowRight size={15} />
                  </Link>
                ) : (
                  <Link to="/register" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    Get Started <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            </motion.div>
          ))
        )}

        {/* Bottom sign-in nudge */}
        {!user && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: '#9ab0c4', marginTop: 8 }}
          >
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-teal hover:underline">{t('auth.register')}</Link>{' '}
            {t('common.or')}{' '}
            <Link to="/login" className="text-teal hover:underline">{t('auth.login')}</Link>
          </motion.p>
        )}
      </section>
    </div>
  );
};

export default Landing;
