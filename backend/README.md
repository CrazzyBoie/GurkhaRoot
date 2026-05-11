# Gurkha Roots — Firebase + Vercel Backend

Migrated from **PostgreSQL (Prisma)** → **Firebase Firestore** and from a long-running Express server → **Vercel Serverless Functions**.

---

## Architecture

```
/
├── api/
│   ├── index.js               ← Vercel entry point (exports Express app)
│   ├── app.js                 ← Express app factory (no app.listen)
│   ├── lib/
│   │   └── firebase.js        ← Firebase Admin SDK singleton + helpers
│   ├── config/
│   │   └── passport.js        ← Google OAuth (reads from Firestore)
│   ├── controllers/           ← All business logic (Firestore instead of Prisma)
│   ├── middleware/
│   │   ├── auth.middleware.js ← JWT + Firestore user lookup
│   │   └── upload.middleware.js ← multer → Firebase Storage
│   ├── routes/                ← Unchanged route definitions
│   ├── services/
│   │   └── email.service.js   ← Nodemailer (unchanged)
│   └── utils/
│       ├── jwt.js             ← JWT helpers (unchanged)
│       └── shipping.js        ← Shipping cost lookup (Firestore)
├── vercel.json                ← Vercel routing config
├── firestore.indexes.json     ← Required composite indexes
├── firestore.rules            ← Lockdown rules (server-side only)
├── package.json
└── .env.example
```

---

## Firestore Collections

| Collection            | Replaces Prisma model    |
|-----------------------|--------------------------|
| `users`               | User                     |
| `products`            | Product                  |
| `variants`            | Variant                  |
| `orders`              | Order (items embedded)   |
| `addresses`           | Address                  |
| `coupons`             | Coupon                   |
| `reviews`             | Review                   |
| `wishlists`           | Wishlist                 |
| `shippingCountries`   | ShippingCountry          |
| `shippingMethods`     | ShippingMethod           |

> **Note:** `OrderItem` rows are now embedded inside each `orders` document as an `items` array (de-normalised), which is idiomatic Firestore and avoids an extra round-trip.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env vars
cp .env.example .env
# Fill in all values in .env

# 3. Start
npm run dev
# Server runs at http://localhost:5000
```

---

## Firebase Setup

### 1. Create Firebase project
- Go to https://console.firebase.google.com
- Create a new project (or reuse existing)
- Enable **Firestore Database** (start in production mode)
- Enable **Storage**

### 2. Service account key
- Firebase Console → Project Settings → Service Accounts
- Click **Generate new private key** → download JSON
- Copy values into `.env`:
  - `FIREBASE_PROJECT_ID` = `project_id`
  - `FIREBASE_CLIENT_EMAIL` = `client_email`
  - `FIREBASE_PRIVATE_KEY` = `private_key` (keep the `\n` newlines)
  - `FIREBASE_STORAGE_BUCKET` = `project_id.appspot.com`

### 3. Deploy Firestore indexes
```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore:indexes
firebase deploy --only firestore:rules
```

### 4. Firebase Storage CORS (for image uploads)
Create `cors.json`:
```json
[{"origin":["*"],"method":["GET"],"maxAgeSeconds":3600}]
```
```bash
gsutil cors set cors.json gs://your-project-id.appspot.com
```

---

## Vercel Deployment

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Deploy
```bash
cd /path/to/gurkha-firebase
vercel --prod
```

### 3. Set environment variables in Vercel
Either via the dashboard (**Project → Settings → Environment Variables**) or CLI:

```bash
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_PRIVATE_KEY      # paste the whole key including newlines
vercel env add FIREBASE_STORAGE_BUCKET
vercel env add JWT_ACCESS_SECRET
vercel env add JWT_REFRESH_SECRET
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_CALLBACK_URL       # https://your-domain.vercel.app/api/auth/google/callback
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_CURRENCY
vercel env add SMTP_HOST
vercel env add SMTP_PORT
vercel env add SMTP_USER
vercel env add SMTP_PASS
vercel env add ADMIN_EMAIL
vercel env add CLIENT_URL               # https://your-frontend.vercel.app
vercel env add SHIPPING_RATE_NZ
vercel env add SHIPPING_RATE_AU
vercel env add SHIPPING_RATE_DEFAULT
```

### 4. Update Google OAuth redirect URI
In Google Cloud Console → APIs & Services → Credentials → your OAuth client:
- Add `https://your-domain.vercel.app/api/auth/google/callback` to **Authorized redirect URIs**

### 5. Update Stripe webhook
In Stripe Dashboard → Webhooks:
- Add endpoint: `https://your-domain.vercel.app/api/payments/webhook`
- Listen to `payment_intent.succeeded`

---

## Key Differences from Original

| Original (Prisma/PostgreSQL)          | New (Firebase/Vercel)                    |
|---------------------------------------|------------------------------------------|
| `prisma.user.findUnique({where:{id}})` | `db.collection('users').doc(id).get()`  |
| `prisma.user.findFirst({where:{...}})` | `db.collection('users').where(...).get()` |
| `prisma.user.create({data})` | `db.collection('users').doc(id).set(data)` |
| `prisma.user.update({where, data})` | `snap.ref.update(data)` |
| `prisma.variant.deleteMany({where})` | batch delete via `db.collection().where().get()` |
| Local disk image storage (`/uploads/`) | Firebase Storage (public CDN URLs) |
| `app.listen(PORT)` | `export default app` (Vercel wraps it) |
| Prisma migrations | Firestore is schema-less; indexes via `firestore.indexes.json` |

---

## Firestore Limitations vs PostgreSQL

1. **No complex JOINs** — user names are fetched in separate queries when needed (acceptable at this scale).
2. **No full-text search** — `search` filters are applied in-memory after fetching. For large catalogues, consider Algolia or Firestore's experimental vector search.
3. **Compound queries** require composite indexes — all needed ones are in `firestore.indexes.json`.
4. **Transactions** — use `db.runTransaction()` for atomic operations in high-concurrency scenarios (e.g., stock decrement).

---

## Stripe Webhook Note

Vercel Serverless Functions do support raw body for webhooks. The Express middleware `express.raw()` is already registered before `express.json()` in `app.js`, so Stripe signature verification works correctly.
