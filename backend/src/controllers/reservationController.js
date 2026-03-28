const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { checkConflict } = require('../services/conflictDetection');
const { enforceTrainingGate } = require('../services/trainingGate');
const { processWaitlist } = require('../services/cronJobs');
const {
  sendBookingRequest, sendTechNewBooking, sendBookingConfirmed,
  sendBookingRejected, sendBookingCancelled,
} = require('../services/emailService');
const {
  notifyTechsNewBooking, notifyBookingConfirmed,
  notifyBookingRejected, notifyBookingCancelled,
} = require('../services/notificationService');
const { parsePagination, paginatedResponse } = require('../utils/helpers');

const RESERVATION_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  equipment: true,
};

// ─── Create reservation ───────────────────────────────────────────────────────
exports.create = async (req, res) => {
  const { equipmentId, startTime, endTime, notes, isFirstTime } = req.body;

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end) throw new AppError('Start time must be before end time', 400);
  if (start < new Date()) throw new AppError('Cannot book in the past', 400);

  // Training gate — throws 403 if not certified and equipment requires it
  if (!isFirstTime) {
    await enforceTrainingGate(req.user.id, equipmentId);
  }

  // Conflict detection — throws 409 if fully booked
  await checkConflict(equipmentId, start, end);

  const reservation = await prisma.reservation.create({
    data: {
      userId: req.user.id,
      equipmentId,
      startTime: start,
      endTime: end,
      notes,
      isFirstTime: Boolean(isFirstTime),
    },
    include: RESERVATION_INCLUDE,
  });

  // Email + in-app notifications (fire and forget)
  sendBookingRequest(reservation.user, reservation, reservation.equipment);
  sendTechNewBooking(
    process.env.EMAIL_USER || 'tech@lab1708.edu',
    reservation.user,
    reservation,
    reservation.equipment
  );
  notifyTechsNewBooking(reservation.user, reservation, reservation.equipment);

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

  // 24-hour cancellation rule for students
  if (req.user.role === 'STUDENT') {
    const hoursUntilStart = (new Date(reservation.startTime) - new Date()) / (1000 * 60 * 60);
    if (hoursUntilStart < 24) {
      throw new AppError(
        'Cancellations must be made at least 24 hours before the scheduled start time',
        400
      );
    }
  }

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: 'CANCELLED', cancelReason: reason, cancelledAt: new Date() },
    include: RESERVATION_INCLUDE,
  });

  sendBookingCancelled(updated.user, updated, updated.equipment, reason);
  notifyBookingCancelled(updated, reason);

  // Process waitlist for this equipment on this date
  processWaitlist(reservation.equipmentId, reservation.startTime);

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
