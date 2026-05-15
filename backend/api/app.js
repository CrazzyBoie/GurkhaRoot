import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import rateLimit from 'express-rate-limit';

import { getDb } from './lib/firebase.js';

let firebaseReady = false;
try {
  getDb();
  firebaseReady = true;
} catch (err) {
  console.error('[Startup] Firebase init failed:', err.message);
}

import './config/passport.js';

import authRoutes     from './routes/auth.routes.js';
import productRoutes  from './routes/product.routes.js';
import orderRoutes    from './routes/order.routes.js';
import userRoutes     from './routes/user.routes.js';
import couponRoutes   from './routes/coupon.routes.js';
import paymentRoutes  from './routes/payment.routes.js';
import reviewRoutes   from './routes/review.routes.js';
import adminRoutes    from './routes/admin.routes.js';
import shippingRoutes from './routes/shipping.routes.js';

const app = express();

// ── Trust Vercel's proxy (required for express-rate-limit behind Vercel) ──────
app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const clientOrigin = (process.env.CLIENT_URL || 'https://gurkharoot.vercel.app').replace(/\/$/, '');

const allowedOrigins = new Set([
  clientOrigin,
  clientOrigin.replace(/^http:\/\//, 'https://'),
  clientOrigin.replace(/^https:\/\//, 'http://'),
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth', authLimiter);

// ── Stripe webhook needs raw body BEFORE express.json() ───────────────────────
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(passport.initialize());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await getDb().collection('_health').limit(1).get();
    res.json({ status: 'ok', firebase: 'connected', ts: Date.now() });
  } catch (err) {
    console.error('[Health] Firestore ping failed:', err.message);
    res.status(500).json({ status: 'error', firebase: 'disconnected', error: err.message });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/coupons',  couponRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/shipping', shippingRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  if (err.name === 'UnauthorizedError') return res.status(401).json({ message: 'Unauthorized' });
  if (err.name === 'ValidationError')   return res.status(400).json({ message: err.message });
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

export default app;