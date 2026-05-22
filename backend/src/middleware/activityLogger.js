const { ActivityLog } = require('../modules/ops/models');

module.exports = (req, res, next) => {
  // BUG-045 fix: was logging every request including high-frequency suggestion
  // endpoint (fires on every keystroke). Exclude noisy read-only endpoints.
  const skipPaths = [
    '/health',
    '/catalog/search/suggestions',
    '/catalog/categories',
    '/catalog/brands',
  ];
  const shouldSkip = skipPaths.some(p => req.path.includes(p))
    || req.path.startsWith('/static')
    || req.method === 'GET'; // Only log mutations (POST/PATCH/DELETE)

  if (shouldSkip) return next();

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
