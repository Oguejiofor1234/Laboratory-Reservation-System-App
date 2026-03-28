import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { LANGUAGES } from '../../utils/constants';

/**
 * Language toggle switch — cycles between EN and FR.
 * Persists selection to localStorage via i18next-browser-languagedetector.
 */
const LanguageSwitcher = ({ compact = false }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'en';

  const toggleLanguage = () => {
    const next = currentLang === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(next);
    // i18next-browser-languagedetector automatically saves to localStorage
  };

  if (compact) {
    // Compact pill toggle for navbar
    return (
      <motion.button
        onClick={toggleLanguage}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1 bg-dark-hover border border-dark-border
                   rounded-full px-3 py-1 text-xs font-mono tracking-widest
                   text-text-secondary hover:text-teal hover:border-teal
                   transition-all duration-200 select-none"
        aria-label={`Switch language to ${currentLang === 'en' ? 'Français' : 'English'}`}
        title={`Switch to ${currentLang === 'en' ? 'Français' : 'English'}`}
      >
        {LANGUAGES.map((lang) => (
          <span
            key={lang.code}
            className={`transition-colors ${
              currentLang === lang.code
                ? 'text-teal font-bold'
                : 'text-dark-muted'
            }`}
          >
            {lang.label}
          </span>
        ))}
        <span className="text-dark-muted mx-0.5">|</span>
        <motion.span
          key={currentLang}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="sr-only"
        >
          {currentLang === 'en' ? 'English' : 'Français'}
        </motion.span>
      </motion.button>
    );
  }

  // Full toggle switch (for settings / landing page)
  return (
    <div className="flex items-center gap-2">
      {LANGUAGES.map((lang) => (
        <motion.button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          whileTap={{ scale: 0.95 }}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider border transition-all duration-200 ${
            currentLang === lang.code
              ? 'bg-teal text-dark-bg border-teal font-bold'
              : 'bg-transparent text-text-secondary border-dark-border hover:border-teal hover:text-teal'
          }`}
          aria-pressed={currentLang === lang.code}
        >
          {lang.fullLabel}
        </motion.button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
