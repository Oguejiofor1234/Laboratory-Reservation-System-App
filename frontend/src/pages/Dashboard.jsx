import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, GraduationCap, Plus, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { STATUS_BG } from '../utils/constants';

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  return (
    <span className={`status-badge ${STATUS_BG[status] || 'bg-gray-800 text-text-secondary'}`}>
      {t(`status.${status}`)}
    </span>
  );
};

// ─── Student Dashboard ────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-student'],
    queryFn: () => api.get('/dashboard/student').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/reservations/${id}/cancel`),
    onSuccess: () => {
      toast.success('Reservation cancelled');
      queryClient.invalidateQueries(['dashboard-student']);
    },
    onError: (err) => toast.error(err.response?.data?.message || t('common.error')),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const { upcoming = [], history = [], certifications = [], trainingSessions = [], stats = {} } = data || {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold font-mono text-text-primary">
          {t('dashboard.welcome', { name: user.firstName })}
        </h1>
        <p className="text-xs text-text-secondary font-mono mt-1">{t('app.lab')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: t('dashboard.stats.pending'), value: stats.pending || 0 },
          { label: t('dashboard.stats.certified'), value: stats.certifiedEquipment || 0 },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold font-mono text-teal">{s.value}</p>
            <p className="text-xs font-mono text-text-muted mt-1">{s.label}</p>
          </div>
        ))}
        <div className="card text-center col-span-2 sm:col-span-1">
          <Link to="/book" className="btn-primary text-xs inline-flex items-center gap-2">
            <Plus size={14} />
            {t('nav.book')}
          </Link>
        </div>
      </div>

      {/* Upcoming reservations */}
      <section>
        <p className="section-title">{t('dashboard.upcoming')}</p>
        {upcoming.length === 0 ? (
          <div className="card text-center text-text-muted text-xs font-mono py-8">{t('dashboard.noUpcoming')}</div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono font-bold text-text-primary text-sm">{r.equipment.icon} {r.equipment.name}</p>
                    <p className="text-xs text-text-secondary font-mono mt-1">
                      {format(new Date(r.startTime), 'PPp')} → {format(new Date(r.endTime), 'p')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <button
                      onClick={() => cancelMutation.mutate(r.id)}
                      className="text-xs font-mono text-status-rejected hover:underline"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Training sessions */}
      {trainingSessions.length > 0 && (
        <section>
          <p className="section-title">{t('dashboard.trainingSessions')}</p>
          <div className="space-y-3">
            {trainingSessions.map(s => (
              <div key={s.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-mono font-bold text-text-primary text-sm">{s.equipment.icon} {s.equipment.name}</p>
                  <p className="text-xs text-text-secondary font-mono">{format(new Date(s.scheduledAt), 'PPp')}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      <section>
        <p className="section-title">{t('dashboard.certifications')}</p>
        {certifications.length === 0 ? (
          <div className="card text-center text-text-muted text-xs font-mono py-8">{t('dashboard.noCertifications')}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {certifications.map(c => (
              <div key={c.id} className="card text-center border-teal/20">
                <p className="text-2xl mb-1">{c.equipment.icon}</p>
                <p className="font-mono text-xs font-bold text-text-primary">{c.equipment.name}</p>
                <p className="text-[10px] font-mono text-teal mt-1">
                  <GraduationCap size={10} className="inline mr-1" />
                  {t('equipment.certified')}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <p className="section-title">{t('dashboard.history')}</p>
        {history.length === 0 ? (
          <div className="card text-center text-text-muted text-xs font-mono py-8">{t('dashboard.noHistory')}</div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 bg-dark-surface border border-dark-border rounded-lg">
                <div>
                  <p className="text-xs font-mono font-bold text-text-primary">{r.equipment.icon} {r.equipment.name}</p>
                  <p className="text-[10px] font-mono text-text-muted">{format(new Date(r.startTime), 'PP')}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// ─── Technologist Dashboard ───────────────────────────────────────────────────
const TechDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-tech'],
    queryFn: () => api.get('/dashboard/tech').then(r => r.data.data),
    refetchInterval: 15000,
  });

  const reservationMutation = useMutation({
    mutationFn: ({ id, action, reason }) => api.patch(`/reservations/${id}/${action}`, { reason }),
    onSuccess: (_, vars) => {
      toast.success(`Reservation ${vars.action}ed`);
      queryClient.invalidateQueries(['dashboard-tech']);
    },
    onError: (err) => toast.error(err.response?.data?.message || t('common.error')),
  });

  const trainingMutation = useMutation({
    mutationFn: ({ id, action }) => api.patch(`/training/${id}/${action}`),
    onSuccess: (_, vars) => {
      toast.success(`Training ${vars.action}ed`);
      queryClient.invalidateQueries(['dashboard-tech']);
    },
    onError: (err) => toast.error(err.response?.data?.message || t('common.error')),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const { pendingReservations = [], pendingTraining = [], equipment = [], stats = {} } = data || {};

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold font-mono text-text-primary">
          {t('dashboard.welcome', { name: user.firstName })}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('dashboard.stats.pending'), value: stats.pendingCount || 0, color: 'text-status-pending' },
          { label: t('dashboard.stats.confirmed'), value: stats.confirmedToday || 0, color: 'text-status-confirmed' },
          { label: 'Training Pending', value: stats.pendingTrainingCount || 0, color: 'text-teal' },
          { label: t('dashboard.stats.thisWeek'), value: stats.totalReservationsWeek || 0, color: 'text-text-primary' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-xs font-mono text-text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending reservations */}
      <section>
        <p className="section-title">{t('dashboard.tech.pendingRequests')}</p>
        {pendingReservations.length === 0 ? (
          <div className="card text-center text-text-muted text-xs font-mono py-8">No pending requests</div>
        ) : (
          <div className="space-y-3">
            {pendingReservations.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-mono font-bold text-text-primary text-sm">
                      {r.equipment.icon} {r.equipment.name}
                    </p>
                    <p className="text-xs text-text-secondary font-mono">
                      {r.user.firstName} {r.user.lastName} · {r.user.email}
                    </p>
                    <p className="text-xs text-text-muted font-mono mt-1">
                      {format(new Date(r.startTime), 'PPp')} → {format(new Date(r.endTime), 'p')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => reservationMutation.mutate({ id: r.id, action: 'confirm' })}
                      className="flex items-center gap-1 btn-primary text-xs px-3 py-1.5"
                    >
                      <CheckCircle size={12} />
                      {t('dashboard.tech.confirm')}
                    </button>
                    <button
                      onClick={() => reservationMutation.mutate({ id: r.id, action: 'reject', reason: 'Rejected by technologist' })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono
                                 border border-status-rejected text-status-rejected hover:bg-status-rejected/10 transition-colors"
                    >
                      <XCircle size={12} />
                      {t('dashboard.tech.reject')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Pending training */}
      <section>
        <p className="section-title">{t('dashboard.tech.trainingRequests')}</p>
        {pendingTraining.length === 0 ? (
          <div className="card text-center text-text-muted text-xs font-mono py-8">No training requests</div>
        ) : (
          <div className="space-y-3">
            {pendingTraining.map(s => (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-mono font-bold text-text-primary text-sm">
                      {s.equipment.icon} {s.equipment.name}
                    </p>
                    <p className="text-xs text-text-secondary font-mono">
                      {s.student.firstName} {s.student.lastName} · {s.student.email}
                    </p>
                    <p className="text-xs text-text-muted font-mono">{format(new Date(s.scheduledAt), 'PPp')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => trainingMutation.mutate({ id: s.id, action: 'confirm' })}
                      className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                    >
                      <CheckCircle size={12} />
                      {t('dashboard.tech.confirm')}
                    </button>
                    <button
                      onClick={() => trainingMutation.mutate({ id: s.id, action: 'complete' })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono
                                 border border-teal text-teal hover:bg-teal/10 transition-colors"
                    >
                      <GraduationCap size={12} />
                      {t('dashboard.tech.complete')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Equipment overview */}
      <section>
        <p className="section-title">{t('dashboard.tech.equipmentOverview')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {equipment.map(eq => (
            <div key={eq.id} className={`card ${eq.maintenanceMode ? 'border-status-pending/30' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{eq.icon}</span>
                {eq.maintenanceMode && <AlertTriangle size={12} className="text-status-pending" />}
              </div>
              <p className="font-mono text-xs font-bold text-text-primary">{eq.name}</p>
              <p className="text-[10px] font-mono text-teal mt-1">
                {eq.reservationsThisMonth} {t('dashboard.tech.utilization')}
              </p>
              <p className="text-[10px] font-mono text-text-muted">Active now: {eq.activeNow}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// ─── Dashboard router ─────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  return user?.role === 'STUDENT' ? <StudentDashboard /> : <TechDashboard />;
};

export default Dashboard;
