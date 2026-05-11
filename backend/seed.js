/**
 * seed.js — Firestore Seeder for Nepali Clothing Store
 * Usage: node seed.js
 */

import 'dotenv/config';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Init Firebase ─────────────────────────────────────────────────────────────
const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('❌ Missing Firebase env vars. Check your .env file.');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

// ── Helper ────────────────────────────────────────────────────────────────────
const newId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

// ── Seed Data ─────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Starting Firestore seed...\n');

  // Clean existing collections (optional but recommended for dev)
  const collectionsToClean = ['products', 'variants', 'users', 'orders', 'orderItems', 
                            'addresses', 'shippingCountries', 'shippingMethods', 
                            'coupons', 'reviews', 'wishlists'];

  console.log('🧹 Cleaning existing data...');
  for (const coll of collectionsToClean) {
    const snapshot = await db.collection(coll).get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  // === 1. Users ===
  console.log('👥 Seeding users...');
  const users = [
    {
      id: newId(),
      name: 'Ram Bahadur',
      email: 'ram@example.com',
      passwordHash: '$2a$10$examplehash123456789', // In real app, use bcrypt
      role: 'customer',
      phone: '+977 9841234567',
      createdAt: new Date().toISOString(),
    },
    {
      id: newId(),
      name: 'Sita Sharma',
      email: 'sita@example.com',
      passwordHash: '$2a$10$examplehash123456789',
      role: 'customer',
      phone: '+977 9861234567',
      createdAt: new Date().toISOString(),
    },
    {
      id: newId(),
      name: 'Admin User',
      email: 'admin@nepalistore.com',
      passwordHash: '$2a$10$examplehash123456789',
      role: 'super_admin',
      phone: '+977 9800000001',
      createdAt: new Date().toISOString(),
    },
  ];

  for (const user of users) {
    await db.collection('users').doc(user.id).set(user);
  }

  // === 2. Clothing Products + Variants ===
  console.log('👕 Seeding clothing products...');

  const products = [
    {
      name: 'Dhaka Topi Hat',
      description: 'Traditional Nepali Dhaka fabric topi hat. Handwoven with intricate patterns.',
      category: 'Clothing & Accessories',
      price: 24.99,
      material: 'Dhaka Fabric',
      featured: true,
      newArrival: true,
      images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/clothing/hat.jpg'],
    },
    {
      name: 'Pashmina Shawl',
      description: 'Luxurious 100% pure Himalayan pashmina shawl. Extremely soft and warm.',
      category: 'Clothing & Accessories',
      price: 149.99,
      material: 'Pure Pashmina',
      featured: true,
      newArrival: false,
      images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/clothing/shawl.jpg'],
    },
    {
      name: 'Kurta Suruwal Set',
      description: 'Traditional Nepali men\'s Kurta Suruwal in premium cotton with Dhaka accents.',
      category: 'Clothing & Accessories',
      price: 89.99,
      material: 'Cotton + Dhaka',
      featured: false,
      newArrival: true,
      images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/clothing/kurta.jpg'],
    },
    {
      name: 'Nepali Women\'s Blouse',
      description: 'Hand-embroidered traditional Nepali blouse with mirror work.',
      category: 'Clothing & Accessories',
      price: 45.99,
      material: 'Cotton Silk',
      featured: true,
      newArrival: false,
      images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/clothing/blouse.jpg'],
    },
    {
      name: 'Gurkha Wool Jacket',
      description: 'Warm woolen jacket inspired by Gurkha heritage.',
      category: 'Clothing & Accessories',
      price: 119.99,
      material: 'Nepali Wool',
      featured: false,
      newArrival: true,
      images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/clothing/jacket.jpg'],
    },
  ];

  for (const p of products) {
    const productId = newId();
    await db.collection('products').doc(productId).set({
      ...p,
      createdAt: new Date().toISOString(),
    });

    // Variants
    const variants = [
      { size: 'S', color: 'Natural', colorHex: '#C4A882', stock: 15 },
      { size: 'M', color: 'Natural', colorHex: '#C4A882', stock: 25 },
      { size: 'L', color: 'Natural', colorHex: '#C4A882', stock: 12 },
      { size: 'XL', color: 'Maroon', colorHex: '#800000', stock: 8 },
    ];

    const batch = db.batch();
    for (const v of variants) {
      batch.set(db.collection('variants').doc(newId()), {
        ...v,
        productId,
        createdAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  }

  // === 3. Shipping Countries & Methods ===
  console.log('🚚 Seeding shipping data...');

  const shippingCountries = [
    { name: 'New Zealand', code: 'NZ', baseCost: 12, freeThreshold: 150, currency: 'NZD', active: true },
    { name: 'Australia', code: 'AU', baseCost: 18, freeThreshold: 200, currency: 'NZD', active: true },
    { name: 'Nepal', code: 'NP', baseCost: 5, freeThreshold: 80, currency: 'NPR', active: true },
    { name: 'United States', code: 'US', baseCost: 28, freeThreshold: 300, currency: 'NZD', active: true },
    { name: 'United Kingdom', code: 'GB', baseCost: 25, freeThreshold: 250, currency: 'NZD', active: true },
  ];

  for (const country of shippingCountries) {
    const countryId = newId();
    await db.collection('shippingCountries').doc(countryId).set({
      ...country,
      createdAt: new Date().toISOString(),
    });

    const methods = [
      { methodId: 'standard', label: 'Standard Shipping', description: '5–10 business days', cost: country.baseCost, active: true },
      { methodId: 'express', label: 'Express Shipping', description: '2–4 business days', cost: Math.round(country.baseCost * 1.8 * 100) / 100, active: true },
      { methodId: 'overnight', label: 'Overnight Shipping', description: 'Next business day', cost: Math.round(country.baseCost * 3 * 100) / 100, active: true },
    ];

    const batch = db.batch();
    for (const m of methods) {
      batch.set(db.collection('shippingMethods').doc(newId()), {
        ...m,
        countryId,
        createdAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  }

  // === 4. Coupon ===
  console.log('🎟️ Seeding coupon...');
  await db.collection('coupons').doc(newId()).set({
    code: 'GURKHA15',
    type: 'percentage',
    value: 15,
    usageLimit: 200,
    usedCount: 0,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    createdAt: new Date().toISOString(),
  });

  // === 5. Sample Addresses, Reviews, Wishlists ===
  console.log('📦 Seeding sample addresses, reviews & wishlists...');

  const ramId = users[0].id;

  // Address
  await db.collection('addresses').doc(newId()).set({
    userId: ramId,
    fullName: 'Ram Bahadur',
    phone: '+977 9841234567',
    line1: 'Thamel, Kathmandu',
    city: 'Kathmandu',
    state: 'Bagmati',
    country: 'Nepal',
    postalCode: '44600',
    isDefault: true,
    createdAt: new Date().toISOString(),
  });

  // Wishlist
  const firstProduct = (await db.collection('products').limit(1).get()).docs[0].id;
  await db.collection('wishlists').doc(newId()).set({
    userId: ramId,
    productId: firstProduct,
    createdAt: new Date().toISOString(),
  });

  // Review
  await db.collection('reviews').doc(newId()).set({
    productId: firstProduct,
    userId: ramId,
    rating: 5,
    comment: 'Beautiful quality and very authentic! Love it ❤️',
    createdAt: new Date().toISOString(),
  });

  console.log('\n✨ Firestore seeding completed successfully!\n');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});