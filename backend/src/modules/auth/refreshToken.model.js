const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 🔐 RefreshToken Model
 * Stores hashed refresh tokens for secure session management.
 * Supports token revocation (logout from all devices).
 */
const RefreshTokenSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true },          // Hashed (SHA-256) token
  expiresAt: { type: Date, required: true, index: true },
  isRevoked: { type: Boolean, default: false },
  deviceInfo: {
    ip:        String,
    userAgent: String,
  },
}, { timestamps: true });

// TTL Index: MongoDB auto-purges expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.RefreshToken
  || mongoose.model('RefreshToken', RefreshTokenSchema);
