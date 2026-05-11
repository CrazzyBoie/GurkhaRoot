import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';
import { getDb, newId, docToObj, snapToArr } from '../lib/firebase.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/email.service.js';

const registerSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(6),
  phone:    z.string().optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const cookieOpts = (maxAge) => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge,
});

const ACCESS_TTL  = 15 * 60 * 1000;
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000;

// ── register ──────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password, phone } = registerSchema.parse(req.body);
    const db = getDb();

    const existing = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!existing.empty) return res.status(400).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const id  = newId();
    const now = new Date().toISOString();

    const user = { id, name, email, passwordHash, phone: phone || null, role: 'customer', googleId: null, refreshToken: null, createdAt: now };
    await db.collection('users').doc(id).set(user);

    const { accessToken, refreshToken } = generateTokens(user);
    await db.collection('users').doc(id).update({ refreshToken });

    res.cookie('accessToken',  accessToken,  cookieOpts(ACCESS_TTL));
    res.cookie('refreshToken', refreshToken, cookieOpts(REFRESH_TTL));

    sendWelcomeEmail(user).catch(console.error);

    const { passwordHash: _, refreshToken: __, ...safeUser } = user;
    res.status(201).json({ message: 'Registration successful', user: safeUser });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

// ── login ─────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const db   = getDb();
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();

    if (snap.empty) return res.status(401).json({ message: 'Invalid email or password' });

    const userDoc = snap.docs[0];
    const user    = { id: userDoc.id, ...userDoc.data() };

    if (!user.passwordHash) return res.status(401).json({ message: 'Invalid email or password' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ message: 'Invalid email or password' });

    const { accessToken, refreshToken } = generateTokens(user);
    await userDoc.ref.update({ refreshToken });

    res.cookie('accessToken',  accessToken,  cookieOpts(ACCESS_TTL));
    res.cookie('refreshToken', refreshToken, cookieOpts(REFRESH_TTL));

    res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

// ── logout ────────────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const rt = req.cookies.refreshToken;
    if (rt) {
      const db   = getDb();
      const snap = await db.collection('users').where('refreshToken', '==', rt).limit(1).get();
      if (!snap.empty) await snap.docs[0].ref.update({ refreshToken: null });
    }
    const clearOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/' };
    res.clearCookie('accessToken',  clearOpts);
    res.clearCookie('refreshToken', clearOpts);
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed' });
  }
};

// ── refresh ───────────────────────────────────────────────────────────────────
export const refresh = async (req, res) => {
  try {
    const rt = req.cookies.refreshToken;
    if (!rt) return res.status(401).json({ message: 'No refresh token' });

    const decoded = verifyRefreshToken(rt);
    const db      = getDb();
    const snap    = await db.collection('users').doc(decoded.userId).get();
    const user    = docToObj(snap);

    if (!user || user.refreshToken !== rt) return res.status(401).json({ message: 'Invalid refresh token' });

    const tokens = generateTokens(user);
    await snap.ref.update({ refreshToken: tokens.refreshToken });

    res.cookie('accessToken',  tokens.accessToken,  cookieOpts(ACCESS_TTL));
    res.cookie('refreshToken', tokens.refreshToken, cookieOpts(REFRESH_TTL));
    res.json({ message: 'Token refreshed' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// ── Google callback ───────────────────────────────────────────────────────────
export const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);

    const { accessToken, refreshToken } = generateTokens(user);
    await getDb().collection('users').doc(user.id).update({ refreshToken });

    res.cookie('accessToken',  accessToken,  cookieOpts(ACCESS_TTL));
    res.cookie('refreshToken', refreshToken, cookieOpts(REFRESH_TTL));
    res.redirect(`${process.env.CLIENT_URL}/auth/callback#token=${accessToken}`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
  }
};

// ── forgotPassword ────────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const db   = getDb();
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snap.empty) return res.json({ message: 'If an account exists, a reset email has been sent' });

    const userDoc = snap.docs[0];
    const resetToken  = crypto.randomBytes(32).toString('hex');
    const resetExpiry = Date.now() + 60 * 60 * 1000;

    await userDoc.ref.update({ refreshToken: `reset:${resetToken}:${resetExpiry}` });
    await sendPasswordResetEmail({ id: userDoc.id, ...userDoc.data() }, resetToken);

    res.json({ message: 'If an account exists, a reset email has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
};

// ── resetPassword ─────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6)
      return res.status(400).json({ message: 'Token and password (min 6 chars) required' });

    const db   = getDb();
    const snap = await db.collection('users')
      .where('refreshToken', '>=', `reset:${token}:`)
      .where('refreshToken', '<', `reset:${token}:~`)
      .limit(1).get();

    if (snap.empty) return res.status(400).json({ message: 'Invalid or expired reset token' });

    const userDoc = snap.docs[0];
    const parts   = userDoc.data().refreshToken?.split(':');
    const expiry  = parseInt(parts?.[2]);
    if (Date.now() > expiry) return res.status(400).json({ message: 'Reset token has expired' });

    const passwordHash = await bcrypt.hash(password, 10);
    await userDoc.ref.update({ passwordHash, refreshToken: null });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

// ── getMe ─────────────────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const snap = await getDb().collection('users').doc(req.user.id).get();
    const user = docToObj(snap);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { passwordHash, refreshToken, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get user' });
  }
};
