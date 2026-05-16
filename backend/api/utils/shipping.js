// api/utils/shipping.js — mirrors original logic, uses Firestore ShippingCountry
import { getDb, snapToArr } from '../lib/firebase.js';

const COUNTRY_NAME_TO_CODE = {
  'new zealand': 'NZ', 'australia': 'AU', 'united states': 'US', 'usa': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'nepal': 'NP', 'india': 'IN',
  'canada': 'CA', 'germany': 'DE', 'france': 'FR', 'japan': 'JP',
  'china': 'CN', 'singapore': 'SG',
};

const resolveCode = (country = '') => {
  const n = country.trim().toLowerCase();
  return COUNTRY_NAME_TO_CODE[n] || country.trim().toUpperCase();
};

const getDbCountry = async (country = '') => {
  const db  = getDb();
  const nrm = country.trim();
  // Try by ISO code first, then by name
  const byCode = await db.collection('shippingCountries')
    .where('code', '==', nrm.toUpperCase()).where('active', '==', true).limit(1).get();
  if (!byCode.empty) {
    const doc = byCode.docs[0];
    const methods = await db.collection('shippingMethods').where('countryId', '==', doc.id).where('active', '==', true).get();
    return { id: doc.id, ...doc.data(), methods: snapToArr(methods) };
  }
  const byName = await db.collection('shippingCountries').where('active', '==', true).get();
  const match = byName.docs.find(d => d.data().name?.toLowerCase() === nrm.toLowerCase());
  if (match) {
    const methods = await db.collection('shippingMethods').where('countryId', '==', match.id).where('active', '==', true).get();
    return { id: match.id, ...match.data(), methods: snapToArr(methods) };
  }
  return null;
};

// ── International default ─────────────────────────────────────────────────────
// Stored as a single document in collection 'shippingInternational' with id 'default'.
// Admin can update it via PATCH /api/shipping/admin/international.
// Falls back to env var SHIPPING_RATE_INTERNATIONAL (or 25) if the doc doesn't exist yet.
export const getInternationalDefault = async () => {
  const db   = getDb();
  const snap = await db.collection('shippingInternational').doc('default').get();
  if (snap.exists) return { id: 'default', ...snap.data() };
  const envRate = parseFloat(process.env.SHIPPING_RATE_INTERNATIONAL ?? process.env.SHIPPING_RATE_DEFAULT ?? '25');
  return {
    id: 'default',
    label: 'International Shipping',
    description: '10–21 business days',
    cost: envRate,
    active: true,
  };
};

// ── Public helpers ────────────────────────────────────────────────────────────
export const getShippingCost = async (country = '', methodId = 'standard') => {
  const code      = resolveCode(country);
  const dbCountry = await getDbCountry(code);
  if (dbCountry) {
    const methodRow = dbCountry.methods.find(m => m.methodId === methodId);
    const cost = methodRow ? methodRow.cost : dbCountry.baseCost;
    return Math.round(cost * 100) / 100;
  }
  // No per-country config — use international default
  const intl = await getInternationalDefault();
  return Math.round((intl.cost ?? 25) * 100) / 100;
};

export const getShippingMethods = async (country = '') => {
  const code      = resolveCode(country);
  const dbCountry = await getDbCountry(code);
  if (dbCountry) {
    const methods = dbCountry.methods.map(m => ({
      id: m.methodId, label: m.label, description: m.description, cost: m.cost,
      isFree: m.cost === 0, displayCost: m.cost === 0 ? 'Free' : `$${m.cost.toFixed(2)}`,
    }));
    if (methods.length) return methods;
  }
  // No per-country config — return the single international default method
  const intl = await getInternationalDefault();
  const cost = intl.cost ?? 25;
  return [{
    id: 'international',
    label: intl.label  || 'International Shipping',
    description: intl.description || '10–21 business days',
    cost,
    isFree: cost === 0,
    displayCost: cost === 0 ? 'Free' : `$${cost.toFixed(2)}`,
  }];
};