const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware factory to log actions to the audit log table
 */
const audit = (action, resource) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Only log successful mutations
    if (res.statusCode < 400) {
      const resourceId = body?.data?.id || req.params?.id || null;
      prisma.auditLog
        .create({
          data: {
            userId: req.user?.id || null,
            action,
            resource,
            resourceId,
            details: { method: req.method, path: req.path, body: req.body },
            ipAddress: req.ip || req.connection?.remoteAddress,
          },
        })
        ?.catch((e) => logger.warn(`Audit log failed: ${e.message}`));
    }
    return originalJson(body);
  };

  next();
};

module.exports = { audit };
