import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

const STEPS = ['booking.step1', 'booking.step2', 'booking.step3', 'booking.step4'];

const StepIndicator = ({ currentStep }) => {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
      {STEPS.map((stepKey, index) => {
        const stepNum = index + 1;
        const isCompleted = currentStep > stepNum;
        const isActive = currentStep === stepNum;

        return (
          <div key={stepKey} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <motion.div
                animate={{
                  backgroundColor: isCompleted ? '#00B5BD' : isActive ? '#fff' : '#f0f0f0',
                  borderColor: isCompleted ? '#00B5BD' : isActive ? '#00B5BD' : '#e0e0e0',
                }}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}
              >
                {isCompleted ? (
                  <Check size={14} color="#fff" />
                ) : (
                  <span style={{ color: isActive ? '#00B5BD' : '#aaa' }}>{stepNum}</span>
                )}
              </motion.div>
              <span style={{ fontSize: 9, letterSpacing: 1, marginTop: 4, textTransform: 'uppercase', fontWeight: 700, color: isActive ? '#00B5BD' : isCompleted ? '#00B5BD' : '#aaa' }}>
                {t(stepKey)}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div style={{ height: 2, width: 48, margin: '0 6px', marginTop: -16, background: currentStep > stepNum ? '#00B5BD' : '#e0e0e0', transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
