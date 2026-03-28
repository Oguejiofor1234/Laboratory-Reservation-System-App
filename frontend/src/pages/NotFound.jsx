import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-8xl font-bold font-mono text-teal mb-4">404</p>
        <h1 className="text-2xl font-bold font-mono text-text-primary mb-2">{t('errors.notFound')}</h1>
        <p className="text-text-secondary font-mono text-sm mb-8">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary inline-block">← Home</Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
