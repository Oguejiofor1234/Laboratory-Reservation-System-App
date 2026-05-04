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
      const [activeReservations, activeTraining, upcomingReservations, upcomingTraining] = await Promise.all([
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
        // Active CONFIRMED training sessions happening right now (within 1h window)
        prisma.trainingSession.findMany({
          where: {
            equipmentId: eq.id,
            status: 'CONFIRMED',
            scheduledAt: { lte: now },
            // training is considered active for 1 hour after scheduledAt
          },
          include: { student: { select: { firstName: true, lastName: true } } },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        }),
        // Upcoming PENDING or CONFIRMED reservations
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
        // Upcoming CONFIRMED training sessions only (pending not shown until confirmed)
        prisma.trainingSession.findMany({
          where: {
            equipmentId: eq.id,
            status: 'CONFIRMED',
            scheduledAt: { gt: now },
          },
          include: { student: { select: { firstName: true, lastName: true } } },
          orderBy: { scheduledAt: 'asc' },
          take: 8,
        }),
      ]);

      // Check if a confirmed training is happening right now (within its 1-hour slot)
      const activeTrainingNow = activeTraining.find(s => {
        const end = new Date(new Date(s.scheduledAt).getTime() + 60 * 60 * 1000);
        return end > now;
      }) || null;

      // Current user: active reservation OR active confirmed training
      const currentRes = activeReservations[0] || null;
      const lastActive = activeReservations[activeReservations.length - 1] || null;

      const currentUser = currentRes
        ? { name: `${currentRes.user.firstName} ${currentRes.user.lastName}`, startTime: currentRes.startTime, endTime: currentRes.endTime, type: 'booking' }
        : activeTrainingNow
        ? { name: `${activeTrainingNow.student.firstName} ${activeTrainingNow.student.lastName}`,
            startTime: activeTrainingNow.scheduledAt,
            endTime: new Date(new Date(activeTrainingNow.scheduledAt).getTime() + 60 * 60 * 1000),
            type: 'training' }
        : null;

      // Merge confirmed training + all reservations for upcoming list
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
          endTime:   new Date(new Date(s.scheduledAt).getTime() + 60 * 60 * 1000),
          status:    'CONFIRMED',
        })),
      ].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).slice(0, 10);

      const inUseCount = activeReservations.length + (activeTrainingNow ? 1 : 0);

      return {
        ...eq,
        availableNow:    Math.max(0, eq.totalUnits - inUseCount),
        currentUser,
        availableFrom:   lastActive ? lastActive.endTime : null,
        upcomingBookings: allUpcoming,
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

// ─── Upload video file to Cloudinary ────────────────────────────────────────
exports.uploadVideoFile = async (req, res) => {
  if (!req.file) throw new AppError('No video file provided', 400);
  if (!hasCloudinary()) throw new AppError('Video upload requires Cloudinary env vars (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)', 500);

  const cloudinary = require('../config/cloudinary');
  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder:        'lab1708/videos',
        public_id:     `vid-${req.params.id}-${Date.now()}`,
        resource_type: 'video',
        // Deliver as-is — no transformations needed for training videos
      },
      (error, result) => (error ? reject(error) : resolve(result))
    ).end(req.file.buffer);
  });

  res.json({ success: true, videoUrl: result.secure_url });
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

// Helper: true when all three Cloudinary env vars are present
const hasCloudinary = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// ─── Upload equipment image ────────────────────────────────────────────────
exports.uploadImage = async (req, res) => {
  if (!req.file) throw new AppError('No image file provided', 400);

  let imageUrl;

  if (hasCloudinary()) {
    // Production: upload buffer to Cloudinary → get permanent HTTPS URL
    const cloudinary = require('../config/cloudinary');
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'lab1708/equipment', public_id: `eq-${req.params.id}`, overwrite: true, resource_type: 'image' },
        (error, result) => (error ? reject(error) : resolve(result))
      ).end(req.file.buffer);
    });
    imageUrl = result.secure_url;
  } else {
    // Local dev fallback: write buffer to disk
    const fs   = require('fs');
    const path = require('path');
    const uploadDir = path.join(__dirname, '../../uploads/equipment');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const ext      = path.extname(req.file.originalname).toLowerCase();
    const filename = `eq-${req.params.id}-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
    imageUrl = `/uploads/equipment/${filename}`;
  }

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
    if (equipment.imageUrl.includes('cloudinary.com')) {
      // Delete from Cloudinary
      const cloudinary = require('../config/cloudinary');
      await cloudinary.uploader
        .destroy(`lab1708/equipment/eq-${req.params.id}`, { resource_type: 'image' })
        .catch(() => {}); // ignore – image may already be gone
    } else {
      // Local disk cleanup
      const fs   = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../', equipment.imageUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
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
