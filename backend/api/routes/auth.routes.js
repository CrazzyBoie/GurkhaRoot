import express from 'express';
import passport from 'passport';
import {
  register,
  login,
  logout,
  refresh,
  googleCallback,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account',
}));

// failureRedirect must point to the React frontend, not the Express server.
// If passport auth fails, send the user to the frontend login page.
router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err || !user) {
        console.error('[auth.routes] Google passport failure:', err || info);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  googleCallback
);

router.get('/me', authenticate, getMe);

export default router;