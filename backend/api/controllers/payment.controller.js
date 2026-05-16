import Stripe from 'stripe';
import { getDb } from '../lib/firebase.js';

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('your_stripe')) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key);
};

export const createPaymentIntent = async (req, res) => {
  try {
    const { amount, orderId, paymentMethod } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid amount is required' });

    const pi = await getStripe().paymentIntents.create({
      amount:   Math.round(amount * 100),
      currency: process.env.STRIPE_CURRENCY || 'nzd',
      automatic_payment_methods: { enabled: true },
      metadata: { orderId: orderId || '', userId: req.user?.id || 'guest', paymentMethod: paymentMethod || 'stripe' },
    });

    res.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
  } catch (error) {
    console.error('Create payment intent error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to create payment intent' });
  }
};

// ── NEW: Refund payment when admin cancels order ───────────────────────────
// ── refundPayment ────────────────────────────────────────────────────────────
export const refundPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'Order ID is required' });

    const db = getDb();
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderData = orderDoc.data();
    console.log('🔍 Order data:', JSON.stringify(orderData, null, 2));

    const stripePayId = orderData.stripePayId || orderData.paymentIntentId;
    console.log('🔍 stripePayId found:', stripePayId);

    if (!stripePayId) {
      return res.status(400).json({ message: 'No payment found for this order' });
    }

    if (orderData.refundStatus === 'refunded') {
      return res.status(400).json({ message: 'Order has already been refunded' });
    }

    // ── CRITICAL: Verify the PaymentIntent exists and is refundable ──────────
    let paymentIntent;
    try {
      paymentIntent = await getStripe().paymentIntents.retrieve(stripePayId, {
        expand: ['charges.data', 'latest_charge']
      });
      console.log('🔍 PaymentIntent status:', paymentIntent.status);
      console.log('🔍 PaymentIntent amount:', paymentIntent.amount);
      console.log('🔍 Charges count:', paymentIntent.charges?.data?.length);
    } catch (stripeErr) {
      console.error('🔴 Stripe retrieve error:', stripeErr.message);
      return res.status(400).json({ 
        message: `Stripe error: ${stripeErr.message}. Check if you're using the correct API key (test vs live).` 
      });
    }

    // Must be succeeded to refund
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        message: `Cannot refund: Payment status is "${paymentIntent.status}". Only "succeeded" payments can be refunded.` 
      });
    }

    // Create refund
    console.log('🔍 Creating refund for payment_intent:', stripePayId);
    const refund = await getStripe().refunds.create({
      payment_intent: stripePayId,
      reason: 'requested_by_customer',
    });

    console.log('✅ Refund created:', refund.id, 'Status:', refund.status);

    // Update order
    await orderDoc.ref.update({
      status:       'CANCELLED',
      refundStatus: 'refunded',
      refundId:     refund.id,
      refundAmount: refund.amount / 100,
      refundedAt:   new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    });

    res.json({ 
      success: true, 
      message: 'Payment refunded successfully',
      refundId: refund.id,
      refundAmount: refund.amount / 100,
      stripeStatus: refund.status
    });
  } catch (error) {
    console.error('🔴 Refund error:', error.message);
    console.error('🔴 Full error:', error);
    res.status(500).json({ message: error.message || 'Failed to process refund' });
  }
};

export const webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    if (pi.metadata.orderId) {
      const db = getDb();
      await db.collection('orders').doc(pi.metadata.orderId).update({
        stripePayId: pi.id,
        status:      'PROCESSING',
        updatedAt:   new Date().toISOString(),
      }).catch(console.error);
    }
  }

  res.json({ received: true });
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const pi = await getStripe().paymentIntents.retrieve(paymentIntentId);
    res.json({ status: pi.status, amount: pi.amount / 100, currency: pi.currency });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get payment status' });
  }
};