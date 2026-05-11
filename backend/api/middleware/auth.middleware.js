import { verifyAccessToken } from '../utils/jwt.js';
import { getDb, docToObj } from '../lib/firebase.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken ||
      req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const decoded = verifyAccessToken(token);
    const snap    = await getDb().collection('users').doc(decoded.userId).get();
    const user    = docToObj(snap);

    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = {
      id:    user.id,
      email: user.email,
      name:  user.name,
      role:  user.role,
      phone: user.phone,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError')
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Insufficient permissions' });
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken ||
      req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = verifyAccessToken(token);
      const snap    = await getDb().collection('users').doc(decoded.userId).get();
      const user    = docToObj(snap);
      if (user) req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    }
  } catch (_) { /* ignore */ }
  next();
};
