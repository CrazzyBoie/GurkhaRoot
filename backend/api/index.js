// api/index.js — local dev / non-Vercel entry point
// For Vercel deployment, see root-level handler.js instead.
import app from './app.js';

export default function handler(req, res) {
  app(req, res);
}
