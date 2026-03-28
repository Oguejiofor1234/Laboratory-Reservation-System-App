import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AlertTriangle, GraduationCap, CheckCircle } from 'lucide-react';

const AvailabilityDots = ({ available, total }) => {
  const dots = Array.from({ length: Math.min(total, 10) });
  return (
    <div className="flex gap-0.5">
      {dots.map((_, i) => (
        <span
          key={i}
          className={`availability-dot ${
            i < available
              ? 'bg-teal'
              : 'bg-dark-border'
          }`}
        />
      ))}
    </div>
  );
};

const EquipmentCard = ({ equipment, selected, onSelect }) => {
  const { t } = useTranslation();
  const { name, description, icon, availableNow, totalUnits, maintenanceMode, requiresTraining, isCertified } = equipment;

  return (
    <motion.div
      whileHover={{ scale: maintenanceMode ? 1 : 1.02 }}
      whileTap={{ scale: maintenanceMode ? 1 : 0.98 }}
      onClick={() => !maintenanceMode && onSelect(equipment)}
      className={`card cursor-pointer transition-all duration-200 relative overflow-hidden ${
        maintenanceMode
          ? 'opacity-50 cursor-not-allowed'
          : selected
            ? 'border-teal shadow-lg shadow-teal/10 bg-teal/5'
            : 'hover:border-teal/50 hover:bg-dark-hover/30'
      }`}
    >
      {/* Maintenance overlay */}
      {maintenanceMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/60 z-10">
          <div className="flex items-center gap-2 text-status-pending text-xs font-mono">
            <AlertTriangle size={14} />
            {t('equipment.maintenance')}
          </div>
        </div>
      )}

      {/* Icon */}
      <div className="text-3xl mb-3">{icon}</div>

      {/* Name + description */}
      <h3 className="font-mono font-bold text-text-primary text-sm mb-1">{name}</h3>
      <p className="text-xs text-text-secondary font-mono mb-3">{description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono font-bold ${
          availableNow === 0 ? 'text-status-rejected' : 'text-teal'
        }`}>
          {availableNow}/{totalUnits} {t('equipment.available')}
        </span>
        <AvailabilityDots available={availableNow} total={totalUnits} />
      </div>

      {/* Badges */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {requiresTraining && (
          <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${
            isCertified
              ? 'border-teal/30 text-teal bg-teal/10'
              : 'border-dark-border text-text-muted'
          }`}>
            {isCertified ? <CheckCircle size={10} /> : <GraduationCap size={10} />}
            {isCertified ? t('equipment.certified') : t('equipment.requiresTraining')}
          </span>
        )}
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-teal" />
      )}
    </motion.div>
  );
};

export default EquipmentCard;
