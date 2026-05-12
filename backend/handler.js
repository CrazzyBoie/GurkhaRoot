// handler.js — Root-level Vercel entry point (NOT inside /api/ folder)
// Keeping this at root ensures Vercel never strips any path segments from req.url
import app from './api/app.js';

export default app;
