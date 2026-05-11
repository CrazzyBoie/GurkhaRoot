// api/index.js — Vercel Serverless Function entry point
// Vercel looks for a default export (or module.exports) from files inside /api
// that is a standard Node.js http request handler or an Express app.

import app from './app.js';
import { createServer } from 'http';

// @vercel/node expects module.exports (CJS interop)
// Use a named handler wrapper so Vercel sees a function, not an Express app
export default function handler(req, res) {
  app(req, res);
}
