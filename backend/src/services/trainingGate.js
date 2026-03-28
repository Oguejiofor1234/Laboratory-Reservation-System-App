const prisma = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Enforce the training gate: if an equipment requires training,
 * the user must have a TrainingCertification for it.
 *
 * @throws AppError(403) if user lacks certification
 */
const enforceTrainingGate = async (userId, equipmentId) => {
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { requiresTraining: true, name: true },
  });

  if (!equipment) throw new AppError('Equipment not found', 404);
  if (!equipment.requiresTraining) return true; // No gate required

  const cert = await prisma.trainingCertification.findUnique({
    where: { userId_equipmentId: { userId, equipmentId } },
  });

  if (!cert) {
    throw new AppError(
      `You must complete training on ${equipment.name} before booking. Please request a training session first.`,
      403
    );
  }

  return true;
};

/**
 * Check if a user is certified for an equipment item (without throwing)
 */
const isCertified = async (userId, equipmentId) => {
  const cert = await prisma.trainingCertification.findUnique({
    where: { userId_equipmentId: { userId, equipmentId } },
  });
  return !!cert;
};

/**
 * Issue a training certification to a student for a given equipment item.
 * Called when a technologist marks a training session as COMPLETED.
 */
const issueCertification = async (userId, equipmentId, technologistId) => {
  return prisma.trainingCertification.upsert({
    where: { userId_equipmentId: { userId, equipmentId } },
    update: { certifiedAt: new Date(), certifiedBy: technologistId },
    create: { userId, equipmentId, certifiedBy: technologistId },
  });
};

module.exports = { enforceTrainingGate, isCertified, issueCertification };
