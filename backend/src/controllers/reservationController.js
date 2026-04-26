const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { checkConflict } = require('../services/conflictDetection');
const { processWaitlist } = require('../services/cronJobs');
const {
  sendBookingRequest, sendTechNewBooking, sendBookingConfirmed,
  sendBookingRejected, sendBookingCancelled, sendBookingRescheduled,
} = require('../services/emailService');
const {
  notifyStudentBookingSubmitted,
  notifyTechsNewBooking, notifyPersonInCharge, notifyBookingConfirmed,
  notifyBookingRejected, notifyBookingCancelled,
  notifySupervisorCancellation, notifyStudentBookingRescheduled, notifySupervisorRescheduleResponse,
} = require('../services/notificationService');
const { parsePagination, paginatedResponse } = require('../utils/helpers');

const RESERVATION_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  equipment: true,
  personInCharge: { select: { id: true, firstName: true, lastName: true, email: true } },
};

// ─── Create reservation ───────────────────────────────────────────────────────
exports.create = async (req, res) => {
  const { equipmentId, startTime, endTime, notes, experimentDescription, isFirstTime, bookerEmail } = req.body;

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end) throw new AppError('Start time must be before end time', 400);
  if (start < new Date()) throw new AppError('Cannot book in the past', 400);

  // Conflict detection
  await checkConflict(equipmentId, start, end);

  // Always resolve the supervisor from the equipment — students cannot override this
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { personInChargeId: true },
  });
  if (!equipment) throw new AppError('Equipment not found', 404);

  const resolvedPersonInChargeId = equipment.personInChargeId || null;

  const reservation = await prisma.reservation.create({
    data: {
      userId: req.user.id,
      equipmentId,
      startTime: start,
      endTime: end,
      notes,
      experimentDescription,
      personInChargeId: resolvedPersonInChargeId,
      isFirstTime: Boolean(isFirstTime),
    },
    include: RESERVATION_INCLUDE,
  });

  // 1. Notify student — email + in-app sound/OS popup
  const notifyUser = { ...reservation.user, email: bookerEmail || reservation.user.email };
  sendBookingRequest(notifyUser, reservation, reservation.equipment, reservation.personInCharge);
  notifyStudentBookingSubmitted(reservation.user, reservation, reservation.equipment);

  // Notify the assigned supervisor (or broadcast to all technologists if none is set)
  if (resolvedPersonInChargeId && reservation.personInCharge) {
    notifyPersonInCharge(resolvedPersonInChargeId, reservation.user, reservation, reservation.equipment);
    sendTechNewBooking(reservation.personInCharge.email, reservation.user, reservation, reservation.equipment);
  } else {
    notifyTechsNewBooking(reservation.user, reservation, reservation.equipment);
    sendTechNewBooking(process.env.EMAIL_USER, reservation.user, reservation, reservation.equipment);
  }

  res.status(201).json({ success: true, data: reservation });
};

// ─── List reservations ────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, equipmentId } = req.query;

  const where = {};
  if (req.user.role === 'STUDENT') where.userId = req.user.id;
  if (status) where.status = status.toUpperCase();
  if (equipmentId) where.equipmentId = equipmentId;

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: RESERVATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  res.json({ success: true, ...paginatedResponse(reservations, total, page, limit) });
};

// ─── Get single reservation ───────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: RESERVATION_INCLUDE,
  });
  if (!reservation) throw new AppError('Reservation not found', 404);

  // Students can only see their own
  if (req.user.role === 'STUDENT' && reservation.userId !== req.user.id) {
    throw new AppError('Access denied', 403);
  }

  res.json({ success: true, data: reservation });
};

// ─── Confirm reservation (technologist) ──────────────────────────────────────
exports.confirm = async (req, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: RESERVATION_INCLUDE,
  });
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (reservation.status !== 'PENDING') throw new AppError('Only pending reservations can be confirmed', 400);

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: 'CONFIRMED' },
    include: RESERVATION_INCLUDE,
  });

  sendBookingConfirmed(updated.user, updated, updated.equipment);
  notifyBookingConfirmed(updated);

  res.json({ success: true, data: updated });
};

// ─── Reject reservation (technologist) ───────────────────────────────────────
exports.reject = async (req, res) => {
  const { reason } = req.body;
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: RESERVATION_INCLUDE,
  });
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) {
    throw new AppError('Only pending or confirmed reservations can be rejected', 400);
  }

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: 'REJECTED', cancelReason: reason },
    include: RESERVATION_INCLUDE,
  });

  sendBookingRejected(updated.user, updated, updated.equipment, reason);
  notifyBookingRejected(updated, reason);

  res.json({ success: true, data: updated });
};

// ─── Cancel reservation ───────────────────────────────────────────────────────
exports.cancel = async (req, res) => {
  const { reason } = req.body;
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: RESERVATION_INCLUDE,
  });
  if (!reservation) throw new AppError('Reservation not found', 404);

  // Students can only cancel their own
  if (req.user.role === 'STUDENT' && reservation.userId !== req.user.id) {
    throw new AppError('Access denied', 403);
  }

  if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) {
    throw new AppError('This reservation cannot be cancelled', 400);
  }

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: 'CANCELLED', cancelReason: reason, cancelledAt: new Date() },
    include: RESERVATION_INCLUDE,
  });

  sendBookingCancelled(updated.user, updated, updated.equipment, reason);
  notifyBookingCancelled(updated, reason);

  // Notify supervisor that student cancelled
  notifySupervisorCancellation(updated);
  if (updated.personInCharge) {
    sendBookingCancelled(updated.personInCharge, updated, updated.equipment, `Cancelled by student: ${reason || 'No reason given'}`);
  }

  // Process waitlist for this equipment on this date
  processWaitlist(reservation.equipmentId, reservation.startTime);

  res.json({ success: true, data: updated });
};

// ─── Reschedule reservation (supervisor proposes new time) ────────────────────
exports.reschedule = async (req, res) => {
  const { proposedStartTime, proposedEndTime, reason } = req.body;
  if (!proposedStartTime || !proposedEndTime) throw new AppError('Proposed start and end time are required', 400);

  const pStart = new Date(proposedStartTime);
  const pEnd   = new Date(proposedEndTime);
  if (pStart >= pEnd)  throw new AppError('Proposed start must be before end', 400);
  if (pStart < new Date()) throw new AppError('Proposed time must be in the future', 400);

  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id }, include: RESERVATION_INCLUDE,
  });
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (!['PENDING', 'CONFIRMED'].includes(reservation.status))
    throw new AppError('Only pending or confirmed reservations can be rescheduled', 400);

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: 'RESCHEDULED', proposedStartTime: pStart, proposedEndTime: pEnd, rescheduleReason: reason || null },
    include: RESERVATION_INCLUDE,
  });

  notifyStudentBookingRescheduled(updated);
  sendBookingRescheduled(updated.user, updated, updated.equipment, pStart, pEnd, reason);

  res.json({ success: true, data: updated });
};

// ─── Student accepts rescheduled booking ─────────────────────────────────
exports.acceptReschedule = async (req, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id }, include: RESERVATION_INCLUDE,
  });
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (reservation.status !== 'RESCHEDULED') throw new AppError('Reservation is not awaiting reschedule confirmation', 400);
  if (reservation.userId !== req.user.id) throw new AppError('Access denied', 403);

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: 'CONFIRMED',
      startTime: reservation.proposedStartTime,
      endTime: reservation.proposedEndTime,
      proposedStartTime: null,
      proposedEndTime: null,
      rescheduleReason: null,
    },
    include: RESERVATION_INCLUDE,
  });

  notifySupervisorRescheduleResponse(updated, true);
  sendBookingConfirmed(updated.user, updated, updated.equipment);
  res.json({ success: true, data: updated });
};

// ─── Student rejects rescheduled booking ─────────────────────────────────
exports.rejectReschedule = async (req, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id }, include: RESERVATION_INCLUDE,
  });
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (reservation.status !== 'RESCHEDULED') throw new AppError('Reservation is not awaiting reschedule confirmation', 400);
  if (reservation.userId !== req.user.id) throw new AppError('Access denied', 403);

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: 'PENDING', proposedStartTime: null, proposedEndTime: null, rescheduleReason: null },
    include: RESERVATION_INCLUDE,
  });

  notifySupervisorRescheduleResponse(updated, false);
  res.json({ success: true, data: updated });
};

// ─── Add to waitlist ──────────────────────────────────────────────────────────
exports.addToWaitlist = async (req, res) => {
  const { equipmentId, requestedDate } = req.body;

  const entry = await prisma.waitlist.upsert({
    where: {
      userId_equipmentId_requestedDate: {
        userId: req.user.id,
        equipmentId,
        requestedDate: new Date(requestedDate),
      },
    },
    update: { notified: false },
    create: {
      userId: req.user.id,
      equipmentId,
      requestedDate: new Date(requestedDate),
    },
  });

  res.status(201).json({ success: true, data: entry });
};
