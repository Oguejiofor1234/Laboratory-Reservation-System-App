import { motion } from 'framer-motion';
import { format } from 'date-fns';

const C = { teal: '#00B5BD', navy: '#003B5C', white: '#fff', border: '#e0e0e0', muted: '#888' };

const circleColors = [
  '#bfe8f0','#c5e0f5','#d4ecd4','#fde8c8','#e8d4f0','#ffd6d6','#d4f0e8','#e8f0d4',
];

const EquipmentCard = ({ equipment, selected, onSelect }) => {
  const { name, description, icon, maintenanceMode, currentUser, confirmedNext, personInCharge, availableNow } = equipment;

  const inUseNow = !!currentUser || availableNow === 0;
  const blocked = maintenanceMode || inUseNow;
  const bgColor = circleColors[Math.abs((name || '').charCodeAt(0)) % circleColors.length];

  // Status colour
  const statusBg = maintenanceMode ? 'rgba(230,126,34,0.92)' : inUseNow ? 'rgba(231,76,60,0.88)' : 'rgba(39,174,96,0.90)';
  const statusLabel = maintenanceMode ? '🔧 Maintenance' : inUseNow ? '🔒 In Use' : '✅ Available';

  return (
    <motion.div
      whileHover={{ y: blocked ? 0 : -4, boxShadow: blocked ? 'none' : '0 12px 32px rgba(0,181,189,0.18)' }}
      whileTap={{ scale: blocked ? 1 : 0.97 }}
      onClick={() => !blocked && onSelect(equipment)}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        borderRadius: 20, overflow: 'hidden',
        background: selected ? '#f0fffe' : blocked ? '#fafafa' : C.white,
        border: `2px solid ${selected ? C.teal : blocked ? '#e0e0e0' : C.border}`,
        cursor: blocked ? 'not-allowed' : 'pointer',
        opacity: blocked ? 0.7 : 1,
        transition: 'all 0.25s',
        boxShadow: selected ? '0 4px 20px rgba(0,181,189,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── TOP HALF: image covers 50% of card ── */}
      <div style={{ position: 'relative', width: '100%', height: 140, flexShrink: 0, background: bgColor, overflow: 'hidden' }}>
        {equipment.imageUrl ? (
          <img src={equipment.imageUrl} alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
            {icon}
          </div>
        )}

        {/* Status banner over image */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: statusBg,
          padding: '5px 0', fontSize: 9, fontWeight: 800,
          color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center',
        }}>
          {statusLabel}
        </div>

        {/* Selected checkmark */}
        {selected && (
          <div style={{ position: 'absolute', bottom: 8, right: 8, width: 24, height: 24, borderRadius: '50%', background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,181,189,0.4)' }}>
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── BOTTOM HALF: info ── */}
      <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ color: blocked ? '#999' : selected ? C.teal : C.navy, fontWeight: 700, fontSize: 13, margin: '0 0 4px', lineHeight: 1.3 }}>{name}</h3>
        <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.45, margin: '0 0 6px', flex: 1 }}>{description}</p>

        {personInCharge && !blocked && (
          <span style={{ fontSize: 10, color: C.teal, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {personInCharge.firstName}
          </span>
        )}

        {currentUser && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #ffe8e8' }}>
            <p style={{ fontSize: 10, color: '#c0392b', fontWeight: 700, margin: 0 }}>{currentUser.name}</p>
            <p style={{ fontSize: 9, color: C.muted, margin: '2px 0 0' }}>Free at {format(new Date(currentUser.endTime), 'h:mm a, MMM d')}</p>
          </div>
        )}

        {confirmedNext && !currentUser && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #e8f0f0' }}>
            <span style={{ fontSize: 9, color: '#e67e22', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Next Booking</span>
            <p style={{ fontSize: 10, color: C.navy, fontWeight: 700, margin: '2px 0 0' }}>{confirmedNext.userName}</p>
            <p style={{ fontSize: 9, color: C.muted, margin: '1px 0 0' }}>{format(new Date(confirmedNext.startTime), 'MMM d, h:mm a')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default EquipmentCard;
