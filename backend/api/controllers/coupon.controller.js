import { z } from 'zod';
import { getDb, newId, docToObj, snapToArr } from '../lib/firebase.js';

const couponSchema = z.object({
  code:       z.string().min(3),
  type:       z.enum(['percentage', 'fixed']),
  value:      z.coerce.number().positive(),
  usageLimit: z.coerce.number().int().min(1),
  expiryDate: z.string().datetime(),
  active:     z.coerce.boolean().default(true),
});

export const validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code is required' });

    const db   = getDb();
    const snap = await db.collection('coupons').where('code', '==', code.toUpperCase()).limit(1).get();
    if (snap.empty)               return res.status(400).json({ message: 'Invalid coupon code' });

    const coupon = { id: snap.docs[0].id, ...snap.docs[0].data() };
    if (!coupon.active)                        return res.status(400).json({ message: 'This coupon is no longer active' });
    if (coupon.usedCount >= coupon.usageLimit)  return res.status(400).json({ message: 'This coupon has reached its usage limit' });
    if (new Date(coupon.expiryDate) < new Date()) return res.status(400).json({ message: 'This coupon has expired' });

    const discount = coupon.type === 'percentage'
      ? (cartTotal || 0) * (coupon.value / 100)
      : coupon.value;

    res.json({ valid: true, coupon: { code: coupon.code, type: coupon.type, value: coupon.value }, discount: Math.round(discount * 100) / 100 });
  } catch (error) { res.status(500).json({ message: 'Failed to validate coupon' }); }
};

export const getCoupons = async (req, res) => {
  try {
    const { active, page = 1, limit = 20 } = req.query;
    const db = getDb();
    let snap = active !== undefined
      ? await db.collection('coupons').where('active', '==', active === 'true').orderBy('createdAt', 'desc').get()
      : await db.collection('coupons').orderBy('createdAt', 'desc').get();

    const all    = snapToArr(snap);
    const total  = all.length;
    const pageN  = parseInt(page), limitN = parseInt(limit);
    const coupons = all.slice((pageN - 1) * limitN, pageN * limitN);
    res.json({ coupons, pagination: { page: pageN, limit: limitN, total, pages: Math.ceil(total / limitN) } });
  } catch (error) { res.status(500).json({ message: 'Failed to get coupons' }); }
};

export const createCoupon = async (req, res) => {
  try {
    const data = couponSchema.parse(req.body);
    const db   = getDb();
    const code = data.code.toUpperCase();

    const existing = await db.collection('coupons').where('code', '==', code).limit(1).get();
    if (!existing.empty) return res.status(400).json({ message: 'Coupon code already exists' });

    const id  = newId();
    const now = new Date().toISOString();
    const coupon = { ...data, code, usedCount: 0, createdAt: now };
    await db.collection('coupons').doc(id).set(coupon);
    res.status(201).json({ message: 'Coupon created successfully', coupon: { id, ...coupon } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Failed to create coupon' });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const data   = couponSchema.partial().parse(req.body);
    const db     = getDb();
    const snap   = await db.collection('coupons').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'Coupon not found' });

    if (data.code) data.code = data.code.toUpperCase();
    await snap.ref.update(data);
    res.json({ message: 'Coupon updated successfully', coupon: { id, ...snap.data(), ...data } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Failed to update coupon' });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const snap   = await getDb().collection('coupons').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'Coupon not found' });
    await snap.ref.delete();
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) { res.status(500).json({ message: 'Failed to delete coupon' }); }
};
