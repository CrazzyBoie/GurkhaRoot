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
