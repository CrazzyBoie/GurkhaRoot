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
  // Firestore can't do OR easily; try code first then name
  const byCode = await db.collection('shippingCountries')
    .where('code', '==', nrm.toUpperCase()).where('active', '==', true).limit(1).get();
  if (!byCode.empty) {
    const doc = byCode.docs[0];
    const methods = await db.collection('shippingMethods').where('countryId', '==', doc.id).where('active', '==', true).get();
    return { id: doc.id, ...doc.data(), methods: snapToArr(methods) };
  }
  const byName = await db.collection('shippingCountries')
    .where('active', '==', true).get();
  const match = byName.docs.find(d => d.data().name?.toLowerCase() === nrm.toLowerCase());
  if (match) {
    const methods = await db.collection('shippingMethods').where('countryId', '==', match.id).where('active', '==', true).get();
    return { id: match.id, ...match.data(), methods: snapToArr(methods) };
  }
  return null;
};

export const getShippingCost = async (country = '', methodId = 'standard') => {
  const code     = resolveCode(country);
  const dbCountry = await getDbCountry(code);
  if (dbCountry) {
    const methodRow = dbCountry.methods.find(m => m.methodId === methodId);
    const cost = methodRow ? methodRow.cost : dbCountry.baseCost;
    return Math.round(cost * 100) / 100;
  }
  const envRate = process.env[`SHIPPING_RATE_${code}`] ?? process.env.SHIPPING_RATE_DEFAULT ?? '0';
  return parseFloat(envRate);
};

export const getShippingMethods = async (country = '') => {
  const code = resolveCode(country);
  const dbCountry = await getDbCountry(code);
  if (dbCountry) {
    const methods = dbCountry.methods.map(m => ({
      id: m.methodId, label: m.label, description: m.description, cost: m.cost,
      isFree: m.cost === 0, displayCost: m.cost === 0 ? 'Free' : `$${m.cost.toFixed(2)}`,
    }));
    if (methods.length) return methods;
  }
  const rate = parseFloat(process.env[`SHIPPING_RATE_${code}`] ?? process.env.SHIPPING_RATE_DEFAULT ?? '0');
  return [{ id: 'standard', label: 'Standard Shipping', description: '5–10 business days', cost: rate, isFree: rate === 0, displayCost: rate === 0 ? 'Free' : `$${rate.toFixed(2)}` }];
};
