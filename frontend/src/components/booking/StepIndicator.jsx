import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

const STEPS = ['booking.step1', 'booking.step2', 'booking.step3', 'booking.step4'];

const StepIndicator = ({ currentStep }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((stepKey, index) => {
        const stepNum = index + 1;
        const isCompleted = currentStep > stepNum;
        const isActive = currentStep === stepNum;

        return (
          <div key={stepKey} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <motion.div
                animate={{
                  backgroundColor: isCompleted ? '#00bfa5' : isActive ? 'transparent' : 'transparent',
                  borderColor: isCompleted ? '#00bfa5' : isActive ? '#00bfa5' : '#30363d',
                }}
                className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-mono text-sm font-bold"
              >
                {isCompleted ? (
                  <Check size={14} className="text-dark-bg" />
                ) : (
                  <span className={isActive ? 'text-teal' : 'text-text-muted'}>
                    {stepNum}
                  </span>
                )}
              </motion.div>
              <span className={`text-[9px] font-mono tracking-widest mt-1 uppercase ${
                isActive ? 'text-teal' : isCompleted ? 'text-teal/70' : 'text-text-muted'
              }`}>
                {t(stepKey)}
              </span>
            </div>

            {/* Connector */}
            {index < STEPS.length - 1 && (
              <div className="h-px w-16 sm:w-24 mx-2 mt-[-16px]">
                <div className={`h-full transition-colors ${
                  currentStep > stepNum ? 'bg-teal' : 'bg-dark-border'
                }`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
