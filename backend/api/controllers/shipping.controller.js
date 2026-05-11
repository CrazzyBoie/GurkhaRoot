import { getDb, newId, docToObj, snapToArr } from '../lib/firebase.js';
import { getShippingCost as utilGetCost, getShippingMethods as utilGetMethods } from '../utils/shipping.js';

// ── Public ────────────────────────────────────────────────────────────────────
export const getShippingCost = async (req, res) => {
  try {
    const { country, method = 'standard' } = req.query;
    if (!country) return res.status(400).json({ message: 'Country is required' });
    const cost = await utilGetCost(country, method);
    res.json({ country, method, cost, label: cost === 0 ? 'Free' : `$${cost.toFixed(2)}` });
  } catch (err) { res.status(500).json({ message: 'Failed to get shipping cost' }); }
};

export const getShippingMethods = async (req, res) => {
  try {
    const { country } = req.query;
    if (!country) return res.status(400).json({ message: 'Country is required' });
    const methods = await utilGetMethods(country);
    res.json({ country, methods });
  } catch (err) { res.status(500).json({ message: 'Failed to get shipping methods' }); }
};

// ── Admin: Countries ──────────────────────────────────────────────────────────
export const getCountries = async (req, res) => {
  try {
    const db   = getDb();
    const snap = await db.collection('shippingCountries').orderBy('name').get();
    const countries = [];
    for (const d of snap.docs) {
      const country = { id: d.id, ...d.data() };
      const mSnap   = await db.collection('shippingMethods').where('countryId', '==', d.id).orderBy('methodId').get();
      country.methods = snapToArr(mSnap);
      countries.push(country);
    }
    res.json({ countries });
  } catch (err) { res.status(500).json({ message: 'Failed to get shipping countries' }); }
};

export const createCountry = async (req, res) => {
  try {
    const { name, code, baseCost = 0, freeThreshold, currency = 'NZD', active = true } = req.body;
    if (!name?.trim() || !code?.trim()) return res.status(400).json({ message: 'Name and code are required' });

    const db   = getDb();
    const snap = await db.collection('shippingCountries').where('code', '==', code.trim().toUpperCase()).limit(1).get();
    if (!snap.empty) return res.status(400).json({ message: `Country code ${code.toUpperCase()} already exists` });

    const id     = newId();
    const now    = new Date().toISOString();
    const base   = parseFloat(baseCost) || 0;
    const country = { name: name.trim(), code: code.trim().toUpperCase(), baseCost: base, freeThreshold: freeThreshold != null ? parseFloat(freeThreshold) : null, currency: currency.trim().toUpperCase(), active, createdAt: now };
    await db.collection('shippingCountries').doc(id).set(country);

    // Auto-seed three method tiers
    const methods = [
      { methodId: 'standard',  label: 'Standard Shipping',  description: '5–10 business days', cost: base },
      { methodId: 'express',   label: 'Express Shipping',   description: '2–4 business days',  cost: Math.round(base * 1.8 * 100) / 100 },
      { methodId: 'overnight', label: 'Overnight Shipping', description: 'Next business day',  cost: Math.round(base * 3.0 * 100) / 100 },
    ];
    const batch = db.batch();
    const methodDocs = [];
    for (const m of methods) {
      const mId = newId();
      batch.set(db.collection('shippingMethods').doc(mId), { ...m, countryId: id, active: true, createdAt: now });
      methodDocs.push({ id: mId, countryId: id, ...m, active: true });
    }
    await batch.commit();

    res.status(201).json({ message: 'Country added', country: { id, ...country, methods: methodDocs } });
  } catch (err) { res.status(500).json({ message: 'Failed to add country' }); }
};

export const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, baseCost, freeThreshold, currency, active } = req.body;
    const data = {};
    if (name !== undefined)          data.name = name.trim();
    if (baseCost !== undefined)      data.baseCost = parseFloat(baseCost);
    if (freeThreshold !== undefined) data.freeThreshold = freeThreshold === '' || freeThreshold === null ? null : parseFloat(freeThreshold);
    if (currency !== undefined)      data.currency = currency.trim().toUpperCase();
    if (active !== undefined)        data.active = active;

    const snap = await getDb().collection('shippingCountries').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'Country not found' });
    await snap.ref.update(data);
    res.json({ message: 'Country updated', country: { id, ...snap.data(), ...data } });
  } catch (err) { res.status(500).json({ message: 'Failed to update country' }); }
};

export const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const db   = getDb();
    const mSnap = await db.collection('shippingMethods').where('countryId', '==', id).get();
    const batch = db.batch();
    mSnap.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection('shippingCountries').doc(id));
    await batch.commit();
    res.json({ message: 'Country deleted' });
  } catch (err) { res.status(500).json({ message: 'Failed to delete country' }); }
};

// ── Admin: Methods ────────────────────────────────────────────────────────────
export const getAdminMethods = async (req, res) => {
  try {
    const db   = getDb();
    const snap = await db.collection('shippingMethods').get();
    const methods = [];
    for (const d of snap.docs) {
      const m = { id: d.id, ...d.data() };
      const cSnap = await db.collection('shippingCountries').doc(m.countryId).get();
      m.country = cSnap.exists ? { name: cSnap.data().name, code: cSnap.data().code } : null;
      methods.push(m);
    }
    res.json({ methods });
  } catch (err) { res.status(500).json({ message: 'Failed to get shipping methods' }); }
};

export const updateMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, description, cost, active } = req.body;
    const data = {};
    if (label !== undefined)       data.label = label.trim();
    if (description !== undefined) data.description = description.trim();
    if (cost !== undefined)        data.cost = parseFloat(cost);
    if (active !== undefined)      data.active = active;

    const snap = await getDb().collection('shippingMethods').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'Method not found' });
    await snap.ref.update(data);
    res.json({ message: 'Method updated', method: { id, ...snap.data(), ...data } });
  } catch (err) { res.status(500).json({ message: 'Failed to update method' }); }
};
