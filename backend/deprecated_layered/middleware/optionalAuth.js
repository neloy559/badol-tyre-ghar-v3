const jwt      = require('jsonwebtoken');
const { User } = require('../models');

// Attaches req.user if valid token present, but never blocks
module.exports = async (req, res, next) => {
  try {
    const token = req.cookies?.btg_token;
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (user && !user.isDeleted) req.user = user;
  } catch (_) { /* invalid token = guest */ }
  next();
};
