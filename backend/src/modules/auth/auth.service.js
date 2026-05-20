const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * 🎫 Token Service
 * Encapsulates logic for dual-token authentication.
 */

// Hash a token for storage (SHA-256)
exports.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate Access Token (Short-lived)
exports.generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

// Generate Refresh Token (Long-lived)
exports.generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Verify Access Token
exports.verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
