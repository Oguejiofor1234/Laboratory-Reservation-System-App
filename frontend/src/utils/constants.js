export const ROLES = {
  STUDENT: 'STUDENT',
  TECHNOLOGIST: 'TECHNOLOGIST',
  ADMIN: 'ADMIN',
};

export const RESERVATION_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
};

export const STATUS_COLORS = {
  PENDING: 'text-status-pending border-status-pending',
  CONFIRMED: 'text-status-confirmed border-status-confirmed',
  CANCELLED: 'text-status-cancelled border-status-cancelled',
  COMPLETED: 'text-teal border-teal',
  REJECTED: 'text-status-rejected border-status-rejected',
};

export const STATUS_BG = {
  PENDING: 'bg-yellow-900/20 text-status-pending',
  CONFIRMED: 'bg-green-900/20 text-status-confirmed',
  CANCELLED: 'bg-gray-800/50 text-text-secondary',
  COMPLETED: 'bg-teal/10 text-teal',
  REJECTED: 'bg-red-900/20 text-status-rejected',
};

export const BOOKING_STEPS = ['equipment', 'experience', 'details', 'confirm'];

export const LAB_HOURS = {
  open: 8,   // 8am
  close: 20, // 8pm
};

export const LANGUAGES = [
  { code: 'en', label: 'EN', fullLabel: 'English' },
  { code: 'fr', label: 'FR', fullLabel: 'Français' },
];
