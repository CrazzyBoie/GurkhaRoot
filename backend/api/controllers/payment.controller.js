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
