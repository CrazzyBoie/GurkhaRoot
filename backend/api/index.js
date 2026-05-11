// api/index.js — Vercel Serverless Function entry point
// Vercel looks for a default export (or module.exports) from files inside /api
// that is a standard Node.js http request handler or an Express app.

import app from './app.js';

// Export the Express app directly. Vercel wraps it automatically.
export default app;
