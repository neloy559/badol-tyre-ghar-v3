const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { z }    = require('zod');
const { User } = require('../models');
const { sendSuccess, sendError } = require('../utils/sendResponse');

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

// ── Helpers ────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d').trim(),
  });

const sendTokenCookie = (res, token) => {
  res.cookie('btg_token', token, {
    httpOnly: true,            // XSS protection
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// ── Controllers ────────────────────────────────────────────────

// POST /api/v1/auth/register
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

    const token = signToken(user._id);
    sendTokenCookie(res, token);

    sendSuccess(res, 201, 'Registration successful.', {
      id:         user._id,
      phone:      user.phone,
      role:       user.role,
      isVerified: user.isVerified,
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// POST /api/v1/auth/login
exports.login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);

    const { phone, password } = parsed.data;

    const user = await User.findOne({ phone, isDeleted: false }).select('+password');
    if (!user) return sendError(res, 401, 'Invalid phone or password.');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return sendError(res, 401, 'Invalid phone or password.');

    const token = signToken(user._id);
    sendTokenCookie(res, token);

    sendSuccess(res, 200, 'Login successful.', {
      id:         user._id,
      phone:      user.phone,
      role:       user.role,
      isVerified: user.isVerified,
      profile:    user.profile,
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// POST /api/v1/auth/logout
exports.logout = (req, res) => {
  res.clearCookie('btg_token');
  sendSuccess(res, 200, 'Logged out successfully.');
};

// GET /api/v1/auth/me
exports.getMe = async (req, res) => {
  try {
    // BUG FIX #4: Standardize to req.user._id (not .id) for strict consistency
    // .id is a virtual string getter that breaks on lean() plain objects
    const user = await User.findById(req.user._id).select('-password');
    if (!user || user.isDeleted) return sendError(res, 404, 'User not found.');
    sendSuccess(res, 200, 'User fetched.', user);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
