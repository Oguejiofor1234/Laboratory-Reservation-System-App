const prisma = require('../config/database');
const { emitToUser, emitToTechnologists } = require('../config/socket');
const logger = require('../utils/logger');

/**
 * Create an in-app notification and emit it via Socket.io
 */
const createNotification = async ({ userId, title, message, type, reservationId = null }) => {
  try {
    const notification = await prisma.notification.create({
      data: { userId, title, message, type, reservationId },
    });

    // Emit real-time event to the user's socket room
    emitToUser(userId, 'notification:new', notification);

    return notification;
  } catch (err) {
    logger.error(`Failed to create notification for user ${userId}: ${err.message}`);
  }
};

/**
 * Notify all technologists of a new booking request
 */
const notifyTechsNewBooking = async (student, reservation, equipment) => {
  const technologists = await prisma.user.findMany({
    where: { role: { in: ['TECHNOLOGIST', 'ADMIN'] } },
    select: { id: true },
  });

  for (const tech of technologists) {
    await createNotification({
      userId: tech.id,
      title: 'New Booking Request',
      message: `${student.firstName} ${student.lastName} requested ${equipment.name} — ${new Date(reservation.startTime).toLocaleDateString()}`,
      type: 'BOOKING_REQUEST',
      reservationId: reservation.id,
    });
  }

  // Also broadcast to all technologist sockets
  emitToTechnologists('booking:new', { reservation, student, equipment });
};

/**
 * Notify student their booking was confirmed
 */
const notifyBookingConfirmed = async (reservation) => {
  await createNotification({
    userId: reservation.userId,
    title: 'Booking Confirmed',
    message: `Your reservation for ${reservation.equipment.name} has been confirmed.`,
    type: 'BOOKING_CONFIRMED',
    reservationId: reservation.id,
  });
};

/**
 * Notify student their booking was rejected
 */
const notifyBookingRejected = async (reservation, reason) => {
  await createNotification({
    userId: reservation.userId,
    title: 'Booking Rejected',
    message: `Your reservation for ${reservation.equipment.name} was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    type: 'BOOKING_REJECTED',
    reservationId: reservation.id,
  });
};

/**
 * Notify student their booking was cancelled
 */
const notifyBookingCancelled = async (reservation, reason) => {
  await createNotification({
    userId: reservation.userId,
    title: 'Booking Cancelled',
    message: `Your reservation for ${reservation.equipment.name} was cancelled.${reason ? ` Reason: ${reason}` : ''}`,
    type: 'BOOKING_CANCELLED',
    reservationId: reservation.id,
  });
};

module.exports = {
  createNotification,
  notifyTechsNewBooking,
  notifyBookingConfirmed,
  notifyBookingRejected,
  notifyBookingCancelled,
};
