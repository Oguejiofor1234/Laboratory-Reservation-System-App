const cron = require('node-cron');
const prisma = require('../config/database');
const logger = require('../utils/logger');
const { sendReminder, sendWaitlistNotification } = require('./emailService');
const { createNotification } = require('./notificationService');

const initCronJobs = () => {
  // ─── Every hour: send 24h reminder emails ─────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      const upcoming = await prisma.reservation.findMany({
        where: {
          status: 'CONFIRMED',
          startTime: { gte: in24h, lt: in25h },
        },
        include: {
          user: true,
          equipment: true,
        },
      });

      for (const reservation of upcoming) {
        await sendReminder(reservation.user, reservation, reservation.equipment);
        await createNotification({
          userId: reservation.userId,
          title: 'Booking Reminder',
          message: `Reminder: Your reservation for ${reservation.equipment.name} starts in ~24 hours.`,
          type: 'REMINDER',
          reservationId: reservation.id,
        });
      }

      if (upcoming.length > 0) {
        logger.info(`[CRON] Sent ${upcoming.length} 24h reminder(s)`);
      }
    } catch (err) {
      logger.error(`[CRON] 24h reminder job failed: ${err.message}`);
    }
  });

  // ─── Daily midnight: mark past CONFIRMED reservations as COMPLETED ─────────
  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await prisma.reservation.updateMany({
        where: {
          status: 'CONFIRMED',
          endTime: { lt: new Date() },
        },
        data: { status: 'COMPLETED' },
      });
      logger.info(`[CRON] Marked ${result.count} reservation(s) as COMPLETED`);
    } catch (err) {
      logger.error(`[CRON] Completion job failed: ${err.message}`);
    }
  });

  // ─── Weekly Monday 8am: equipment utilization report to technologists ──────
  cron.schedule('0 8 * * 1', async () => {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const stats = await prisma.reservation.groupBy({
        by: ['equipmentId'],
        where: { createdAt: { gte: oneWeekAgo } },
        _count: { id: true },
      });

      const technologists = await prisma.user.findMany({
        where: { role: { in: ['TECHNOLOGIST', 'ADMIN'] } },
        select: { id: true },
      });

      for (const tech of technologists) {
        await createNotification({
          userId: tech.id,
          title: 'Weekly Utilization Report',
          message: `${stats.reduce((a, s) => a + s._count.id, 0)} reservations were made this week across ${stats.length} equipment type(s).`,
          type: 'SYSTEM',
        });
      }

      logger.info(`[CRON] Sent weekly utilization report to ${technologists.length} technologist(s)`);
    } catch (err) {
      logger.error(`[CRON] Weekly report job failed: ${err.message}`);
    }
  });

  logger.info('⏰ Cron jobs initialized (reminders, completion, weekly report)');
};

/**
 * Process waitlist when a reservation is cancelled.
 * Notifies the first waiting user for the same equipment and date.
 */
const processWaitlist = async (equipmentId, date) => {
  try {
    const requestedDate = new Date(date);
    requestedDate.setHours(0, 0, 0, 0);

    const waiting = await prisma.waitlist.findFirst({
      where: {
        equipmentId,
        requestedDate: {
          gte: requestedDate,
          lt: new Date(requestedDate.getTime() + 24 * 60 * 60 * 1000),
        },
        notified: false,
      },
      orderBy: { createdAt: 'asc' },
      include: { user: true, equipment: true },
    });

    if (!waiting) return;

    await prisma.waitlist.update({
      where: { id: waiting.id },
      data: { notified: true },
    });

    await sendWaitlistNotification(waiting.user, waiting.equipment, waiting.requestedDate);
    await createNotification({
      userId: waiting.userId,
      title: 'Waitlist — Slot Available',
      message: `A slot for ${waiting.equipment.name} on ${requestedDate.toLocaleDateString()} is now available!`,
      type: 'WAITLIST_AVAILABLE',
    });

    logger.info(`[WAITLIST] Notified user ${waiting.userId} of open slot for ${waiting.equipment.name}`);
  } catch (err) {
    logger.error(`[WAITLIST] Processing failed: ${err.message}`);
  }
};

module.exports = { initCronJobs, processWaitlist };
