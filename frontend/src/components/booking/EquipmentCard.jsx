import { motion } from 'framer-motion';
import { formatTimeET, formatMonthDayET } from "../../utils/timezone";
import { resolveImageUrl } from '../../utils/imageUrl';

const circleColors = [
  ['#dff4f5','#00B5BD'],
  ['#dce8f5','#2980b9'],
  ['#d4f0e6','#27ae60'],
  ['#fdebd0','#e67e22'],
  ['#ede0f5','#8e44ad'],
  ['#fde8e8','#e74c3c'],
  ['#d5f5e3','#1abc9c'],
  ['#fef9e7','#f39c12'],
];

const EquipmentCard = ({ equipment, selected, onSelect }) => {
  const rawImageUrl = equipment.imageUrl;
  const { name, description, icon, maintenanceMode, currentUser, upcomingBookings = [], availableNow, personInCharge } = equipment;
  const imageUrl = resolveImageUrl(rawImageUrl);

  const inUseNow = !!currentUser || availableNow === 0;
  const blocked = maintenanceMode || inUseNow;

  const idx = Math.abs((name || '').charCodeAt(0)) % circleColors.length;
  const [circleBg, accentColor] = circleColors[idx];

  const statusColor = maintenanceMode ? '#e67e22' : inUseNow ? '#e74c3c' : '#27ae60';
  const statusDot   = maintenanceMode ? '#f39c12' : inUseNow ? '#e74c3c' : '#27ae60';
  const statusLabel = maintenanceMode ? 'Maintenance' : inUseNow ? 'In Use' : 'Available';

  return (
    <motion.div
      whileHover={!blocked ? { y: -8, transition: { duration: 0.2 } } : {}}
      whileTap={!blocked ? { scale: 0.96 } : {}}
      onClick={() => !blocked && onSelect(equipment)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '28px 16px 20px',
        borderRadius: 24,
        background: selected ? '#f0fffe' : '#fff',
        border: `2px solid ${selected ? '#00B5BD' : 'rgba(0,0,0,0.06)'}`,
        cursor: blocked ? 'not-allowed' : 'pointer',
        opacity: blocked ? 0.55 : 1,
        boxShadow: selected
          ? '0 8px 28px rgba(0,181,189,0.22)'
          : '0 2px 12px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s, border-color 0.2s, opacity 0.2s',
        userSelect: 'none',
      }}
    >
      {/* ── Circle ── */}
      <div style={{ position: 'relative', marginBottom: 16 }}>

        {/* Outer glow ring when selected */}
        {selected && (
          <div style={{
            position: 'absolute', inset: -5,
            borderRadius: '50%',
            border: '2.5px solid #00B5BD',
            opacity: 0.5,
          }} />
        )}

        {/* Main circle */}
        <div style={{
          width: 136, height: 136, borderRadius: '50%',
          background: imageUrl ? 'transparent' : circleBg,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: selected
            ? `0 0 0 4px rgba(0,181,189,0.18), 0 8px 24px ${accentColor}33`
            : '0 4px 18px rgba(0,0,0,0.10)',
          transition: 'box-shadow 0.25s',
          flexShrink: 0,
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 54, lineHeight: 1, filter: blocked ? 'grayscale(1)' : 'none' }}>
              {icon}
            </span>
          )}
        </div>

        {/* Status pill — bottom-centre of circle */}
        <div style={{
          position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 4,
          background: '#fff', border: `1.5px solid ${statusColor}55`,
          borderRadius: 20, padding: '3px 9px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot, flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: statusColor, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            {statusLabel}
          </span>
        </div>

        {/* Selected checkmark — top-right */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
            style={{
              position: 'absolute', top: 2, right: 2,
              width: 24, height: 24, borderRadius: '50%',
              background: '#00B5BD', border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,181,189,0.5)',
            }}>
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        )}
      </div>

      {/* ── Name ── */}
      <h3 style={{
        color: blocked ? '#bbb' : selected ? '#00B5BD' : '#003B5C',
        fontWeight: 800, fontSize: 13, margin: '0 0 5px',
        textAlign: 'center', lineHeight: 1.3, letterSpacing: 0.1,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {name}
      </h3>

      {/* ── Description ── */}
      <p style={{
        color: '#9ab0c4', fontSize: 11, margin: '0 0 10px',
        textAlign: 'center', lineHeight: 1.5,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {description}
      </p>

      {/* ── Info panel ── */}
      <div style={{
        width: '100%', borderTop: '1px solid #f0f4f8', paddingTop: 10,
        display: 'flex', flexDirection: 'column', gap: 6,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>

        {/* Supervisor in charge */}
        {personInCharge && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#003B5C,#00B5BD)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 9, fontWeight: 800,
            }}>
              {personInCharge.firstName[0]}
            </div>
            <div>
              <p style={{ fontSize: 9, color: '#9ab0c4', margin: 0, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>Supervisor</p>
              <p style={{ fontSize: 11, color: '#003B5C', margin: 0, fontWeight: 700 }}>
                {personInCharge.firstName} {personInCharge.lastName}
              </p>
            </div>
          </div>
        )}

        {/* Currently in use */}
        {currentUser && (
          <div style={{
            background: currentUser.type === 'training' ? '#f0f4ff' : '#fff5f5',
            border: `1px solid ${currentUser.type === 'training' ? '#b2c8f0' : '#fcc'}`,
            borderRadius: 8, padding: '7px 10px',
          }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', margin: '0 0 2px',
              color: currentUser.type === 'training' ? '#3b66cc' : '#e74c3c' }}>
              {currentUser.type === 'training' ? '🎓 Training In Progress' : '🔴 In Use Now'}
            </p>
            <p style={{ fontSize: 11, fontWeight: 700, margin: '0 0 1px',
              color: currentUser.type === 'training' ? '#1a3a7a' : '#c0392b' }}>
              {currentUser.name}
            </p>
            <p style={{ fontSize: 10, margin: 0,
              color: currentUser.type === 'training' ? '#3b66cc' : '#e74c3c' }}>
              Free at <strong>{formatTimeET(currentUser.endTime)}</strong>
            </p>
          </div>
        )}

        {/* Maintenance banner */}
        {maintenanceMode && (
          <div style={{ background: '#fff8f0', border: '1px solid #f39c1233', borderRadius: 8, padding: '6px 10px' }}>
            <p style={{ fontSize: 10, color: '#e67e22', margin: 0, fontWeight: 700 }}>🔧 Under maintenance</p>
          </div>
        )}

        {/* All upcoming bookings timeline */}
        {!maintenanceMode && upcomingBookings.length > 0 && (
          <div style={{ borderTop: currentUser ? '1px solid #f0e0e0' : '1px solid #f0f4f8', paddingTop: 8, marginTop: currentUser ? 6 : 0 }}>
            <p style={{ fontSize: 9, color: '#9ab0c4', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 5px' }}>
              Upcoming Bookings
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {upcomingBookings.map((b, i) => {
                const isTraining  = b.type === 'training';
                const isConfirmed = b.status === 'CONFIRMED';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                    padding: '5px 8px', borderRadius: 7,
                    background: isTraining
                      ? (isConfirmed ? '#f0f4ff' : '#faf0ff')
                      : (isConfirmed ? '#f0fff4' : '#fffbf0'),
                    border: `1px solid ${
                      isTraining
                        ? (isConfirmed ? '#b2c8f0' : '#ddb2f0')
                        : (isConfirmed ? '#b7efc9' : '#f5dfa0')
                    }`,
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* Type + status badge row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                        <span style={{
                          fontSize: 8, fontWeight: 800, letterSpacing: 0.8,
                          textTransform: 'uppercase',
                          padding: '1px 6px', borderRadius: 20,
                          background: isTraining
                            ? (isConfirmed ? '#e8edff' : '#f3e8ff')
                            : (isConfirmed ? '#e8fff0' : '#fff8e8'),
                          color: isTraining
                            ? (isConfirmed ? '#3b66cc' : '#8e44ad')
                            : (isConfirmed ? '#27ae60' : '#e67e22'),
                          border: `1px solid ${
                            isTraining
                              ? (isConfirmed ? '#b2c8f0' : '#ddb2f0')
                              : (isConfirmed ? '#b7efc9' : '#f5dfa0')
                          }`,
                        }}>
                          {isTraining ? '🎓 Training' : '📋 Booking'}
                        </span>
                        <span style={{
                          fontSize: 8, fontWeight: 800,
                          color: isConfirmed ? '#27ae60' : '#e67e22',
                        }}>
                          {isConfirmed ? '✓ Confirmed' : '⏳ Pending'}
                        </span>
                      </div>
                      {/* Date */}
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#003B5C', margin: 0, lineHeight: 1.3 }}>
                        {formatMonthDayET(b.startTime)}
                      </p>
                      {/* Time range */}
                      <p style={{ fontSize: 10, color: '#4a6278', margin: '1px 0 0', fontWeight: 600 }}>
                        {formatTimeET(b.startTime)} – {formatTimeET(b.endTime)}
                      </p>
                      {/* Student name */}
                      <p style={{ fontSize: 9, color: '#9ab0c4', margin: '1px 0 0' }}>{b.userName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No bookings — available */}
        {!maintenanceMode && !currentUser && upcomingBookings.length === 0 && (
          <div style={{ background: '#f0fef4', border: '1px solid #b7efc9', borderRadius: 8, padding: '6px 10px' }}>
            <p style={{ fontSize: 10, color: '#27ae60', margin: 0, fontWeight: 700 }}>✅ No upcoming bookings</p>
          </div>
        )}

      </div>
    </motion.div>
  );
};

export default EquipmentCard;
