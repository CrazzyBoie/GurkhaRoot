// Local dev entry — loads .env FIRST, then starts the server
import 'dotenv/config';

// ── Validate required env vars before anything else loads ─────────────────────
const REQUIRED = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('\n❌ Missing required environment variables:');
  missing.forEach((k) => console.error(`   - ${k}`));
  console.error('\nCreate a .env file from .env.example and fill in all values.\n');
  process.exit(1);
}

// ── Check FIREBASE_PRIVATE_KEY looks valid ─────────────────────────────────────
const pk = process.env.FIREBASE_PRIVATE_KEY;
if (!pk.includes('BEGIN') || !pk.includes('PRIVATE KEY')) {
  console.error('\n❌ FIREBASE_PRIVATE_KEY looks wrong.');
  console.error('   It must be the full key including -----BEGIN RSA PRIVATE KEY----- header.');
  console.error('   In your .env wrap it in double quotes and keep \\n for line breaks.\n');
  process.exit(1);
}

// ── Start app ─────────────────────────────────────────────────────────────────
import app from './app.js';

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Gurkha Roots API  →  http://localhost:${PORT}`);
  console.log(`   Health check      →  http://localhost:${PORT}/api/health\n`);
});

// Catch unhandled errors so they show in the terminal instead of dying silently
process.on('unhandledRejection', (err) => {
  console.error('[UnhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err);
  process.exit(1);
});