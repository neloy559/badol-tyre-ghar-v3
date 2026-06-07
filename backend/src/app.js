const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const routes       = require('./routes');
const redirectHandler = require('./middleware/redirectHandler');
const optionalAuth    = require('./middleware/optionalAuth');
const activityLogger  = require('./middleware/activityLogger');

const app = express();

// ── Security & Core Middleware ─────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://badol-tyre-ghar.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    const isVercel = origin && origin.endsWith('.vercel.app');
    const isLocalhost = origin && origin.includes('localhost:');
    if (!origin || allowedOrigins.includes(origin) || isVercel || (isLocalhost && process.env.NODE_ENV === 'development')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Custom Middleware ──────────────────────────────────────────
app.use(redirectHandler);
app.use(optionalAuth);
app.use(activityLogger);

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── Global Error Handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
