const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { getAvailabilityForDate } = require('../services/conflictDetection');
const { isCertified } = require('../services/trainingGate');

// ─── List equipment ────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  const equipment = await prisma.equipment.findMany({
    orderBy: { name: 'asc' },
  });

  // Enrich with current availability (active bookings today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const enriched = await Promise.all(
    equipment.map(async (eq) => {
      const activeCount = await prisma.reservation.count({
        where: {
          equipmentId: eq.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startTime: { lt: tomorrow },
          endTime: { gt: today },
        },
      });

      // Include certification status if user is authenticated
      let isCertifiedUser = null;
      if (req.user) {
        isCertifiedUser = await isCertified(req.user.id, eq.id);
      }

      return {
        ...eq,
        availableNow: Math.max(0, eq.totalUnits - activeCount),
        isCertified: isCertifiedUser,
      };
    })
  );

  res.json({ success: true, data: enriched });
};

// ─── Get single equipment ──────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  const equipment = await prisma.equipment.findUnique({ where: { id: req.params.id } });
  if (!equipment) throw new AppError('Equipment not found', 404);
  res.json({ success: true, data: equipment });
};

// ─── Get availability for a date ───────────────────────────────────────────────
exports.getAvailability = async (req, res) => {
  const { date } = req.query;
  if (!date) throw new AppError('Date query parameter is required', 400);

  const slots = await getAvailabilityForDate(req.params.id, new Date(date));
  res.json({ success: true, data: slots });
};

// ─── Create equipment (technologist only) ─────────────────────────────────────
exports.create = async (req, res) => {
  const { name, description, type, icon, totalUnits, requiresTraining } = req.body;

  const equipment = await prisma.equipment.create({
    data: { name, description, type, icon, totalUnits, requiresTraining },
  });

  res.status(201).json({ success: true, data: equipment });
};

// ─── Update equipment ─────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  const equipment = await prisma.equipment.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ success: true, data: equipment });
};

// ─── Toggle maintenance mode ───────────────────────────────────────────────────
exports.toggleMaintenance = async (req, res) => {
  const { maintenanceMode, maintenanceNote } = req.body;

  const equipment = await prisma.equipment.update({
    where: { id: req.params.id },
    data: { maintenanceMode, maintenanceNote: maintenanceMode ? maintenanceNote : null },
  });

  res.json({ success: true, data: equipment });
};

// ─── Delete equipment ─────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  await prisma.equipment.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Equipment deleted' });
};
