const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const {
  sendTrainingRequest, sendTrainingConfirmed, sendTrainingCompleted,
} = require('../services/emailService');
const { createNotification } = require('../services/notificationService');
const { parsePagination, paginatedResponse } = require('../utils/helpers');

const SESSION_INCLUDE = {
  student: { select: { id: true, firstName: true, lastName: true, email: true } },
  equipment: true,
};

// ─── Request training session ─────────────────────────────────────────────────
exports.request = async (req, res) => {
  const { equipmentId, scheduledAt, notes } = req.body;

  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate < new Date()) throw new AppError('Cannot schedule training in the past', 400);

  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
  if (!equipment) throw new AppError('Equipment not found', 404);

  const session = await prisma.trainingSession.create({
    data: { studentId: req.user.id, equipmentId, scheduledAt: scheduledDate, notes },
    include: SESSION_INCLUDE,
  });

  // Notify all technologists
  const technologists = await prisma.user.findMany({
    where: { role: { in: ['TECHNOLOGIST', 'ADMIN'] } },
    select: { id: true, email: true },
  });

  for (const tech of technologists) {
    await sendTrainingRequest(tech.email, session.student, session, session.equipment);
    await createNotification({
      userId: tech.id,
      title: 'Training Request',
      message: `${session.student.firstName} ${session.student.lastName} requested training on ${session.equipment.name}`,
      type: 'TRAINING_REQUEST',
    });
  }

  res.status(201).json({ success: true, data: session });
};

// ─── List training sessions ───────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, equipmentId } = req.query;

  const where = {};
  if (req.user.role === 'STUDENT') where.studentId = req.user.id;
  if (status) where.status = status.toUpperCase();
  if (equipmentId) where.equipmentId = equipmentId;

  const [sessions, total] = await Promise.all([
    prisma.trainingSession.findMany({
      where,
      include: SESSION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.trainingSession.count({ where }),
  ]);

  res.json({ success: true, ...paginatedResponse(sessions, total, page, limit) });
};

// ─── Confirm training (technologist) ─────────────────────────────────────────
exports.confirm = async (req, res) => {
  const session = await prisma.trainingSession.findUnique({
    where: { id: req.params.id },
    include: SESSION_INCLUDE,
  });
  if (!session) throw new AppError('Training session not found', 404);
  if (session.status !== 'PENDING') throw new AppError('Only pending sessions can be confirmed', 400);

  const updated = await prisma.trainingSession.update({
    where: { id: session.id },
    data: { status: 'CONFIRMED' },
    include: SESSION_INCLUDE,
  });

  await sendTrainingConfirmed(updated.student, updated, updated.equipment);
  await createNotification({
    userId: updated.studentId,
    title: 'Training Confirmed',
    message: `Your training session for ${updated.equipment.name} has been confirmed.`,
    type: 'TRAINING_CONFIRMED',
  });

  res.json({ success: true, data: updated });
};

// ─── Reject training (technologist) ──────────────────────────────────────────
exports.reject = async (req, res) => {
  const { reason } = req.body;
  const session = await prisma.trainingSession.findUnique({
    where: { id: req.params.id },
    include: SESSION_INCLUDE,
  });
  if (!session) throw new AppError('Training session not found', 404);

  const updated = await prisma.trainingSession.update({
    where: { id: session.id },
    data: { status: 'REJECTED', notes: reason },
    include: SESSION_INCLUDE,
  });

  await createNotification({
    userId: updated.studentId,
    title: 'Training Rejected',
    message: `Your training request for ${updated.equipment.name} was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    type: 'TRAINING_REJECTED',
  });

  res.json({ success: true, data: updated });
};

// ─── Reschedule training (supervisor proposes new time) ────────────────────
exports.reschedule = async (req, res) => {
  const { proposedAt, reason } = req.body;
  if (!proposedAt) throw new AppError('Proposed date/time is required', 400);

  const proposed = new Date(proposedAt);
  if (proposed < new Date()) throw new AppError('Proposed time must be in the future', 400);

  const session = await prisma.trainingSession.findUnique({
    where: { id: req.params.id },
    include: SESSION_INCLUDE,
  });
  if (!session) throw new AppError('Training session not found', 404);
  if (!['PENDING', 'CONFIRMED'].includes(session.status))
    throw new AppError('Only pending or confirmed sessions can be rescheduled', 400);

  const updated = await prisma.trainingSession.update({
    where: { id: session.id },
    data: { status: 'RESCHEDULED', proposedAt: proposed, rescheduleReason: reason || null },
    include: SESSION_INCLUDE,
  });

  // Notify student
  await createNotification({
    userId: updated.studentId,
    title: 'Training Rescheduled',
    message: `Your training for ${updated.equipment.name} has been rescheduled to ${proposed.toLocaleString()}. Please confirm or reject the new time.`,
    type: 'TRAINING_CONFIRMED',
  });

  // Email student
  const { sendTrainingRescheduled } = require('../services/emailService');
  if (typeof sendTrainingRescheduled === 'function') {
    await sendTrainingRescheduled(updated.student, updated, updated.equipment, proposed, reason);
  }

  res.json({ success: true, data: updated });
};

// ─── Student accepts rescheduled time ─────────────────────────────────────
exports.acceptReschedule = async (req, res) => {
  const session = await prisma.trainingSession.findUnique({
    where: { id: req.params.id },
    include: SESSION_INCLUDE,
  });
  if (!session) throw new AppError('Training session not found', 404);
  if (session.status !== 'RESCHEDULED') throw new AppError('Session is not awaiting reschedule confirmation', 400);
  if (session.studentId !== req.user.id) throw new AppError('Access denied', 403);

  const updated = await prisma.trainingSession.update({
    where: { id: session.id },
    data: { status: 'CONFIRMED', scheduledAt: session.proposedAt, proposedAt: null },
    include: SESSION_INCLUDE,
  });

  // Notify supervisors
  const technologists = await prisma.user.findMany({
    where: { role: { in: ['TECHNOLOGIST', 'ADMIN'] } },
    select: { id: true },
  });
  for (const tech of technologists) {
    await createNotification({
      userId: tech.id,
      title: 'Reschedule Accepted',
      message: `${updated.student.firstName} ${updated.student.lastName} accepted the rescheduled training for ${updated.equipment.name}.`,
      type: 'TRAINING_CONFIRMED',
    });
  }

  await sendTrainingConfirmed(updated.student, updated, updated.equipment);
  res.json({ success: true, data: updated });
};

// ─── Student rejects rescheduled time ─────────────────────────────────────
exports.rejectReschedule = async (req, res) => {
  const { reason } = req.body;
  const session = await prisma.trainingSession.findUnique({
    where: { id: req.params.id },
    include: SESSION_INCLUDE,
  });
  if (!session) throw new AppError('Training session not found', 404);
  if (session.status !== 'RESCHEDULED') throw new AppError('Session is not awaiting reschedule confirmation', 400);
  if (session.studentId !== req.user.id) throw new AppError('Access denied', 403);

  const updated = await prisma.trainingSession.update({
    where: { id: session.id },
    data: { status: 'PENDING', proposedAt: null, rescheduleReason: null },
    include: SESSION_INCLUDE,
  });

  // Notify supervisors
  const technologists = await prisma.user.findMany({
    where: { role: { in: ['TECHNOLOGIST', 'ADMIN'] } },
    select: { id: true },
  });
  for (const tech of technologists) {
    await createNotification({
      userId: tech.id,
      title: 'Reschedule Rejected',
      message: `${updated.student.firstName} ${updated.student.lastName} rejected the proposed reschedule for ${updated.equipment.name}. Please propose a new time.`,
      type: 'TRAINING_REJECTED',
    });
  }

  res.json({ success: true, data: updated });
};

// ─── Complete training — issues certification
exports.complete = async (req, res) => {
  const session = await prisma.trainingSession.findUnique({
    where: { id: req.params.id },
    include: SESSION_INCLUDE,
  });
  if (!session) throw new AppError('Training session not found', 404);
  if (session.status !== 'CONFIRMED') throw new AppError('Only confirmed sessions can be completed', 400);

  const updated = await prisma.trainingSession.update({
    where: { id: session.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
    include: SESSION_INCLUDE,
  });

  await sendTrainingCompleted(updated.student, updated.equipment);
  await createNotification({
    userId: updated.studentId,
    title: 'Training Completed 🎓',
    message: `Your training on ${updated.equipment.name} has been marked complete.`,
    type: 'TRAINING_COMPLETED',
  });

  res.json({ success: true, data: updated });
};

