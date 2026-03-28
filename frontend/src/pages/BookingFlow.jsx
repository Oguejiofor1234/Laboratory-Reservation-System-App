import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addHours } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StepIndicator from '../components/booking/StepIndicator';
import EquipmentCard from '../components/booking/EquipmentCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

// ─── Step 2: Experience check ─────────────────────────────────────────────────
const ExperienceStep = ({ equipment, onChoice }) => {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl mx-auto">
      {/* Equipment summary card */}
      <div className="card flex items-center gap-4 mb-8">
        <div className="text-3xl">{equipment.icon}</div>
        <div>
          <h3 className="font-mono font-bold text-text-primary">{equipment.name}</h3>
          <p className="text-xs text-text-secondary font-mono">{equipment.description}</p>
        </div>
      </div>

      <h2 className="font-mono font-bold text-text-primary text-lg mb-2">{t('booking.experienceQuestion')}</h2>
      <p className="text-sm text-text-secondary font-mono mb-8">{t('booking.experienceSubtitle')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onChoice(true)}
          className="card text-center py-10 border-2 border-dark-border hover:border-teal hover:bg-teal/5 transition-all cursor-pointer"
        >
          <div className="text-3xl mb-3">✅</div>
          <p className="font-mono font-bold text-text-primary text-sm">{t('booking.yesExperience')}</p>
          <p className="text-xs text-text-secondary font-mono mt-1">{t('booking.yesExperienceSub')}</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onChoice(false)}
          className="card text-center py-10 border-2 border-dark-border hover:border-teal hover:bg-teal/5 transition-all cursor-pointer"
        >
          <div className="text-3xl mb-3">🎓</div>
          <p className="font-mono font-bold text-text-primary text-sm">{t('booking.noExperience')}</p>
          <p className="text-xs text-text-secondary font-mono mt-1">{t('booking.noExperienceSub')}</p>
        </motion.button>
      </div>
    </div>
  );
};

// ─── Step 3: Booking details ──────────────────────────────────────────────────
const DetailsStep = ({ equipment, isTraining, bookingData, setBookingData }) => {
  const { t } = useTranslation();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['availability', equipment.id, bookingData.date],
    queryFn: () => api.get(`/equipment/${equipment.id}/availability?date=${bookingData.date}`).then(r => r.data.data),
    enabled: !!bookingData.date && !isTraining,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card flex items-center gap-4 mb-6">
        <div className="text-3xl">{equipment.icon}</div>
        <div>
          <h3 className="font-mono font-bold text-text-primary">{equipment.name}</h3>
          <p className="text-xs text-text-secondary font-mono">{equipment.description}</p>
        </div>
      </div>

      <div className="card flex flex-col gap-5">
        {/* Date picker */}
        <div>
          <label className="label">{t('booking.selectDate')}</label>
          <input
            type="date"
            min={today}
            value={bookingData.date || ''}
            onChange={(e) => setBookingData(d => ({ ...d, date: e.target.value, startHour: null }))}
            className="w-full"
          />
        </div>

        {/* Time slot picker (for experienced users) */}
        {!isTraining && bookingData.date && (
          <div>
            <label className="label">{t('booking.selectTime')}</label>
            {slotsLoading ? (
              <div className="flex justify-center py-4"><LoadingSpinner /></div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {(slots || []).map((slot) => (
                  <motion.button
                    key={slot.hour}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    disabled={slot.available === 0}
                    onClick={() => setBookingData(d => ({ ...d, startHour: slot.hour }))}
                    className={`py-2 px-1 rounded-lg text-xs font-mono border transition-all ${
                      bookingData.startHour === slot.hour
                        ? 'bg-teal text-dark-bg border-teal font-bold'
                        : slot.available === 0
                          ? 'opacity-30 cursor-not-allowed border-dark-border text-text-muted'
                          : 'border-dark-border text-text-secondary hover:border-teal hover:text-teal'
                    }`}
                  >
                    {`${slot.hour}:00`}
                    <div className={`text-[9px] mt-0.5 ${slot.available === 0 ? 'text-status-rejected' : 'text-teal'}`}>
                      {slot.available}/{slot.totalUnits}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Duration (for experienced bookings) */}
        {!isTraining && bookingData.startHour !== null && bookingData.startHour !== undefined && (
          <div>
            <label className="label">Duration (hours)</label>
            <select
              value={bookingData.duration || 1}
              onChange={(e) => setBookingData(d => ({ ...d, duration: parseInt(e.target.value) }))}
              className="w-full"
            >
              {[1, 2, 3, 4].map(h => (
                <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="label">{t('booking.notes')}</label>
          <textarea
            rows={3}
            placeholder={t('booking.notesPlaceholder')}
            value={bookingData.notes || ''}
            onChange={(e) => setBookingData(d => ({ ...d, notes: e.target.value }))}
            className="w-full resize-none"
          />
        </div>
      </div>
    </div>
  );
};

// ─── Step 4: Confirmation ─────────────────────────────────────────────────────
const ConfirmStep = ({ equipment, bookingData, isTraining }) => {
  const { t } = useTranslation();
  const startTime = bookingData.date && bookingData.startHour !== undefined
    ? new Date(`${bookingData.date}T${String(bookingData.startHour).padStart(2, '0')}:00:00`)
    : null;
  const endTime = startTime ? addHours(startTime, bookingData.duration || 1) : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <p className="section-title">{t('booking.bookingDetails')}</p>
        <div className="space-y-3">
          <Row label={t('booking.equipment')} value={`${equipment.icon} ${equipment.name}`} />
          {startTime && <Row label={t('booking.startTime')} value={format(startTime, 'PPp')} />}
          {endTime && <Row label={t('booking.endTime')} value={format(endTime, 'PPp')} />}
          <Row label={t('booking.status')} value={t('status.PENDING')} highlight />
          {bookingData.notes && <Row label={t('booking.notes')} value={bookingData.notes} />}
        </div>
      </div>
      {isTraining && (
        <div className="card mt-4 border-teal/30">
          <p className="text-xs font-mono text-teal">🎓 A training session request will be sent to the technologist.</p>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, highlight }) => (
  <div className="flex justify-between py-2 border-b border-dark-border/50 last:border-0">
    <span className="text-xs font-mono text-text-muted">{label}</span>
    <span className={`text-xs font-mono ${highlight ? 'text-status-pending font-bold' : 'text-text-primary'}`}>{value}</span>
  </div>
);

// ─── Main BookingFlow page ────────────────────────────────────────────────────
const BookingFlow = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [hasExperience, setHasExperience] = useState(null);
  const [bookingData, setBookingData] = useState({ date: '', startHour: null, duration: 1, notes: '' });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.get('/equipment').then(r => r.data.data),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (hasExperience === false) {
        // Request training session
        const scheduledAt = new Date(`${bookingData.date}T09:00:00`).toISOString();
        return api.post('/training', {
          equipmentId: selectedEquipment.id,
          scheduledAt,
          notes: bookingData.notes,
        });
      } else {
        // Book directly
        const startTime = new Date(`${bookingData.date}T${String(bookingData.startHour).padStart(2, '0')}:00:00`).toISOString();
        const endTime = addHours(new Date(startTime), bookingData.duration || 1).toISOString();
        return api.post('/reservations', {
          equipmentId: selectedEquipment.id,
          startTime,
          endTime,
          notes: bookingData.notes,
          isFirstTime: false,
        });
      }
    },
    onSuccess: () => {
      toast.success(t('booking.bookingSuccess'));
      navigate('/dashboard');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t('common.error'));
    },
  });

  const handleExperienceChoice = (experienced) => {
    setHasExperience(experienced);
    setStep(3);
  };

  const canContinue = () => {
    if (step === 1) return !!selectedEquipment;
    if (step === 3) {
      if (!bookingData.date) return false;
      if (hasExperience && bookingData.startHour === null) return false;
      return true;
    }
    return true;
  };

  const filtered = (equipment || []).filter(eq => {
    const matchName = eq.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || eq.type === typeFilter;
    return matchName && matchType;
  });

  const types = ['all', ...new Set((equipment || []).map(e => e.type))];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold font-mono text-text-primary">{t('booking.title')}</h1>
      </div>

      <StepIndicator currentStep={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: Equipment selection */}
          {step === 1 && (
            <div>
              <p className="section-title mb-4">{t('equipment.title')}</p>

              {/* Search + filter */}
              <div className="flex gap-3 mb-5 flex-wrap">
                <input
                  type="text"
                  placeholder={t('equipment.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 min-w-[180px]"
                />
                <div className="flex gap-2 flex-wrap">
                  {types.map(type => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                        typeFilter === type
                          ? 'bg-teal text-dark-bg border-teal'
                          : 'border-dark-border text-text-secondary hover:border-teal'
                      }`}
                    >
                      {type === 'all' ? t('equipment.filterAll') : type}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filtered.map(eq => (
                    <EquipmentCard
                      key={eq.id}
                      equipment={eq}
                      selected={selectedEquipment?.id === eq.id}
                      onSelect={setSelectedEquipment}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Experience check */}
          {step === 2 && selectedEquipment && (
            <ExperienceStep equipment={selectedEquipment} onChoice={handleExperienceChoice} />
          )}

          {/* Step 3: Details */}
          {step === 3 && selectedEquipment && (
            <DetailsStep
              equipment={selectedEquipment}
              isTraining={hasExperience === false}
              bookingData={bookingData}
              setBookingData={setBookingData}
            />
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && selectedEquipment && (
            <ConfirmStep
              equipment={selectedEquipment}
              bookingData={bookingData}
              isTraining={hasExperience === false}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="btn-secondary"
        >
          {t('common.back')}
        </button>

        {step < 4 ? (
          step !== 2 && (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canContinue()}
              className="btn-primary"
            >
              {t('common.continue')}
            </button>
          )
        ) : (
          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {submitMutation.isPending ? <LoadingSpinner size="sm" /> : null}
            {t('booking.confirmBooking')}
          </button>
        )}
      </div>
    </div>
  );
};

export default BookingFlow;
