import { z } from 'zod';
import { getDb, newId, docToObj, snapToArr } from '../lib/firebase.js';

const reviewSchema = z.object({
  rating:  z.coerce.number().int().min(1).max(5),
  comment: z.string().min(1),
});

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const db   = getDb();
    let snap;
    try {
      snap = await db.collection('reviews').where('productId', '==', productId).orderBy('createdAt', 'desc').get();
    } catch {
      snap = await db.collection('reviews').where('productId', '==', productId).get();
    }
    const all  = snapToArr(snap);

    // Attach user names
    for (const r of all) {
      const uSnap = await db.collection('users').doc(r.userId).get();
      r.user = uSnap.exists ? { name: uSnap.data().name } : { name: 'Unknown' };
    }

    const total = all.length;
    const pageN = parseInt(page), limitN = parseInt(limit);
    const reviews = all.slice((pageN - 1) * limitN, pageN * limitN);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    all.forEach(r => { distribution[r.rating]++; totalRating += r.rating; });
    const average = total > 0 ? Math.round((totalRating / total) * 10) / 10 : 0;

    res.json({ reviews, stats: { average, total, distribution }, pagination: { page: pageN, limit: limitN, total, pages: Math.ceil(total / limitN) } });
  } catch (error) { res.status(500).json({ message: 'Failed to get reviews' }); }
};

export const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const data = reviewSchema.parse(req.body);
    const userId = req.user.id;
    const db   = getDb();

    const pSnap = await db.collection('products').doc(productId).get();
    if (!pSnap.exists) return res.status(404).json({ message: 'Product not found' });

    const existing = await db.collection('reviews')
      .where('productId', '==', productId).where('userId', '==', userId).limit(1).get();
    if (!existing.empty) return res.status(400).json({ message: 'You have already reviewed this product' });

    const purchased = await db.collection('orders')
      .where('userId', '==', userId).where('status', '==', 'DELIVERED').get();
    const hasPurchased = snapToArr(purchased).some(o => o.items?.some(i => i.productId === productId));

    const id  = newId();
    const now = new Date().toISOString();
    const review = { productId, userId, rating: data.rating, comment: data.comment, createdAt: now };
    await db.collection('reviews').doc(id).set(review);

    const uSnap = await db.collection('users').doc(userId).get();
    res.status(201).json({ message: 'Review submitted successfully', review: { id, ...review, user: { name: uSnap.data()?.name } }, verifiedPurchase: hasPurchased });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Failed to create review' });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const data   = reviewSchema.partial().parse(req.body);
    const snap   = await getDb().collection('reviews').doc(id).get();
    const review = docToObj(snap);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.userId !== req.user.id) return res.status(403).json({ message: 'You can only edit your own reviews' });
    await snap.ref.update(data);
    res.json({ message: 'Review updated successfully', review: { ...review, ...data } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Failed to update review' });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { id }  = req.params;
    const snap    = await getDb().collection('reviews').doc(id).get();
    const review  = docToObj(snap);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.userId !== req.user.id && req.user.role !== 'super_admin')
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    await snap.ref.delete();
    res.json({ message: 'Review deleted successfully' });
  } catch (error) { res.status(500).json({ message: 'Failed to delete review' }); }
};