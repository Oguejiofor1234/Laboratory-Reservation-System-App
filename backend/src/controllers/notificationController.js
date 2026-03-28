const prisma = require('../config/database');
const { parsePagination, paginatedResponse } = require('../utils/helpers');

// ─── Get notifications for current user ───────────────────────────────────────
exports.getAll = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const unreadOnly = req.query.unread === 'true';

  const where = {
    userId: req.user.id,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);

  res.json({
    success: true,
    unreadCount,
    ...paginatedResponse(notifications, total, page, limit),
  });
};

// ─── Mark single notification as read ─────────────────────────────────────────
exports.markRead = async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { isRead: true },
  });
  res.json({ success: true, message: 'Notification marked as read' });
};

// ─── Mark all notifications as read ───────────────────────────────────────────
exports.markAllRead = async (req, res) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true, message: `${count} notification(s) marked as read` });
};

// ─── Get unread count only ────────────────────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false },
  });
  res.json({ success: true, data: { count } });
};
