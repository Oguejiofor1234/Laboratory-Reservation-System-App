const prisma = require('../config/database');

// ─── AI Insights ────────────────────────────────────────────────────────────────────────────
exports.insights = async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // All reservations last 30 days
  const reservations = await prisma.reservation.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    include: {
      equipment: { select: { id: true, name: true, icon: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  });

  // ── 1. Equipment usage ranking ──
  const usageMap = {};
  reservations.forEach(r => {
    const key = r.equipmentId;
    if (!usageMap[key]) usageMap[key] = { id: key, name: r.equipment.name, icon: r.equipment.icon, count: 0, confirmed: 0 };
    usageMap[key].count++;
    if (r.status === 'CONFIRMED' || r.status === 'COMPLETED') usageMap[key].confirmed++;
  });
  const equipmentRanking = Object.values(usageMap).sort((a, b) => b.count - a.count);
  const maxUsage = equipmentRanking[0]?.count || 1;

  // ── 2. Peak hours (8–19) ──
  const hourMap = {};
  for (let h = 8; h < 20; h++) hourMap[h] = 0;
  reservations.forEach(r => {
    if (r.startTime) {
      const hour = new Date(r.startTime).getHours();
      if (hour >= 8 && hour < 20) hourMap[hour] = (hourMap[hour] || 0) + 1;
    }
  });
  const peakHours = Object.entries(hourMap).map(([h, c]) => ({ hour: parseInt(h), count: c }));
  const maxHour = Math.max(...peakHours.map(p => p.count), 1);

  // ── 3. Busiest days of week (Sun–Fri only) ──
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dayMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reservations.forEach(r => {
    const day = new Date(r.createdAt).getDay();
    if (day !== 6) dayMap[day]++; // exclude Saturday
  });
  const busiestDays = Object.entries(dayMap).map(([d, c]) => ({ day: dayNames[parseInt(d)], count: c }));

  // ── 4. Week-over-week trend ──
  const thisWeek = reservations.filter(r => new Date(r.createdAt) >= sevenDaysAgo).length;
  const lastWeek = reservations.filter(r => {
    const d = new Date(r.createdAt);
    return d >= fourteenDaysAgo && d < sevenDaysAgo;
  }).length;
  const weekTrend = lastWeek === 0 ? 100 : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

  // ── 5. Confirmation rate ──
  const total = reservations.length;
  const confirmed = reservations.filter(r => ['CONFIRMED', 'COMPLETED'].includes(r.status)).length;
  const rejected = reservations.filter(r => r.status === 'REJECTED').length;
  const confirmRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  // ── 6. Generate smart text insights ──
  const insights = [];

  if (equipmentRanking.length > 0) {
    const top = equipmentRanking[0];
    insights.push({ type: 'trend', icon: '📈', text: `${top.icon} ${top.name} is your most requested equipment with ${top.count} booking${top.count !== 1 ? 's' : ''} in the last 30 days.` });
  }

  if (equipmentRanking.length > 1) {
    const least = equipmentRanking[equipmentRanking.length - 1];
    if (least.count === 0) {
      insights.push({ type: 'warning', icon: '⚠️', text: `${least.icon} ${least.name} has had no bookings recently. Consider promoting it or checking its availability.` });
    }
  }

  const peakHour = peakHours.reduce((a, b) => a.count > b.count ? a : b, { hour: 0, count: 0 });
  if (peakHour.count > 0) {
    const h = peakHour.hour;
    const label = `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`;
    insights.push({ type: 'info', icon: '⏰', text: `Peak booking time is ${label}. Ensure supervisors are available during this hour for faster confirmations.` });
  }

  if (weekTrend > 20) {
    insights.push({ type: 'trend', icon: '🚀', text: `Bookings are up ${weekTrend}% this week compared to last week. Great engagement!` });
  } else if (weekTrend < -20) {
    insights.push({ type: 'warning', icon: '📉', text: `Bookings dropped ${Math.abs(weekTrend)}% this week vs last week. Consider sending reminders to students.` });
  }

  if (confirmRate < 60 && total > 5) {
    insights.push({ type: 'warning', icon: '🚨', text: `Only ${confirmRate}% of bookings are confirmed. Supervisors should review pending requests promptly.` });
  } else if (confirmRate >= 80 && total > 5) {
    insights.push({ type: 'success', icon: '✅', text: `${confirmRate}% confirmation rate — supervisors are responding well to booking requests.` });
  }

  const pendingCount = await prisma.reservation.count({ where: { status: 'PENDING' } });
  if (pendingCount > 5) {
    insights.push({ type: 'warning', icon: '📌', text: `There are ${pendingCount} pending requests awaiting supervisor review. Action needed.` });
  }

  res.json({
    success: true,
    data: {
      equipmentRanking,
      maxUsage,
      peakHours,
      maxHour,
      busiestDays,
      weekTrend,
      thisWeek,
      lastWeek,
      confirmRate,
      total,
      confirmed,
      rejected,
      insights,
    },
  });
};

// ─── Student dashboard ─────────────────────────────────────────────────────────
exports.studentDashboard = async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  const [upcoming, history, pendingCount] = await Promise.all([
    // Upcoming reservations (pending + confirmed + rescheduled)
    prisma.reservation.findMany({
      where: { userId, status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] }, startTime: { gte: now } },
      include: {
        equipment: true,
        personInCharge: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    // Recent reservation history
    prisma.reservation.findMany({
      where: { userId, startTime: { lt: now } },
      include: {
        equipment: true,
        personInCharge: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startTime: 'desc' },
      take: 10,
    }),
    // Pending reservations count
    prisma.reservation.count({ where: { userId, status: 'PENDING' } }),
  ]);

  // Training sessions
  const trainingSessions = await prisma.trainingSession.findMany({
    where: { studentId: userId, status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] } },
    include: { equipment: true },
    orderBy: { scheduledAt: 'asc' },
  });

  res.json({
    success: true,
    data: {
      upcoming,
      history,
      trainingSessions,
      stats: {
        pending: pendingCount,
      },
    },
  });
};

// ─── Technologist dashboard ────────────────────────────────────────────────────
exports.techDashboard = async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Start of current calendar week (Monday 00:00:00)
  const startOfWeek = new Date(now);
  const dayOfWeek = startOfWeek.getDay(); // 0=Sun, 1=Mon … 6=Sat
  startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const [
    pendingReservations,
    confirmedToday,
    pendingTraining,
    allEquipment,
    totalReservationsWeek,
    recentActivity,
  ] = await Promise.all([
    // Pending/confirmed/rescheduled reservations:
    //   1. Explicitly assigned to this supervisor
    //   2. Equipment is supervised by them, with no explicit booking-level assignment
    //   3. Neither the booking nor the equipment has any supervisor → visible to ALL supervisors
    prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
        OR: [
          { personInChargeId: req.user.id },
          { personInChargeId: null, equipment: { personInChargeId: req.user.id } },
          { personInChargeId: null, equipment: { personInChargeId: null } },
        ],
      },
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
    // Pending + rescheduled + confirmed training requests
    prisma.trainingSession.findMany({
      where: { status: { in: ['PENDING', 'RESCHEDULED', 'CONFIRMED'] } },
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
        equipment: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Equipment with utilization
    prisma.equipment.findMany({ orderBy: { name: 'asc' } }),
    // Reservations assigned to this supervisor this calendar week
    prisma.reservation.count({
      where: {
        personInChargeId: req.user.id,
        createdAt: { gte: startOfWeek },
      },
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
        pendingTrainingCount: pendingTraining.filter(s => ['PENDING', 'RESCHEDULED'].includes(s.status)).length,
        confirmedToday,
        totalReservationsWeek,
        statusBreakdown: statusMap,
      },
    },
  });
};
