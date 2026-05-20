const { ActivityLog } = require('../modules/ops/models');

module.exports = (req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/static')) return next();

  try {
    ActivityLog.create({
      userId: req.user?._id || null,
      action: 'api_request',
      path:   req.originalUrl,
      ip:     req.ip || req.headers['x-forwarded-for'],
      meta: {
        method:     req.method,
        userAgent:  req.headers['user-agent'],
        deviceType: req.user?.analytics?.deviceType || null,
      },
    }).catch(err => console.error('ActivityLog Error:', err.message));
  } catch (_) {}

  next();
};
