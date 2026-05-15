import { z } from 'zod';
import { getDb, newId, docToObj, snapToArr } from '../lib/firebase.js';
import { getShippingCost } from '../utils/shipping.js';
import { sendOrderConfirmation, sendOrderStatusUpdate, sendAdminOrderNotification } from '../services/email.service.js';

const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string(),
    quantity:  z.coerce.number().int().min(1),
  })).min(1),
  addressId:       z.string().optional(),
  shippingAddress: z.object({
    fullName:   z.string(),
    phone:      z.string(),
    line1:      z.string(),
    line2:      z.string().optional(),
    city:       z.string(),
    state:      z.string(),
    country:    z.string(),
    postalCode: z.string(),
  }).optional(),
  guestEmail:     z.string().email().optional(),
  guestName:      z.string().optional(),
  paymentMethod:  z.enum(['stripe', 'google_pay']),
  couponCode:     z.string().optional(),
  giftWrap:       z.coerce.boolean().default(false),
  giftNote:       z.string().optional(),
  shippingCost:   z.coerce.number().min(0).optional(),
  shippingMethod: z.string().default('standard'),
});

const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `GR-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// ── createOrder ───────────────────────────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    const data   = orderSchema.parse(req.body);
    const userId = req.user?.id;
    const db     = getDb();

    if (!userId && !data.guestEmail)
      return res.status(400).json({ message: 'Email is required for guest checkout' });

    let subtotal = 0;
    const orderItems = [];

    for (const item of data.items) {
      const vSnap   = await db.collection('variants').doc(item.variantId).get();
      const variant = docToObj(vSnap);
      if (!variant) return res.status(400).json({ message: `Variant not found: ${item.variantId}` });

      const pSnap   = await db.collection('products').doc(variant.productId).get();
      const product = docToObj(pSnap);
      if (!product) return res.status(400).json({ message: `Product not found` });

      if (variant.stock < item.quantity)
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });

      subtotal += product.price * item.quantity;
      orderItems.push({
        productId: product.id,
        name:      product.name,
        image:     product.images?.[0] || '',
        size:      variant.size,
        color:     variant.color,
        quantity:  item.quantity,
        price:     product.price,
      });
    }

    // ── Coupon ────────────────────────────────────────────────────────────────
    let discount = 0;
    let couponId = null;
    if (data.couponCode) {
      const cSnap = await db.collection('coupons')
        .where('code', '==', data.couponCode.toUpperCase()).limit(1).get();
      if (!cSnap.empty) {
        const coupon = { id: cSnap.docs[0].id, ...cSnap.docs[0].data() };
        if (coupon.active && coupon.usedCount < coupon.usageLimit && new Date(coupon.expiryDate) > new Date()) {
          discount = coupon.type === 'percentage' ? subtotal * (coupon.value / 100) : coupon.value;
          couponId = coupon.id;
          await cSnap.docs[0].ref.update({ usedCount: coupon.usedCount + 1 });
        }
      }
    }

    // ── Address ───────────────────────────────────────────────────────────────
    let addressId = data.addressId;
    let shippingSnap;

    if (userId && addressId) {
      const aSnap   = await db.collection('addresses').doc(addressId).get();
      const address = docToObj(aSnap);
      if (!address || address.userId !== userId)
        return res.status(400).json({ message: 'Invalid address' });
      shippingSnap = {
        fullName: address.fullName, phone: address.phone,
        line1: address.line1, line2: address.line2,
        city: address.city, state: address.state,
        country: address.country, postalCode: address.postalCode,
      };
    } else if (data.shippingAddress) {
      shippingSnap = data.shippingAddress;
      if (userId) {
        const newAddrId = newId();
        await db.collection('addresses').doc(newAddrId).set({
          userId, ...data.shippingAddress,
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        addressId = newAddrId;
      }
    } else {
      return res.status(400).json({ message: 'Shipping address is required' });
    }

    // ── Shipping cost ─────────────────────────────────────────────────────────
    const expectedShipping = await getShippingCost(shippingSnap.country, data.shippingMethod);
    let shippingCost;
    if (data.shippingCost !== undefined) {
      if (Math.abs(data.shippingCost - expectedShipping) > 0.01)
        return res.status(400).json({ message: `Shipping cost mismatch. Expected $${expectedShipping.toFixed(2)}.` });
      shippingCost = data.shippingCost;
    } else {
      shippingCost = expectedShipping;
    }

    const total = subtotal + shippingCost - discount + (data.giftWrap ? 5 : 0);

    const orderId = newId();
    const now     = new Date().toISOString();
    const order   = {
      orderNumber:    generateOrderNumber(),
      status:         'PENDING',
      userId:         userId || null,
      guestEmail:     userId ? null : data.guestEmail,
      guestName:      userId ? null : data.guestName || null,
      addressId:      addressId || null,
      shippingSnap,
      paymentMethod:  data.paymentMethod,
      shippingMethod: data.shippingMethod || 'standard',
      shippingCost,
      total,
      couponCode:     data.couponCode?.toUpperCase() || null,
      discount,
      giftWrap:       data.giftWrap,
      giftNote:       data.giftNote || null,
      stripePayId:    null,
      items:          orderItems,
      createdAt:      now,
      updatedAt:      now,
    };
    await db.collection('orders').doc(orderId).set(order);

    // ── Decrement stock ───────────────────────────────────────────────────────
    for (const item of data.items) {
      const vSnap = await db.collection('variants').doc(item.variantId).get();
      if (vSnap.exists) await vSnap.ref.update({ stock: vSnap.data().stock - item.quantity });
    }

    // ── Resolve email recipient ───────────────────────────────────────────────
    let emailUser = { name: data.guestName || shippingSnap.fullName, email: data.guestEmail };
    if (userId) {
      const uSnap = await db.collection('users').doc(userId).get();
      if (uSnap.exists) emailUser = { name: uSnap.data().name, email: uSnap.data().email };
    }

    // ── Send emails — awaited so Vercel doesn't kill them early ──────────────
    const orderWithId = { ...order, id: orderId };

    try {
      const result = await sendOrderConfirmation(orderWithId, emailUser, orderItems);
      if (!result.success) console.error('❌ Order confirmation email failed:', result.error);
      else console.log('✅ Order confirmation sent to:', emailUser.email);
    } catch (err) {
      console.error('❌ Order confirmation email error:', err);
    }

    try {
      const result = await sendAdminOrderNotification(orderWithId, emailUser, orderItems);
      if (!result.success) console.error('❌ Admin notification email failed:', result.error);
      else console.log('✅ Admin notification sent');
    } catch (err) {
      console.error('❌ Admin notification email error:', err);
    }

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: orderId,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
};

// ── getMyOrders ───────────────────────────────────────────────────────────────
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const db   = getDb();
    const snap = await db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    const all    = snapToArr(snap);
    const total  = all.length;
    const pageN  = parseInt(page), limitN = parseInt(limit);
    const orders = all.slice((pageN - 1) * limitN, pageN * limitN);
    res.json({ orders, pagination: { page: pageN, limit: limitN, total, pages: Math.ceil(total / limitN) } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get orders' });
  }
};

// ── getOrder ──────────────────────────────────────────────────────────────────
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const snap   = await getDb().collection('orders').doc(id).get();
    const order  = docToObj(snap);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.userId && order.userId !== userId && req.user?.role !== 'super_admin')
      return res.status(403).json({ message: 'Access denied' });
    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get order' });
  }
};

// ── getAllOrders ───────────────────────────────────────────────────────────────
export const getAllOrders = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const db   = getDb();
    const snap = status
      ? await db.collection('orders').where('status', '==', status).orderBy('createdAt', 'desc').get()
      : await db.collection('orders').orderBy('createdAt', 'desc').get();

    let orders = snapToArr(snap);

    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(o =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.guestEmail?.toLowerCase().includes(q)
      );
    }

    const total = orders.length;
    const pageN = parseInt(page), limitN = parseInt(limit);
    const paged = orders.slice((pageN - 1) * limitN, pageN * limitN);

    // Attach user info
    for (const o of paged) {
      if (o.userId) {
        const uSnap = await db.collection('users').doc(o.userId).get();
        o.user = uSnap.exists ? { name: uSnap.data().name, email: uSnap.data().email } : null;
      }
    }

    res.json({ orders: paged, pagination: { page: pageN, limit: limitN, total, pages: Math.ceil(total / limitN) } });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Failed to get orders' });
  }
};

// ── updateStatus ──────────────────────────────────────────────────────────────
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const db   = getDb();
    const snap = await db.collection('orders').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'Order not found' });

    const orderData = snap.data();
    const now = new Date().toISOString();
    await snap.ref.update({ status, updatedAt: now });

    const updated = { id, ...orderData, status, updatedAt: now };

    // ── Resolve email recipient ───────────────────────────────────────────────
    let emailUser = null;

    if (orderData.userId) {
      const uSnap = await db.collection('users').doc(orderData.userId).get();
      if (uSnap.exists && uSnap.data().email) {
        emailUser = {
          name:  uSnap.data().name || orderData.shippingSnap?.fullName || 'Valued Customer',
          email: uSnap.data().email,
        };
        console.log('✅ Found registered user for status email:', emailUser.email);
      } else {
        console.warn('⚠️ User doc missing or no email for userId:', orderData.userId);
      }
    }

    if (!emailUser?.email && orderData.guestEmail) {
      emailUser = {
        name:  orderData.guestName || orderData.shippingSnap?.fullName || 'Valued Customer',
        email: orderData.guestEmail,
      };
      console.log('✅ Using guest email for status update:', emailUser.email);
    }

    if (!emailUser?.email) {
      console.error(`❌ No email found for order ${updated.orderNumber} (ID: ${id})`);
    }

    // ── Send status email — awaited so Vercel doesn't kill it early ───────────
    if (emailUser?.email) {
      try {
        const result = await sendOrderStatusUpdate(updated, emailUser);
        if (!result.success) console.error('❌ Status email failed:', result.error);
        else console.log('✅ Status update email sent to:', emailUser.email, '| Status:', status);
      } catch (err) {
        console.error('❌ Status email error:', err);
      }
    }

    res.json({ message: 'Order status updated', order: updated });
  } catch (error) {
    console.error('❌ Update status error:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
};