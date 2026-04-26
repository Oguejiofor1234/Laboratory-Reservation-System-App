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

/**
 * Notify student their booking request was received (triggers in-app sound + OS popup)
 */
const notifyStudentBookingSubmitted = async (student, reservation, equipment) => {
  await createNotification({
    userId: student.id,
    title: 'Booking Request Sent',
    message: `Your booking for ${equipment.name} is pending supervisor approval.`,
    type: 'BOOKING_REQUEST',
    reservationId: reservation.id,
  });
};

/**
 * Notify a specific person in charge of a new booking assigned to them
 */
const notifyPersonInCharge = async (personInChargeId, student, reservation, equipment) => {
  await createNotification({
    userId: personInChargeId,
    title: 'New Booking Request Assigned to You',
    message: `${student.firstName} ${student.lastName} booked ${equipment.name} and selected you as person in charge. Start: ${new Date(reservation.startTime).toLocaleDateString()}.`,
    type: 'BOOKING_REQUEST',
    reservationId: reservation.id,
  });
  emitToTechnologists('booking:new', { reservation, student, equipment });
};

/**
 * Notify supervisor(s) that a student cancelled a booking
 */
const notifySupervisorCancellation = async (reservation) => {
  const message = `${reservation.user.firstName} ${reservation.user.lastName} cancelled their booking for ${reservation.equipment.name} (was ${new Date(reservation.startTime).toLocaleDateString()}).`;

  if (reservation.personInChargeId) {
    await createNotification({
      userId: reservation.personInChargeId,
      title: 'Booking Cancelled by Student',
      message,
      type: 'BOOKING_CANCELLED',
      reservationId: reservation.id,
    });
  } else {
    // Notify all technologists if no specific supervisor assigned
    const techs = await prisma.user.findMany({ where: { role: { in: ['TECHNOLOGIST', 'ADMIN'] } }, select: { id: true } });
    for (const t of techs) {
      await createNotification({ userId: t.id, title: 'Booking Cancelled by Student', message, type: 'BOOKING_CANCELLED', reservationId: reservation.id });
    }
  }
};

/**
 * Notify student that supervisor rescheduled their booking
 */
const notifyStudentBookingRescheduled = async (reservation) => {
  await createNotification({
    userId: reservation.userId,
    title: 'Booking Rescheduled by Supervisor',
    message: `Your booking for ${reservation.equipment.name} has been proposed for a new time. Please confirm or reject the new schedule.`,
    type: 'BOOKING_REQUEST',
    reservationId: reservation.id,
  });
};

/**
 * Notify supervisor that student accepted/rejected reschedule
 */
const notifySupervisorRescheduleResponse = async (reservation, accepted) => {
  if (!reservation.personInChargeId) return;
  await createNotification({
    userId: reservation.personInChargeId,
    title: accepted ? 'Reschedule Accepted' : 'Reschedule Rejected',
    message: `${reservation.user.firstName} ${reservation.user.lastName} ${accepted ? 'accepted' : 'rejected'} the rescheduled time for ${reservation.equipment.name}.`,
    type: accepted ? 'BOOKING_CONFIRMED' : 'BOOKING_REJECTED',
    reservationId: reservation.id,
  });
};

module.exports = {
  createNotification,
  notifyStudentBookingSubmitted,
  notifyTechsNewBooking,
  notifyPersonInCharge,
  notifyBookingConfirmed,
  notifyBookingRejected,
  notifyBookingCancelled,
  notifySupervisorCancellation,
  notifyStudentBookingRescheduled,
  notifySupervisorRescheduleResponse,
};
