const { ActivityLog } = require('../models');

// Silent analytics — logs every request without blocking
module.exports = async (req, res, next) => {
  // Skip logging for static assets and health checks
  if (req.path === '/health' || req.path.startsWith('/static')) return next();

  try {
    await ActivityLog.create({
      userId: req.user?._id || null,
      action: 'api_request',
      path:   req.originalUrl,
      ip:     req.ip || req.headers['x-forwarded-for'],
      meta: {
        method:     req.method,
        userAgent:  req.headers['user-agent'],
        deviceType: req.user?.analytics?.deviceType || null,
      },
    });
  } catch (_) { /* never block on logging failure */ }

  next();
};
