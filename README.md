# Gurkha Roots — Full Stack Project

**Stack:** React + TypeScript (frontend) · Express + Firebase Firestore + Vercel Functions (backend) · Cloudinary (images) · Stripe (payments)

```
gurkha-roots/
├── frontend/   ← React + Vite + TailwindCSS + shadcn/ui
└── backend/    ← Express API → Vercel Serverless Functions + Firebase Firestore
```

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in all values
npm run dev            # http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL and VITE_STRIPE_PUBLISHABLE_KEY
npm run dev            # http://localhost:5173
```

## Deployment

### Backend → Vercel
```bash
cd backend
vercel --prod
# Set all env vars from .env.example in Vercel dashboard
```

### Frontend → Vercel
```bash
cd frontend
vercel --prod
# Set VITE_API_URL=https://your-backend.vercel.app
# Set VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Key Services to Set Up
1. **Firebase** — Firestore database (see `backend/README.md` for full setup)
2. **Cloudinary** — image hosting (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
3. **Stripe** — payments (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`)
4. **Google OAuth** — social login (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
5. **SMTP** — transactional emails (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`)

See `backend/README.md` for detailed instructions on each service.
