const prisma = require('../config/database');

// ─── Student dashboard ─────────────────────────────────────────────────────────
exports.studentDashboard = async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  const [upcoming, history, certifications, pendingCount] = await Promise.all([
    // Upcoming confirmed reservations
    prisma.reservation.findMany({
      where: { userId, status: 'CONFIRMED', startTime: { gte: now } },
      include: { equipment: true },
      orderBy: { startTime: 'asc' },
      take: 5,
    }),
    // Recent reservation history
    prisma.reservation.findMany({
      where: { userId, startTime: { lt: now } },
      include: { equipment: true },
      orderBy: { startTime: 'desc' },
      take: 10,
    }),
    // Training certifications
    prisma.trainingCertification.findMany({
      where: { userId },
      include: { equipment: true },
      orderBy: { certifiedAt: 'desc' },
    }),
    // Pending reservations count
    prisma.reservation.count({ where: { userId, status: 'PENDING' } }),
  ]);

  // Training sessions
  const trainingSessions = await prisma.trainingSession.findMany({
    where: { studentId: userId, status: { in: ['PENDING', 'CONFIRMED'] } },
    include: { equipment: true },
    orderBy: { scheduledAt: 'asc' },
  });

  res.json({
    success: true,
    data: {
      upcoming,
      history,
      certifications,
      trainingSessions,
      stats: {
        pending: pendingCount,
        certifiedEquipment: certifications.length,
      },
    },
  });
};

// ─── Technologist dashboard ────────────────────────────────────────────────────
exports.techDashboard = async (req, res) => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    pendingReservations,
    confirmedToday,
    pendingTraining,
    allEquipment,
    totalReservationsWeek,
    recentActivity,
  ] = await Promise.all([
    // Pending reservations (action needed)
    prisma.reservation.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        equipment: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Confirmed reservations today
    prisma.reservation.count({
      where: {
        status: 'CONFIRMED',
        startTime: { gte: new Date(now.setHours(0, 0, 0, 0)) },
      },
    }),
    // Pending training requests
    prisma.trainingSession.findMany({
      where: { status: 'PENDING' },
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
        equipment: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Equipment with utilization
    prisma.equipment.findMany({ orderBy: { name: 'asc' } }),
    // Total reservations this week
    prisma.reservation.count({
      where: { createdAt: { gte: oneWeekAgo } },
    }),
    // Recent reservation activity (last 30 days)
    prisma.reservation.groupBy({
      by: ['status'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    }),
  ]);

  // Equipment utilization (reservations per equipment last 30 days)
  const utilizationData = await Promise.all(
    allEquipment.map(async (eq) => {
      const count = await prisma.reservation.count({
        where: {
          equipmentId: eq.id,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          createdAt: { gte: thirtyDaysAgo },
        },
      });
      const activeNow = await prisma.reservation.count({
        where: {
          equipmentId: eq.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startTime: { lte: now },
          endTime: { gte: now },
        },
      });
      return { ...eq, reservationsThisMonth: count, activeNow };
    })
  );

  const statusMap = recentActivity.reduce((acc, r) => {
    acc[r.status] = r._count.id;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      pendingReservations,
      pendingTraining,
      equipment: utilizationData,
      stats: {
        pendingCount: pendingReservations.length,
        pendingTrainingCount: pendingTraining.length,
        confirmedToday,
        totalReservationsWeek,
        statusBreakdown: statusMap,
      },
    },
  });
};
