const prisma = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Check if adding a new reservation would exceed equipment unit capacity.
 * Counts overlapping PENDING or CONFIRMED reservations for the same equipment.
 *
 * @param {string} equipmentId
 * @param {Date}   startTime
 * @param {Date}   endTime
 * @param {string} [excludeReservationId]  - skip this ID (for updates)
 * @throws AppError(409) if all units are booked
 */
const checkConflict = async (equipmentId, startTime, endTime, excludeReservationId = null) => {
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { totalUnits: true, name: true, maintenanceMode: true },
  });

  if (!equipment) throw new AppError('Equipment not found', 404);

  if (equipment.maintenanceMode) {
    throw new AppError(`${equipment.name} is currently under maintenance and cannot be booked`, 409);
  }

  const overlapping = await prisma.reservation.count({
    where: {
      equipmentId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
  });

  if (overlapping >= equipment.totalUnits) {
    throw new AppError(
      `All ${equipment.totalUnits} unit(s) of ${equipment.name} are already booked for this time slot`,
      409
    );
  }

  return { available: equipment.totalUnits - overlapping, totalUnits: equipment.totalUnits };
};

// ─── Eastern Canadian Time helpers ───────────────────────────────────────────────────────────
// All slot hours represent Eastern Time (America/Toronto).
// We calculate how many hours to add to an ET hour to get UTC,
// using the Intl API which handles DST automatically.
const getETtoUTCOffset = (dateStr) => {
  const sampleUTC = new Date(dateStr + 'T12:00:00Z');
  const etNoonHour = parseInt(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', hour12: false })
      .format(sampleUTC),
    10
  );
  return 12 - etNoonHour; // EDT: 4, EST: 5
};

// Convert Eastern Time hour on dateStr to a UTC Date
const etHourToUTC = (dateStr, etHour) => {
  const offset = getETtoUTCOffset(dateStr);
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCHours(etHour + offset, 0, 0, 0);
  return d;
};

/**
 * Get availability info for an equipment item on a given date.
 * Returns hourly slots 8am–07pm Eastern Time with available unit counts.
 */
const getAvailabilityForDate = async (equipmentId, date) => {
  const dateStr = new Date(date).toISOString().split('T')[0];
  const offset  = getETtoUTCOffset(dateStr);

  // Day boundaries in UTC (midnight–midnight Eastern)
  const dayStart = new Date(dateStr + 'T00:00:00Z');
  dayStart.setUTCHours(0 + offset, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { totalUnits: true, maintenanceMode: true },
  });
  if (!equipment) throw new AppError('Equipment not found', 404);

  const reservations = await prisma.reservation.findMany({
    where: {
      equipmentId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startTime: { lt: dayEnd },
      endTime:   { gt: dayStart },
    },
    select: { startTime: true, endTime: true },
  });

  const now = new Date(); // current UTC time

  // Build hourly slots 8am–07pm Eastern Time
  const slots = [];
  for (let etHour = 8; etHour < 20; etHour++) {
    const slotStart = etHourToUTC(dateStr, etHour);
    const slotEnd   = new Date(slotStart.getTime() + 60 * 60 * 1000);

    // Slots whose start time has already passed are not bookable
    const isPast = slotStart <= now;

    const booked = reservations.filter(
      (r) => r.startTime < slotEnd && r.endTime > slotStart
    ).length;

    slots.push({
      hour:          etHour,
      startTime:     slotStart.toISOString(),
      endTime:       slotEnd.toISOString(),
      available:     isPast ? 0 : Math.max(0, equipment.totalUnits - booked),
      totalUnits:    equipment.totalUnits,
      isMaintenance: equipment.maintenanceMode,
      isPast,
    });
  }

  return slots;
};

module.exports = { checkConflict, getAvailabilityForDate };
