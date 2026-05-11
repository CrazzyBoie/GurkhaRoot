import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db;

export function getDb() {
  if (db) return db;

  if (!getApps().length) {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      throw new Error(
        '[Firebase] Missing env vars. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in your .env'
      );
    }

    // The private key is stored in .env with literal \n — convert to real newlines
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    try {
      initializeApp({
        credential: cert({ projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey }),
      });
      console.log('[Firebase] ✅ Admin SDK initialised — project:', FIREBASE_PROJECT_ID);
    } catch (err) {
      console.error('[Firebase] ❌ initializeApp failed:', err.message);
      throw err;
    }
  }

  db = getFirestore();
  return db;
}

/** Convert a Firestore DocumentSnapshot to a plain JS object with `id`. */
export const docToObj = (snap) =>
  snap.exists ? { id: snap.id, ...snap.data() } : null;

/** Convert a QuerySnapshot to an array of plain objects. */
export const snapToArr = (snap) =>
  snap.docs.map((d) => ({ id: d.id, ...d.data() }));

/**
 * Generate a Firestore-style random document ID without a network call.
 * Same charset and length (20 chars) as the real Firestore auto-IDs.
 */
export const newId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

export default getDb;