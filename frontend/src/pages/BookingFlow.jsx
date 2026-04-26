import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addHours } from 'date-fns';
import { etHourToUTCISO, formatTimeET, formatDateET, formatMonthDayET, isSameDayET } from '../utils/timezone';
import { playNotificationSound } from '../utils/notificationSound';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StepIndicator from '../components/booking/StepIndicator';
import EquipmentCard from '../components/booking/EquipmentCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

// ─── Step 2: Experience check ─────────────────────────────────────────────────────
const ExperienceStep = ({ equipment, onChoice }) => {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl mx-auto">
      {/* Equipment banner */}
      <div style={{ background: 'linear-gradient(135deg,#003B5C,#00B5BD)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{equipment.icon}</div>
        <div>
          <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: 0 }}>{equipment.name}</h3>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, margin: '4px 0 0' }}>{equipment.description}</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: '28px', boxShadow: '0 4px 24px rgba(0,59,92,0.08)', border: '1.5px solid #dde8f0' }}>
        <p className="section-title">Experience Level</p>
        <p style={{ fontSize: 14, color: '#4a6278', marginBottom: 20 }}>{t('booking.experienceSubtitle')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[{ choice: true, icon: '✅', label: t('booking.yesExperience'), sub: t('booking.yesExperienceSub'), color: '#00B5BD' },
            { choice: false, icon: '🎓', label: t('booking.noExperience'), sub: t('booking.noExperienceSub'), color: '#003B5C' }]
            .map(({ choice, icon, label, sub, color }) => (
            <motion.button key={String(choice)} whileHover={{ y: -2, boxShadow: `0 8px 24px rgba(0,59,92,0.12)` }} whileTap={{ scale: 0.97 }}
              onClick={() => onChoice(choice)}
              style={{ background: '#fff', border: `1.5px solid #dde8f0`, borderRadius: 16, padding: '28px 20px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#003B5C', margin: '0 0 6px' }}>{label}</p>
              <p style={{ fontSize: 12, color: '#7a94a8', margin: 0 }}>{sub}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Slot picker helpers ────────────────────────────────────────────────────
const fmt12 = (hour) => {
  const h = hour % 12 || 12;
  return `${h}:00 ${hour < 12 ? 'AM' : 'PM'}`;
};

const SlotGrid = ({ slots, selectedHour, onSelect, minHour = null, maxHour = null, label }) => {
  // Find the first occupied slot to show a boundary hint
  const blockedBoundary = maxHour;
  return (
    <div>
      <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-2">{label}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {slots.map((slot) => {
          const pastEnd     = maxHour !== null && slot.hour > maxHour;
          const forcedDisabled = slot.isPast
            || (minHour !== null && slot.hour <= minHour)
            || pastEnd;
          const disabled = slot.available === 0 || forcedDisabled;
          const active   = selectedHour === slot.hour;
          const isBoundary = maxHour !== null && slot.hour === maxHour + 1; // first blocked slot after max

          let tip = undefined;
          if (slot.isPast)          tip = 'This time has already passed';
          else if (pastEnd)         tip = 'Cannot book past an occupied time slot';
          else if (slot.available === 0) tip = 'Fully booked';

          return (
            <motion.button
              key={slot.hour}
              type="button"
              whileTap={{ scale: disabled ? 1 : 0.95 }}
              disabled={disabled}
              onClick={() => !disabled && onSelect(slot.hour)}
              title={tip}
              className={`py-1.5 rounded-lg text-xs font-mono border transition-all flex flex-col items-center gap-0.5 ${
                active
                  ? 'bg-teal text-dark-bg border-teal font-bold'
                  : slot.isPast
                    ? 'opacity-30 cursor-not-allowed border-dark-border text-text-muted bg-dark-surface'
                    : pastEnd
                      ? 'opacity-20 cursor-not-allowed border-status-rejected/30 text-status-rejected'
                      : disabled
                        ? 'opacity-25 cursor-not-allowed border-dark-border text-text-muted'
                        : 'border-dark-border text-text-secondary hover:border-teal hover:text-teal'
              }`}
            >
              <span>{fmt12(slot.hour)}</span>
              {slot.isPast && <span style={{ fontSize: 8, letterSpacing: 0.5, opacity: 0.7 }}>PAST</span>}
              {!slot.isPast && pastEnd && <span style={{ fontSize: 8, letterSpacing: 0.5, opacity: 0.7 }}>BOOKED</span>}
            </motion.button>
          );
        })}
      </div>
      {/* Explain the occupancy boundary */}
      {blockedBoundary !== null && (
        <p className="text-[10px] font-mono mt-2" style={{ color: '#e74c3c' }}>
          🔒 Equipment is occupied at {fmt12(blockedBoundary + 1)} — your booking must end by {fmt12(blockedBoundary)}.
        </p>
      )}
    </div>
  );
};

const EndSlotGrid = ({ equipmentId, endDate, selectedHour, onSelect, startDate, startHour }) => {
  const { data: endSlots = [], isFetching } = useQuery({
    queryKey: ['slots', equipmentId, endDate],
    queryFn: () =>
      api.get(`/equipment/${equipmentId}/availability?date=${endDate}`).then(r => r.data.data),
    enabled: !!endDate,
  });
  if (isFetching) return <div className="flex justify-center py-3"><LoadingSpinner /></div>;

  const sameDay = endDate === startDate;

  // Find the first occupied slot that would create a conflict.
  // For same-day: any booked slot AFTER startHour blocks that end time onward.
  // For a different end date: any booked slot from the beginning of that day.
  const minCheckHour = sameDay ? startHour : -1;
  const firstBlocked = endSlots.find(
    s => s.hour > minCheckHour && s.available === 0 && !s.isPast
  );
  // maxHour = the LAST valid end hour (booking can END at firstBlocked’s start
  // without overlapping, because conflict check uses strict inequality).
  // e.g. blocked at 11 → booking ending at 11:00 is fine, ending at 12:00 is not.
  // So maxHour = firstBlocked.hour - 1 + 1 = firstBlocked.hour
  // Actually: end=H means booking ends at H:00. Conflict with slot H (H:00–H+1:00)
  // requires slot.start < end AND slot.end > start. slot.start(H:00) < end(H:00) = FALSE.
  // So end=firstBlocked.hour is still VALID. end=firstBlocked.hour+1 is NOT.
  const maxHour = firstBlocked ? firstBlocked.hour : null;

  return (
    <SlotGrid
      slots={endSlots}
      selectedHour={selectedHour}
      onSelect={onSelect}
      minHour={sameDay ? startHour : null}
      maxHour={maxHour}
      label="End Time"
    />
  );
};

// ─── Step 3: Booking details ──────────────────────────────────────────────────────
const DetailsStep = ({ equipment, bookingData, setBookingData }) => {
  const { user } = useAuth();
  const pic = equipment.personInCharge;

  // Pre-fill name and email from registered account on first render
  useEffect(() => {
    if (user && !bookingData.fullName && !bookingData.email) {
      setBookingData(d => ({
        ...d,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
      }));
    }
  }, [user]);
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: slots = [], isFetching: slotsLoading } = useQuery({
    queryKey: ['slots', equipment.id, bookingData.startDate],
    queryFn: () =>
      api.get(`/equipment/${equipment.id}/availability?date=${bookingData.startDate}`)
         .then(r => r.data.data),
    enabled: !!bookingData.startDate,
  });

  const handleDateChange = (e) => {
    setBookingData(d => ({
      ...d,
      startDate: e.target.value,
      startHour: null, endHour: null,
      startDateTime: '', endDateTime: '',
    }));
  };

  // Convert the selected Eastern Time hour to a UTC ISO string for storage.
  const handleStartHour = (hour) => {
    const dt = etHourToUTCISO(bookingData.startDate, hour);
    setBookingData(d => ({ ...d, startHour: hour, endHour: null, startDateTime: dt, endDateTime: '' }));
  };

  const handleEndHour = (hour) => {
    const date = bookingData.endDate || bookingData.startDate;
    const dt = etHourToUTCISO(date, hour);
    setBookingData(d => ({ ...d, endHour: hour, endDateTime: dt }));
  };

  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: 12, fontSize: 14,
    border: '1.5px solid #c8d8e8', background: '#fff', color: '#1a2e44',
    fontFamily: 'Inter, system-ui, sans-serif', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };
  const labelStyle = {
    display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase', color: '#003B5C',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Equipment banner */}
      <div style={{ background: 'linear-gradient(135deg,#003B5C,#00B5BD)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{equipment.icon}</div>
        <div>
          <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: 0 }}>{equipment.name}</h3>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, margin: '4px 0 0' }}>{equipment.description}</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: '28px', boxShadow: '0 4px 24px rgba(0,59,92,0.08)', border: '1.5px solid #dde8f0' }}>

        {/* Section: Your Info */}
        <p style={{ fontSize: 11, fontWeight: 800, color: '#00B5BD', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, paddingBottom: 8, borderBottom: '1.5px solid #EEF4FB' }}>Your Information</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              value={bookingData.fullName || ''}
              onChange={(e) => setBookingData(d => ({ ...d, fullName: e.target.value }))}
              style={inputStyle}
              placeholder="e.g. John Doe"
              onFocus={e => { e.target.style.borderColor='#00B5BD'; e.target.style.boxShadow='0 0 0 3px rgba(0,181,189,0.12)'; }}
              onBlur={e => { e.target.style.borderColor='#c8d8e8'; e.target.style.boxShadow='none'; }}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={bookingData.email || ''}
              onChange={(e) => setBookingData(d => ({ ...d, email: e.target.value }))}
              style={inputStyle}
              placeholder="you@university.edu"
              onFocus={e => { e.target.style.borderColor='#00B5BD'; e.target.style.boxShadow='0 0 0 3px rgba(0,181,189,0.12)'; }}
              onBlur={e => { e.target.style.borderColor='#c8d8e8'; e.target.style.boxShadow='none'; }}
            />
          </div>
        </div>

        {/* Section: Schedule */}
        <p style={{ fontSize: 11, fontWeight: 800, color: '#00B5BD', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, paddingBottom: 8, borderBottom: '1.5px solid #EEF4FB' }}>Schedule</p>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Select Date</label>
          <input
            type="date"
            min={today}
            value={bookingData.startDate || ''}
            onChange={handleDateChange}
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor='#00B5BD'; e.target.style.boxShadow='0 0 0 3px rgba(0,181,189,0.12)'; }}
            onBlur={e => { e.target.style.borderColor='#c8d8e8'; e.target.style.boxShadow='none'; }}
          />
        </div>

        {/* Time slots */}
        {bookingData.startDate && (
          slotsLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : slots.every(s => s.available === 0 || s.isPast) ? (
            <div className="px-4 py-4 rounded-lg text-center" style={{ background: '#fff3f3', border: '1.5px solid #e74c3c33' }}>
              <p className="text-sm font-bold" style={{ color: '#e74c3c' }}>
                {slots.every(s => s.isPast) ? '⏰ All slots for today have passed' : '🔒 No slots available on this date'}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {slots.every(s => s.isPast)
                  ? 'Please select a future date to continue your booking.'
                  : 'This equipment is fully booked. Please select a different date.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <SlotGrid
                slots={slots}
                selectedHour={bookingData.startHour}
                onSelect={handleStartHour}
                label="Start Time"
              />
            </div>
          )
        )}

        {/* End date + time */}
        {bookingData.startHour !== null && bookingData.startHour !== undefined && (
          <>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                min={bookingData.startDate}
                value={bookingData.endDate || bookingData.startDate}
                onChange={(e) =>
                  setBookingData(d => ({ ...d, endDate: e.target.value, endHour: null, endDateTime: '' }))
                }
                className="w-full"
              />
            </div>
            <EndSlotGrid
              equipmentId={equipment.id}
              endDate={bookingData.endDate || bookingData.startDate}
              selectedHour={bookingData.endHour}
              onSelect={handleEndHour}
              startDate={bookingData.startDate}
              startHour={bookingData.startHour}
            />
          </>
        )}

        {/* Schedule summary — shown in Eastern Time */}
        {bookingData.startHour !== null && bookingData.startHour !== undefined && bookingData.endHour && (
          <div className="px-4 py-3 rounded-lg bg-teal/10 border border-teal/30">
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-1">Schedule (Eastern Time)</p>
            <p className="text-sm font-mono font-bold text-teal">
              {bookingData.startDateTime ? formatTimeET(bookingData.startDateTime) : fmt12(bookingData.startHour)}
              {' → '}
              {bookingData.endDateTime ? formatTimeET(bookingData.endDateTime) : fmt12(bookingData.endHour)}
              {bookingData.startDateTime ? ` · ${formatMonthDayET(bookingData.startDateTime)}` : ''}
            </p>
          </div>
        )}

        {/* Experiment description */}
        <div style={{ marginTop: 4 }}>
          <label style={labelStyle}>Experiment Description</label>
          <textarea
            rows={4}
            placeholder="e.g. Measuring tensile strength of polymer samples..."
            value={bookingData.experimentDescription || ''}
            onChange={(e) => setBookingData(d => ({ ...d, experimentDescription: e.target.value }))}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
            onFocus={e => { e.target.style.borderColor='#00B5BD'; e.target.style.boxShadow='0 0 0 3px rgba(0,181,189,0.12)'; }}
            onBlur={e => { e.target.style.borderColor='#c8d8e8'; e.target.style.boxShadow='none'; }}
          />
        </div>

        {/* Person in charge */}
        {pic && (
          <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 12, background: '#f0fffe', border: '1.5px solid #b2e8ea', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#00B5BD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
              {pic.firstName[0]}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#003B5C', margin: 0 }}>{pic.firstName} {pic.lastName}</p>
              <p style={{ fontSize: 11, color: '#00B5BD', margin: '2px 0 0' }}>Supervisor · {equipment.name}</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, background: '#00B5BD', color: '#fff', borderRadius: 20, padding: '3px 10px', letterSpacing: 1, textTransform: 'uppercase' }}>Assigned</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Step 4: Confirmation ─────────────────────────────────────────────────────────────────
const ConfirmStep = ({ equipment, bookingData, user, onRefresh }) => {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const isVerified = user?.isEmailVerified;

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: user?.email });
      setResent(true);
      toast.success('Verification email sent!');
    } catch {
      toast.error('Could not resend. Try the refresh button after verifying.');
    } finally {
      setResending(false);
    }
  };

  const start = bookingData.startDateTime ? new Date(bookingData.startDateTime) : null;
  const end   = bookingData.endDateTime   ? new Date(bookingData.endDateTime)   : null;
  const sameDay = start && end && isSameDayET(start, end);
  const durationHrs = start && end ? Math.round((end - start) / 36e5) : null;

  return (
    <div className="max-w-2xl mx-auto">

      {/* Email verification warning */}
      {!isVerified && (
        <div style={{ background: '#fff8f0', border: '1.5px solid #f39c1244', borderRadius: 16, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20 }}>✉️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, color: '#e67e22', fontSize: 13, margin: '0 0 4px' }}>Email verification required</p>
            <p style={{ fontSize: 12, color: '#7a94a8', margin: '0 0 12px' }}>Verify your email before confirming. Check your inbox for the link.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleResend} disabled={resending || resent}
                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 20, border: '1.5px solid #00B5BD', background: '#fff', color: '#00B5BD', cursor: 'pointer', fontWeight: 600 }}>
                {resent ? '✅ Sent' : resending ? 'Sending…' : 'Resend Email'}
              </button>
              <button onClick={onRefresh}
                style={{ fontSize: 12, padding: '7px 14px', borderRadius: 20, border: '1.5px solid #dde8f0', background: '#fff', color: '#4a6278', cursor: 'pointer', fontWeight: 600 }}>
                🔄 I've verified
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Equipment header card ── */}
      <div style={{
        background: 'linear-gradient(135deg,#003B5C,#00B5BD)',
        borderRadius: 20, padding: '22px 24px', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, flexShrink: 0,
        }}>{equipment.icon}</div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', margin: '0 0 3px' }}>Equipment Reserved</p>
          <h3 style={{ color: '#fff', fontWeight: 900, fontSize: 17, margin: 0, lineHeight: 1.2 }}>{equipment.name}</h3>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, margin: '3px 0 0' }}>{equipment.description}</p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, background: '#d29922', color: '#fff', borderRadius: 20, padding: '4px 12px', letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>Pending</span>
      </div>

      {/* ── Time block — the most important info ── */}
      {start && end && (
        <div style={{
          background: '#fff', borderRadius: 20, padding: '20px 24px',
          boxShadow: '0 4px 24px rgba(0,59,92,0.08)', border: '2px solid #00B5BD22',
          marginBottom: 14,
        }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#00B5BD', letterSpacing: 2.5, textTransform: 'uppercase', margin: '0 0 14px' }}>📅 Booking Schedule</p>

          {/* Start → End visual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            {/* Start */}
            <div style={{ flex: 1, background: '#f0fffe', borderRadius: 14, padding: '12px 14px', border: '1.5px solid #b2e8ea' }}>
              <p style={{ fontSize: 9, color: '#00B5BD', fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 4px' }}>Start</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: '#003B5C', margin: '0 0 2px', lineHeight: 1 }}>
                {formatTimeET(start)}
              </p>
              <p style={{ fontSize: 11, color: '#7a94a8', margin: 0 }}>{formatDateET(start)}</p>
            </div>

            {/* Arrow + duration */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 18, color: '#00B5BD' }}>→</span>
              {durationHrs !== null && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#00B5BD', background: '#e0f7f4', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                  {durationHrs}h
                </span>
              )}
            </div>

            {/* Finish */}
            <div style={{ flex: 1, background: '#f8f0ff', borderRadius: 14, padding: '12px 14px', border: '1.5px solid #ddb2ea' }}>
              <p style={{ fontSize: 9, color: '#8e44ad', fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 4px' }}>Finish</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: '#003B5C', margin: '0 0 2px', lineHeight: 1 }}>
                {formatTimeET(end)}
              </p>
              <p style={{ fontSize: 11, color: '#7a94a8', margin: 0 }}>
                {sameDay ? 'Same day' : formatDateET(end)}
              </p>
            </div>
          </div>

          {/* Duration summary bar */}
          {durationHrs !== null && (
            <div style={{ background: '#EEF4FB', borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>⏱</span>
              <span style={{ fontSize: 12, color: '#003B5C', fontWeight: 700 }}>
                Total duration: <strong style={{ color: '#00B5BD' }}>{durationHrs} hour{durationHrs !== 1 ? 's' : ''}</strong>
                {!sameDay && ' (multi-day)'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Student + experiment details ── */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 4px 24px rgba(0,59,92,0.08)', border: '1.5px solid #dde8f0', marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: '#003B5C', letterSpacing: 2.5, textTransform: 'uppercase', margin: '0 0 14px' }}>👤 Booked By</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: bookingData.experimentDescription ? 14 : 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#003B5C,#00B5BD)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
            {(bookingData.fullName || user?.firstName || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#003B5C', margin: 0 }}>{bookingData.fullName || `${user?.firstName} ${user?.lastName}`}</p>
            <p style={{ fontSize: 12, color: '#7a94a8', margin: '2px 0 0', wordBreak: 'break-all' }}>{bookingData.email || user?.email}</p>
          </div>
        </div>

        {bookingData.experimentDescription && (
          <div style={{ background: '#f8fbff', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #e8f0fb' }}>
            <p style={{ fontSize: 9, color: '#7a94a8', fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 6px' }}>🔬 Experiment</p>
            <p style={{ fontSize: 13, color: '#1a2e44', margin: 0, lineHeight: 1.6 }}>{bookingData.experimentDescription}</p>
          </div>
        )}
      </div>

      {/* ── Supervisor ── */}
      {equipment.personInCharge && (
        <div style={{ background: '#fff', borderRadius: 20, padding: '16px 20px', boxShadow: '0 4px 24px rgba(0,59,92,0.08)', border: '1.5px solid #dde8f0', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#00B5BD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
            {equipment.personInCharge.firstName[0]}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 9, color: '#00B5BD', fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 2px' }}>Supervisor</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#003B5C', margin: 0 }}>
              {equipment.personInCharge.firstName} {equipment.personInCharge.lastName}
            </p>
            <p style={{ fontSize: 11, color: '#7a94a8', margin: '2px 0 0' }}>Will review and approve your booking</p>
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, background: '#00B5BD', color: '#fff', borderRadius: 20, padding: '4px 12px', letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>Assigned</span>
        </div>
      )}

      {/* ── Status notice ── */}
      <div style={{ padding: '14px 18px', borderRadius: 14, background: '#fffbf0', border: '1.5px solid #f39c1244', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>⏳</span>
        <p style={{ fontSize: 12, color: '#7a94a8', margin: 0, lineHeight: 1.7 }}>
          Your booking is <strong style={{ color: '#d29922' }}>Pending</strong> — waiting for supervisor approval.
          You'll receive an email at <strong style={{ color: '#003B5C' }}>{bookingData.email || user?.email}</strong> once it's reviewed.
        </p>
      </div>
    </div>
  );
};

// ─── Main BookingFlow page ────────────────────────────────────────────────────
const BookingFlow = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [hasExperience, setHasExperience] = useState(null);
  const [bookingData, setBookingData] = useState({
    fullName: '', email: '',
    startDate: '', startHour: null, startDateTime: '',
    endHour: null, endDateTime: '',
    experimentDescription: '', notes: '',
  });

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.get('/equipment').then(r => r.data.data),
    refetchInterval: 60000,        // re-check availability every 60 seconds
    refetchIntervalInBackground: true,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (hasExperience === false) {
        return api.post('/training', {
          equipmentId: selectedEquipment.id,
          scheduledAt: new Date(bookingData.startDateTime).toISOString(),
          notes: bookingData.experimentDescription,
        });
      } else {
        return api.post('/reservations', {
          equipmentId: selectedEquipment.id,
          startTime: new Date(bookingData.startDateTime).toISOString(),
          endTime: new Date(bookingData.endDateTime).toISOString(),
          experimentDescription: bookingData.experimentDescription,
          bookerEmail: bookingData.email || null,
          notes: bookingData.notes,
          isFirstTime: false,
          // personInChargeId intentionally omitted — backend assigns from equipment
        });
      }
    },
    onSuccess: () => {
      // Immediate confirmation sound for the student
      playNotificationSound('BOOKING_CONFIRMED');
      toast.success(t('booking.bookingSuccess'));
      navigate('/book');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t('common.error'));
    },
  });

  const handleExperienceChoice = (experienced) => {
    setHasExperience(experienced);
    setStep(3);
  };

  const handleSelectEquipment = (eq) => {
    if (selectedEquipment?.id === eq.id) {
      setSelectedEquipment(null);
    } else {
      setSelectedEquipment(eq);
    }
  };

  const canContinue = () => {
    if (step === 1) return !!selectedEquipment;
    if (step === 3) {
      if (!bookingData.startDateTime || !bookingData.endDateTime) return false;
      if (!bookingData.experimentDescription?.trim()) return false;
      return true;
    }
    return true;
  };

  const eqList = equipment || [];
  const availableCount = eqList.filter(e => !e.maintenanceMode && !e.currentUser).length;
  const inUseCount    = eqList.filter(e => !!e.currentUser).length;
  const maintCount    = eqList.filter(e => e.maintenanceMode).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#EEF4FB', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ═══ SUPER BANNER ═══════════════════════════════════════════════════ */}
      {step === 1 ? (
        <div key="super-banner" style={{ background: 'linear-gradient(135deg,#001f3f 0%,#003B5C 45%,#00B5BD 100%)', padding: '52px 24px 40px', position: 'relative', overflow: 'hidden' }}>
          {/* Animated decorative circles */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position:'absolute', top:-80, right:-80, width:340, height:340, borderRadius:'50%', background:'rgba(0,181,189,1)', pointerEvents:'none' }}
          />
          <motion.div
            animate={{ y: [0, -24, 0], opacity: [0.06, 0.14, 0.06] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            style={{ position:'absolute', bottom:-60, left:'25%', width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,1)', pointerEvents:'none' }}
          />
          <motion.div
            animate={{ scale: [1, 1.25, 1], x: [0, 12, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            style={{ position:'absolute', top:'20%', left:-50, width:180, height:180, borderRadius:'50%', background:'rgba(0,181,189,1)', opacity: 0.1, pointerEvents:'none' }}
          />

          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            {/* Pill badge */}
            <motion.div
              key="pill"
              initial={{ opacity:0, y:-14 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration: 0.5 }}
              style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.12)', backdropFilter:'blur(10px)', borderRadius:30, padding:'6px 18px', marginBottom:20, border:'1px solid rgba(255,255,255,0.2)' }}>
              <motion.span
                animate={{ opacity:[1,0.4,1], boxShadow:['0 0 6px #7af5c8','0 0 16px #7af5c8','0 0 6px #7af5c8'] }}
                transition={{ duration:2, repeat:Infinity }}
                style={{ width:8, height:8, borderRadius:'50%', background:'#7af5c8', display:'inline-block' }}
              />
              <span style={{ fontSize:11, color:'#fff', fontWeight:700, letterSpacing:2.5, textTransform:'uppercase' }}>REGAL Laboratory</span>
            </motion.div>

            <motion.h1 initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.08 }}
              style={{ color:'#fff', fontSize:'clamp(28px,4.5vw,52px)', fontWeight:900, margin:'0 0 12px', letterSpacing:-1, lineHeight:1.1 }}>
              Book Equipment
            </motion.h1>
            <motion.p initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.16 }}
              style={{ color:'rgba(255,255,255,0.72)', fontSize:16, margin:'0 0 36px', maxWidth:560 }}>
              Reserve state-of-the-art laboratory instruments &middot; Instant booking &middot; Supervisor approval
            </motion.p>

            {/* Live stat pills */}
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.24 }}
              style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {[
                { icon:'🔬', label:'Total', value: eqList.length, glow: false },
                { icon:'✅', label:'Available', value: availableCount, glow: true, glowColor:'#7af5c8' },
                { icon:'⏳', label:'In Use', value: inUseCount, glow: false },
                { icon:'🔧', label:'Maintenance', value: maintCount, glow: false },
              ].map((s, i) => (
                <motion.div key={s.label}
                  initial={{ opacity:0, y:10 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay: 0.28 + i * 0.07 }}
                  style={{ background:'rgba(255,255,255,0.1)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:14, padding:'12px 22px', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:20 }}>{s.icon}</span>
                  <div>
                    <p style={{ color: s.glow ? s.glowColor : '#fff', fontSize:24, fontWeight:900, margin:0, lineHeight:1 }}>{s.value}</p>
                    <p style={{ color:'rgba(255,255,255,0.6)', fontSize:10, margin:'3px 0 0', letterSpacing:1.5, textTransform:'uppercase', fontWeight:700 }}>{s.label}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      ) : (
        /* Compact banner for steps 2-4 */
        <div style={{ background:'linear-gradient(135deg,#003B5C,#00B5BD)', padding:'22px 24px' }}>
          <div style={{ maxWidth:720, margin:'0 auto', display:'flex', alignItems:'center', gap:16 }}>
            <button onClick={() => setStep(1)}
              style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:10, padding:'8px 14px', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              ← Equipment
            </button>
            <div>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:11, fontWeight:700, letterSpacing:3, textTransform:'uppercase', margin:0 }}>REGAL Laboratory</p>
              <h1 style={{ color:'#fff', fontSize:18, fontWeight:900, margin:0 }}>Equipment Reservation</h1>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONTENT ════════════════════════════════════════════════════════ */}
      <div style={{ flex:1, maxWidth: step === 1 ? 1100 : 720, margin:'0 auto', width:'100%', padding: step === 1 ? '28px 24px' : '28px 24px' }}>

        {/* Step indicator (hidden on step 1 – banner does the job) */}
        {step > 1 && <StepIndicator currentStep={step} />}

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }} transition={{ duration:0.2 }}>

            {/* Step 1: Equipment selection */}
            {step === 1 && (
              <div>
                {/* Filter bar */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
                  <p style={{ fontSize:12, fontWeight:800, color:'#00B5BD', letterSpacing:2, textTransform:'uppercase', margin:0 }}>Select Equipment to Book</p>
                  {selectedEquipment && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, background:'#fff', borderRadius:12, padding:'8px 16px', border:'1.5px solid #00B5BD', boxShadow:'0 2px 8px rgba(0,181,189,0.15)' }}>
                      <span style={{ fontSize:18 }}>{selectedEquipment.icon}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:'#003B5C' }}>{selectedEquipment.name}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:'#00B5BD', background:'#e0f7f4', borderRadius:8, padding:'2px 8px' }}>Selected</span>
                    </div>
                  )}
                </div>

                {isLoading ? (
                  <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}><LoadingSpinner size="lg" /></div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:20 }}>
                    {eqList.map(eq => (
                      <EquipmentCard key={eq.id} equipment={eq} selected={selectedEquipment?.id === eq.id} onSelect={handleSelectEquipment} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && selectedEquipment && <ExperienceStep equipment={selectedEquipment} onChoice={handleExperienceChoice} />}
            {/* Step 3 */}
            {step === 3 && selectedEquipment && <DetailsStep equipment={selectedEquipment} bookingData={bookingData} setBookingData={setBookingData} />}
            {/* Step 4 */}
            {step === 4 && selectedEquipment && <ConfirmStep equipment={selectedEquipment} bookingData={bookingData} user={user} onRefresh={refreshUser} />}
          </motion.div>
        </AnimatePresence>

        {/* ── Navigation ── */}
        <div style={{ marginTop:28 }}>
          {step === 1 ? (
            <motion.button whileTap={{ scale:0.97 }} onClick={() => setStep(2)} disabled={!selectedEquipment}
              style={{
                width:'100%', padding:'17px', borderRadius:32, fontWeight:800, fontSize:16,
                border:'none', cursor: selectedEquipment ? 'pointer' : 'not-allowed',
                background: selectedEquipment
                  ? 'linear-gradient(135deg,#00B5BD,#007b82)'
                  : '#c8d8e8',
                color:'#fff',
                boxShadow: selectedEquipment ? '0 6px 20px rgba(0,181,189,0.4)' : 'none',
                transition:'all 0.3s',
              }}>
              {selectedEquipment ? `Continue with ${selectedEquipment.name} →` : 'Select a machine to continue'}
            </motion.button>
          ) : (
            <div style={{ display:'flex', justifyContent:'space-between', gap:16 }}>
              <button onClick={() => setStep(s => Math.max(1, s-1))}
                style={{ padding:'12px 28px', borderRadius:28, border:'2px solid #dde8f0', background:'#fff', color:'#4a6278', fontWeight:700, cursor:'pointer', fontSize:14 }}>
                ← {t('common.back')}
              </button>
              {step < 4 ? (
                step !== 2 && (
                  <button onClick={() => setStep(s => s+1)} disabled={!canContinue()}
                    style={{ padding:'12px 32px', borderRadius:28, border:'none', fontWeight:800, fontSize:14, cursor: canContinue() ? 'pointer' : 'not-allowed', background: canContinue() ? 'linear-gradient(135deg,#00B5BD,#007b82)' : '#c8d8e8', color:'#fff', transition:'all 0.3s' }}>
                    {t('common.continue')} →
                  </button>
                )
              ) : (
                <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || !user?.isEmailVerified}
                  style={{ padding:'12px 32px', borderRadius:28, border:'none', fontWeight:800, fontSize:14, display:'flex', alignItems:'center', gap:8, background:(!submitMutation.isPending && user?.isEmailVerified) ? 'linear-gradient(135deg,#00B5BD,#007b82)' : '#c8d8e8', color:'#fff', cursor:(!submitMutation.isPending && user?.isEmailVerified) ? 'pointer':'not-allowed', transition:'all 0.3s' }}>
                  {submitMutation.isPending ? <LoadingSpinner size="sm" /> : null}
                  {user?.isEmailVerified ? t('booking.confirmBooking') : 'Verify Email First'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ textAlign:'center', padding:'18px 24px', borderTop:'1px solid #dde8f0', background:'#fff', marginTop:24 }}>
        <p style={{ fontSize:11, color:'#9ab0c4', letterSpacing:2, textTransform:'uppercase', margin:0 }}>
          REGAL Laboratory · Equipment Reservation Portal · Secured
        </p>
      </footer>
    </div>
  );
};

export default BookingFlow;
