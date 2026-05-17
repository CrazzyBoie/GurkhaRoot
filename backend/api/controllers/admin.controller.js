// ─── admin.controller.js ─────────────────────────────────────────────────────
import { getDb, snapToArr, docToObj } from '../lib/firebase.js';

export const getStats = async (req, res) => {
  try {
    const db = getDb();
    const [orderSnap, productSnap, userSnap, variantSnap] = await Promise.all([
      db.collection('orders').get(),
      db.collection('products').get(),
      db.collection('users').get(),
      db.collection('variants').get(),
    ]);

    const orders   = snapToArr(orderSnap);
    const variants = snapToArr(variantSnap);

    const totalRevenue   = orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + (o.total || 0), 0);
    const totalOrders    = orders.length;
    const pendingOrders  = orders.filter(o => o.status === 'PENDING').length;
    const totalProducts  = productSnap.size;
    const totalUsers     = userSnap.size;
    const lowStockCount  = variants.filter(v => v.stock < 5).length;

    res.json({ stats: { totalRevenue: Math.round(totalRevenue * 100) / 100, totalOrders, totalProducts, totalUsers, pendingOrders, lowStockCount } });
  } catch (error) { res.status(500).json({ message: 'Failed to get stats' }); }
};

export const getSalesChart = async (req, res) => {
  try {
    const days      = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snap   = await getDb().collection('orders').where('status', '!=', 'CANCELLED').get();
    const orders = snapToArr(snap).filter(o => new Date(o.createdAt) >= startDate);

    const salesByDate = {};
    for (let i = 0; i < days; i++) {
      const d    = new Date();
      d.setDate(d.getDate() - i);
      salesByDate[d.toISOString().split('T')[0]] = 0;
    }
    orders.forEach(o => {
      const d = o.createdAt?.split('T')[0];
      if (d && salesByDate[d] !== undefined) salesByDate[d] += o.total || 0;
    });

    const chartData = Object.entries(salesByDate)
      .map(([date, sales]) => ({ date, sales: Math.round(sales * 100) / 100 }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ chartData });
  } catch (error) { res.status(500).json({ message: 'Failed to get sales chart' }); }
};

export const getLowStock = async (req, res) => {
  try {
    const db      = getDb();
    const snap    = await db.collection('variants').where('stock', '<', 5).get();
    const variants = [];
    for (const d of snap.docs) {
      const v = { id: d.id, ...d.data() };
      const pSnap = await db.collection('products').doc(v.productId).get();
      v.product = pSnap.exists ? { id: pSnap.id, name: pSnap.data().name, images: pSnap.data().images } : null;
      variants.push(v);
    }
    variants.sort((a, b) => a.stock - b.stock);
    res.json({ variants });
  } catch (error) { res.status(500).json({ message: 'Failed to get low stock items' }); }
};

export const getRecentOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const db    = getDb();
    const snap  = await db.collection('orders').orderBy('createdAt', 'desc').limit(limit).get();
    const orders = [];
    for (const d of snap.docs) {
      const o = { id: d.id, ...d.data() };
      if (o.userId) {
        const uSnap = await db.collection('users').doc(o.userId).get();
        o.user = uSnap.exists ? { name: uSnap.data().name, email: uSnap.data().email } : null;
      }
      orders.push(o);
    }
    res.json({ orders });
  } catch (error) { res.status(500).json({ message: 'Failed to get recent orders' }); }
};

// ── getStockOverview ──────────────────────────────────────────────────────────
// Returns every variant with: currentStock, damagedStock, soldQty (from orders)
// Orphaned variants (productId points to a deleted product) are excluded.
export const getStockOverview = async (req, res) => {
  try {
    const db = getDb();

    const [variantSnap, productSnap, orderSnap] = await Promise.all([
      db.collection('variants').get(),
      db.collection('products').get(),
      db.collection('orders').where('status', '!=', 'CANCELLED').get(),
    ]);

    const variants = snapToArr(variantSnap);
    const products = {};
    productSnap.forEach(d => { products[d.id] = { id: d.id, ...d.data() }; });

    // Collect orphaned variant IDs (productId not in products map)
    const orphanIds = variants.filter(v => !products[v.productId]).map(v => v.id);

    // Auto-delete orphans in a batch so they don't accumulate
    if (orphanIds.length > 0) {
      console.log(`Auto-deleting ${orphanIds.length} orphaned variant(s):`, orphanIds);
      const batch = db.batch();
      orphanIds.forEach(id => batch.delete(db.collection('variants').doc(id)));
      await batch.commit();
    }

    // Tally sold quantities per variantId from order items
    const soldByVariant = {};
    snapToArr(orderSnap).forEach(order => {
      (order.items || []).forEach(item => {
        if (item.variantId) {
          soldByVariant[item.variantId] = (soldByVariant[item.variantId] || 0) + (item.quantity || 0);
        }
      });
    });

    // Only include variants whose product exists
    const result = variants
      .filter(v => products[v.productId])
      .map(v => ({
        id:           v.id,
        productId:    v.productId,
        productName:  products[v.productId].name,
        productImage: products[v.productId].images?.[0] || null,
        size:         v.size,
        color:        v.color,
        colorHex:     v.colorHex,
        stock:        v.stock,
        damagedStock: v.damagedStock || 0,
        soldQty:      soldByVariant[v.id] || 0,
      }));

    // Sort: low stock first
    result.sort((a, b) => a.stock - b.stock);

    res.json({ variants: result, orphansRemoved: orphanIds.length });
  } catch (error) {
    console.error('Stock overview error:', error);
    res.status(500).json({ message: 'Failed to get stock overview' });
  }
};

// ── cleanupOrphanedVariants ───────────────────────────────────────────────────
// POST /admin/cleanup-variants — manual trigger to purge orphaned variants
export const cleanupOrphanedVariants = async (req, res) => {
  try {
    const db = getDb();
    const [variantSnap, productSnap] = await Promise.all([
      db.collection('variants').get(),
      db.collection('products').get(),
    ]);

    const productIds = new Set();
    productSnap.forEach(d => productIds.add(d.id));

    const orphans = snapToArr(variantSnap).filter(v => !productIds.has(v.productId));

    if (orphans.length === 0) {
      return res.json({ message: 'No orphaned variants found', deleted: 0 });
    }

    const batch = db.batch();
    orphans.forEach(v => batch.delete(db.collection('variants').doc(v.id)));
    await batch.commit();

    res.json({ message: `Deleted ${orphans.length} orphaned variant(s)`, deleted: orphans.length });
  } catch (error) {
    console.error('Cleanup orphans error:', error);
    res.status(500).json({ message: 'Failed to cleanup orphaned variants' });
  }
};

// ── updateDamagedStock ────────────────────────────────────────────────────────
// PATCH /admin/variants/:id/damaged  { damagedQty: number }
// Adds to damagedStock and subtracts from available stock so item is off the shop.
export const updateDamagedStock = async (req, res) => {
  try {
    const { id }         = req.params;
    const { damagedQty } = req.body;

    if (typeof damagedQty !== 'number' || !Number.isInteger(damagedQty) || damagedQty < 0)
      return res.status(400).json({ message: 'damagedQty must be a non-negative integer' });

    const db   = getDb();
    const snap = await db.collection('variants').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'Variant not found' });

    const variant     = { id: snap.id, ...snap.data() };
    const currentDmg  = variant.damagedStock || 0;
    const delta       = damagedQty - currentDmg;          // how much to add/remove
    const newStock    = Math.max(0, (variant.stock || 0) - delta);

    await snap.ref.update({ damagedStock: damagedQty, stock: newStock });

    // Also keep embedded variants array in the parent product doc in sync
    const pSnap = await db.collection('products').doc(variant.productId).get();
    if (pSnap.exists) {
      const embeddedVariants = (pSnap.data().variants || []).map(ev =>
        ev.id === id ? { ...ev, damagedStock: damagedQty, stock: newStock } : ev
      );
      await pSnap.ref.update({ variants: embeddedVariants });
    }

    res.json({ message: 'Damaged stock updated', variant: { ...variant, damagedStock: damagedQty, stock: newStock } });
  } catch (error) {
    console.error('Update damaged stock error:', error);
    res.status(500).json({ message: 'Failed to update damaged stock' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['customer', 'inventory_manager', 'super_admin'];
    if (!validRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (id === req.user.id)        return res.status(400).json({ message: 'Cannot change your own role' });

    const snap = await getDb().collection('users').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'User not found' });
    await snap.ref.update({ role });

    const { passwordHash, refreshToken, ...safe } = { id, ...snap.data(), role };
    res.json({ message: 'User role updated successfully', user: safe });
  } catch (error) { res.status(500).json({ message: 'Failed to update user role' }); }
};