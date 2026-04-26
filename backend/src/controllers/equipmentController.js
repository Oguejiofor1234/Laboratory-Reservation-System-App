const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { getAvailabilityForDate } = require('../services/conflictDetection');

// ─── List equipment ────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  const equipment = await prisma.equipment.findMany({
    orderBy: { name: 'asc' },
    include: {
      personInCharge: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Enrich with current availability (active bookings today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const now = new Date();

  const enriched = await Promise.all(
    equipment.map(async (eq) => {
      // Run all per-equipment queries in parallel
      const [activeReservations, upcomingReservations, upcomingTraining] = await Promise.all([
        // Active reservations overlapping right now
        prisma.reservation.findMany({
          where: {
            equipmentId: eq.id,
            status: { in: ['PENDING', 'CONFIRMED'] },
            startTime: { lte: now },
            endTime: { gt: now },
          },
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { endTime: 'asc' },
        }),
        // ALL upcoming reservations (starts in future)
        prisma.reservation.findMany({
          where: {
            equipmentId: eq.id,
            status: { in: ['PENDING', 'CONFIRMED'] },
            startTime: { gt: now },
          },
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { startTime: 'asc' },
          take: 8,
        }),
        // ALL upcoming training sessions for this equipment
        prisma.trainingSession.findMany({
          where: {
            equipmentId: eq.id,
            status: { in: ['PENDING', 'CONFIRMED'] },
            scheduledAt: { gt: now },
          },
          include: { student: { select: { firstName: true, lastName: true } } },
          orderBy: { scheduledAt: 'asc' },
          take: 8,
        }),
      ]);

      // Current user (first active reservation)
      const currentRes = activeReservations[0] || null;
      const lastActive = activeReservations[activeReservations.length - 1] || null;

      // Merge reservations + training sessions, sorted by start time
      const allUpcoming = [
        ...upcomingReservations.map(r => ({
          type:      'booking',
          userName:  `${r.user.firstName} ${r.user.lastName}`,
          startTime: r.startTime,
          endTime:   r.endTime,
          status:    r.status,
        })),
        ...upcomingTraining.map(s => ({
          type:      'training',
          userName:  `${s.student.firstName} ${s.student.lastName}`,
          startTime: s.scheduledAt,
          endTime:   new Date(new Date(s.scheduledAt).getTime() + 60 * 60 * 1000), // assume 1h
          status:    s.status,
        })),
      ].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).slice(0, 10);

      return {
        ...eq,
        availableNow:   Math.max(0, eq.totalUnits - activeReservations.length),
        currentUser:    currentRes
          ? { name: `${currentRes.user.firstName} ${currentRes.user.lastName}`, startTime: currentRes.startTime, endTime: currentRes.endTime }
          : null,
        availableFrom:  lastActive ? lastActive.endTime : null,
        upcomingBookings: allUpcoming,
        // Keep confirmedNext for backward-compat (LandingPublic uses it)
        confirmedNext: upcomingReservations.find(r => r.status === 'CONFIRMED')
          ? { userName: `${upcomingReservations.find(r => r.status === 'CONFIRMED').user.firstName} ${upcomingReservations.find(r => r.status === 'CONFIRMED').user.lastName}`,
              startTime: upcomingReservations.find(r => r.status === 'CONFIRMED').startTime,
              endTime:   upcomingReservations.find(r => r.status === 'CONFIRMED').endTime }
          : null,
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

// ─── Update tutorial video URL ───────────────────────────────────────────────
exports.updateVideo = async (req, res) => {
  const { videoUrl } = req.body;
  const equipment = await prisma.equipment.update({
    where: { id: req.params.id },
    data: { videoUrl: videoUrl || null },
  });
  res.json({ success: true, data: equipment });
};

// ─── Upload equipment image ────────────────────────────────────────────────
exports.uploadImage = async (req, res) => {
  if (!req.file) throw new AppError('No image file provided', 400);
  const imageUrl = `/uploads/equipment/${req.file.filename}`;
  const equipment = await prisma.equipment.update({
    where: { id: req.params.id },
    data: { imageUrl },
  });
  res.json({ success: true, data: equipment, imageUrl });
};

exports.deleteImage = async (req, res) => {
  const equipment = await prisma.equipment.findUnique({ where: { id: req.params.id } });
  if (!equipment) throw new AppError('Equipment not found', 404);
  if (equipment.imageUrl) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../', equipment.imageUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  const updated = await prisma.equipment.update({
    where: { id: req.params.id },
    data: { imageUrl: null },
  });
  res.json({ success: true, data: updated });
};

// ─── Update tutorial videos (multi) ─────────────────────────────────────
exports.updateVideos = async (req, res) => {
  const { videos } = req.body;
  if (!Array.isArray(videos)) throw new AppError('videos must be an array', 400);
  const equipment = await prisma.equipment.update({
    where: { id: req.params.id },
    data: { videos },
  });
  res.json({ success: true, data: equipment });
};

// ─── Update reference materials ────────────────────────────────────────────────
exports.updateMaterials = async (req, res) => {
  const { materials } = req.body;
  if (!Array.isArray(materials)) throw new AppError('materials must be an array', 400);
  const equipment = await prisma.equipment.update({
    where: { id: req.params.id },
    data: { materials },
  });
  res.json({ success: true, data: equipment });
};

// ─── Toggle maintenance mode ───────────────────────────────────────────────────────
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
