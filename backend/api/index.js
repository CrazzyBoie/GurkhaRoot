// api/index.js — Vercel Serverless Function entry point
//
// IMPORTANT: When Vercel serves a file from the /api/ directory, it strips
// the leading "/api" segment from req.url before your handler sees it.
// e.g. a request to /api/auth/me arrives as req.url = "/auth/me"
//
// Our Express app registers all routes under /api/... so we must restore
// the "/api" prefix before passing the request to Express.

import app from './app.js';

export default function handler(req, res) {
  // Restore the /api prefix that Vercel strips when routing to /api/index.js
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  app(req, res);
}
