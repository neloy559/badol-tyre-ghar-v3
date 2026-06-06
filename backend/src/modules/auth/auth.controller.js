const bcrypt   = require('bcryptjs');
const { z }    = require('zod');
const User     = require('../users/user.model');
const RefreshToken = require('./refreshToken.model');
const authService  = require('./auth.service');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

// ── Zod Schemas ────────────────────────────────────────────────
const registerSchema = z.object({
  phone:    z.string().min(11).max(14),
  password: z.string().min(6),
  name:     z.string().optional(),
});

const loginSchema = z.object({
  phone:    z.string().min(11),
  password: z.string().min(1),
});

const dealerRegisterSchema = z.object({
  businessName: z.string().min(2),
  ownerName:    z.string().min(2),
  email:        z.string().email(),
  phone:        z.string().min(11).max(14),
  address:      z.string().min(5),
  password:     z.string().min(6),
});

// ── Helpers ────────────────────────────────────────────────────

/**
 * Issues both Access and Refresh tokens.
 * Saves hashed refresh token to DB and sets HttpOnly cookie.
 */
const issueTokens = async (res, userId, req) => {
  const accessToken  = authService.generateAccessToken(userId);
  const refreshToken = authService.generateRefreshToken();

  // Save Refresh Token to DB (Hashed)
  await RefreshToken.create({
    userId,
    tokenHash: authService.hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    deviceInfo: {
      ip:        req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
    },
  });

  // Set Refresh Token in HttpOnly Cookie
  // BUG-042 fix: secure: true always breaks login in local dev over HTTP.
  // Only set secure in production.
  res.cookie('btg_refresh_token', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });

  return accessToken;
};

// ── Controllers ────────────────────────────────────────────────

exports.register = async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);

    const { phone, password, name } = parsed.data;

    const exists = await User.findOne({ phone, isDeleted: false });
    if (exists) return sendError(res, 409, 'Phone number already registered.');

    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({
      phone,
      password: hashed,
      'profile.name': name || '',
    });

    const accessToken = await issueTokens(res, user._id, req);

    sendSuccess(res, 201, 'Registration successful.', {
      accessToken,
      user: {
        id:         user._id,
        phone:      user.phone,
        role:       user.role,
        isVerified: user.isVerified,
      }
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.dealerRegister = async (req, res) => {
  try {
    const parsed = dealerRegisterSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);

    const { businessName, ownerName, email, phone, address, password } = parsed.data;

    const exists = await User.findOne({ phone, isDeleted: false });
    if (exists) return sendError(res, 409, 'Phone number already registered.');

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      phone,
      password: hashed,
      role: 'dealer',
      registrationStatus: 'pending',
      isVerified: false,
      'profile.name': ownerName,
      'profile.shopName': businessName,
      'profile.address': address,
      'verificationDetails.appliedAt': new Date(),
    });

    sendSuccess(res, 201, 'Registration received. Your account is under review.', {
      userId: user._id,
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);

    const { phone, password } = parsed.data;

    const user = await User.findOne({ phone, isDeleted: false }).select('+password');
    if (!user) return sendError(res, 401, 'Invalid phone or password.');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return sendError(res, 401, 'Invalid phone or password.');

    if (user.role === 'dealer') {
      if (user.registrationStatus === 'pending') {
        return sendError(res, 403, 'Your account is under review. Please wait for admin approval.');
      }
      if (user.registrationStatus === 'rejected') {
        return sendError(res, 403, 'Your registration was not approved. Please contact Badol Tyre Ghar for assistance.');
      }
    }

    const accessToken = await issueTokens(res, user._id, req);

    sendSuccess(res, 200, 'Login successful.', {
      accessToken,
      user: {
        id:         user._id,
        phone:      user.phone,
        role:       user.role,
        isVerified: user.isVerified,
        profile:    user.profile,
      }
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// POST /api/v1/auth/refresh
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.btg_refresh_token;
    if (!token) return sendError(res, 401, 'Refresh token missing.');

    const hashed = authService.hashToken(token);
    const stored = await RefreshToken.findOne({ tokenHash: hashed, isRevoked: false });

    if (!stored || stored.expiresAt < new Date()) {
      return sendError(res, 401, 'Invalid or expired refresh token.');
    }

    // Optional: Rotate Refresh Token (Delete old, issue new)
    await stored.deleteOne();
    const accessToken = await issueTokens(res, stored.userId, req);

    sendSuccess(res, 200, 'Token refreshed.', { accessToken });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.btg_refresh_token;
    if (token) {
      const hashed = authService.hashToken(token);
      await RefreshToken.findOneAndUpdate({ tokenHash: hashed }, { isRevoked: true });
    }
    res.clearCookie('btg_refresh_token', {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    sendSuccess(res, 200, 'Logged out successfully.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user || user.isDeleted) return sendError(res, 404, 'User not found.');
    sendSuccess(res, 200, 'User fetched.', user);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
