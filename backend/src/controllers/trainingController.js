const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { issueCertification } = require('../services/trainingGate');
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

// ─── Complete training — issues certification ─────────────────────────────────
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

  // Issue certification so student can now book this equipment
  await issueCertification(updated.studentId, updated.equipmentId, req.user.id);

  await sendTrainingCompleted(updated.student, updated.equipment);
  await createNotification({
    userId: updated.studentId,
    title: 'Training Completed 🎓',
    message: `You are now certified to use ${updated.equipment.name}. You can now book it!`,
    type: 'TRAINING_COMPLETED',
  });

  res.json({ success: true, data: updated });
};

// ─── Get certifications for current user ──────────────────────────────────────
exports.getCertifications = async (req, res) => {
  const userId = req.user.id;
  const certs = await prisma.trainingCertification.findMany({
    where: { userId },
    include: { equipment: true },
    orderBy: { certifiedAt: 'desc' },
  });
  res.json({ success: true, data: certs });
};
