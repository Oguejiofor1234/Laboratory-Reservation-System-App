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

/**
 * Get availability info for an equipment item on a given date.
 * Returns an array of hour slots (8am–8pm) with available unit counts.
 */
const getAvailabilityForDate = async (equipmentId, date) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

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
      endTime: { gt: dayStart },
    },
    select: { startTime: true, endTime: true },
  });

  // Build hourly slots 8am–8pm
  const slots = [];
  for (let hour = 8; hour < 20; hour++) {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    const booked = reservations.filter(
      (r) => r.startTime < slotEnd && r.endTime > slotStart
    ).length;

    slots.push({
      hour,
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      available: Math.max(0, equipment.totalUnits - booked),
      totalUnits: equipment.totalUnits,
      isMaintenance: equipment.maintenanceMode,
    });
  }

  return slots;
};

module.exports = { checkConflict, getAvailabilityForDate };
