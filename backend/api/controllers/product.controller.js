import { z } from 'zod';
import { getDb, newId, snapToArr, docToObj } from '../lib/firebase.js';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary once (reads from env vars automatically if set,
// but we set them explicitly to be safe)
cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
});

// ── Extract Cloudinary public_id from a secure_url ────────────────────────────
// e.g. https://res.cloudinary.com/dyjaubiz7/image/upload/v1234/gurkha-roots/products/abc123.jpg
// → "gurkha-roots/products/abc123"
const getPublicId = (url) => {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    // Strip version segment (v1234567/) if present
    const withoutVersion = parts[1].replace(/^v\d+\//, '');
    // Strip file extension
    return withoutVersion.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
};

// Delete an array of Cloudinary image URLs — fire-and-forget safe
const deleteCloudinaryImages = async (urls = []) => {
  const publicIds = urls.map(getPublicId).filter(Boolean);
  if (!publicIds.length) return;
  try {
    await Promise.all(publicIds.map(id => cloudinary.uploader.destroy(id)));
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
};

const productSchema = z.object({
  name:        z.string().min(1),
  description: z.string().min(1),
  category:    z.string().min(1),
  price:       z.coerce.number().positive(),
  material:    z.string().min(1),
  featured:    z.coerce.boolean().default(false),
  newArrival:  z.coerce.boolean().default(false),
  variants:    z.array(z.object({
    size:     z.string(),
    color:    z.string(),
    colorHex: z.string(),
    stock:    z.coerce.number().int().min(0),
  })).min(1),
});

// ── getProducts ───────────────────────────────────────────────────────────────
export const getProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, sort, featured, newArrival, page = 1, limit = 12 } = req.query;
    const db = getDb();

    let query = db.collection('products');

    if (category) query = query.where('category', '==', category);
    if (featured === 'true')   query = query.where('featured',   '==', true);
    if (newArrival === 'true') query = query.where('newArrival', '==', true);

    let snap = await query.get();
    let products = snapToArr(snap);

    // Client-side filters (Firestore limitation without composite indexes)
    if (minPrice) products = products.filter(p => p.price >= parseFloat(minPrice));
    if (maxPrice) products = products.filter(p => p.price <= parseFloat(maxPrice));
    if (search)   products = products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    );

    // Bulk-fetch ALL variants and reviews in 2 queries instead of 2-per-product
    const productIds = products.map(p => p.id);
    const chunkSize  = 30; // Firestore `in` limit

    const allVariants = [];
    const allReviews  = [];

    for (let i = 0; i < productIds.length; i += chunkSize) {
      const chunk = productIds.slice(i, i + chunkSize);
      if (!chunk.length) break;

      const [vSnap, rSnap] = await Promise.all([
        db.collection('variants').where('productId', 'in', chunk).get(),
        db.collection('reviews').where('productId',  'in', chunk).get(),
      ]);
      allVariants.push(...snapToArr(vSnap));
      allReviews.push(...snapToArr(rSnap));
    }

    // Group by productId for O(1) lookup
    const variantsByProduct = {};
    for (const v of allVariants) {
      if (!variantsByProduct[v.productId]) variantsByProduct[v.productId] = [];
      variantsByProduct[v.productId].push(v);
    }
    const reviewsByProduct = {};
    for (const r of allReviews) {
      if (!reviewsByProduct[r.productId]) reviewsByProduct[r.productId] = [];
      reviewsByProduct[r.productId].push(r);
    }

    // Attach variants + review aggregates to each product
    for (const p of products) {
      p.variants    = variantsByProduct[p.id] || [];
      const reviews = reviewsByProduct[p.id]  || [];
      p.reviewCount = reviews.length;
      p.rating = reviews.length
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 0;
    }

    // Sort
    if (sort === 'price_asc')  products.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') products.sort((a, b) => b.price - a.price);
    else products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const total = products.length;
    const pageN = parseInt(page);
    const limitN = parseInt(limit);
    const paginated = products.slice((pageN - 1) * limitN, pageN * limitN);

    res.json({ products: paginated, pagination: { page: pageN, limit: limitN, total, pages: Math.ceil(total / limitN) } });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to get products' });
  }
};

// ── getProduct ────────────────────────────────────────────────────────────────
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const db     = getDb();
    const snap   = await db.collection('products').doc(id).get();
    const product = docToObj(snap);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Variants
    const varSnap = await db.collection('variants').where('productId', '==', id).get();
    product.variants = snapToArr(varSnap);

    // Reviews with user name — try ordered query first; fall back to unordered
    // (unordered is used when the composite index hasn't been deployed yet)
    let rSnap;
    try {
      rSnap = await db.collection('reviews').where('productId', '==', id)
        .orderBy('createdAt', 'desc').get();
    } catch {
      rSnap = await db.collection('reviews').where('productId', '==', id).get();
    }
    // Batch-fetch all reviewer user docs in parallel instead of one-by-one
    const rawReviews = rSnap.docs.map(rdoc => ({ id: rdoc.id, ...rdoc.data() }));
    const uniqueUserIds = [...new Set(rawReviews.map(r => r.userId).filter(Boolean))];
    const userMap = {};
    if (uniqueUserIds.length) {
      const userSnaps = await Promise.all(
        uniqueUserIds.map(uid => db.collection('users').doc(uid).get())
      );
      userSnaps.forEach(uSnap => {
        if (uSnap.exists) userMap[uSnap.id] = { name: uSnap.data().name };
      });
    }
    const reviews = rawReviews.map(r => ({
      ...r,
      user: userMap[r.userId] || { name: 'Unknown' },
    }));
    product.reviews     = reviews;
    product.reviewCount = reviews.length;
    product.rating      = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Failed to get product' });
  }
};

// ── createProduct ─────────────────────────────────────────────────────────────
export const createProduct = async (req, res) => {
  try {
    let body = { ...req.body };
    if (typeof body.variants === 'string') body.variants = JSON.parse(body.variants);

    const data   = productSchema.parse(body);
    // Images arrive as an array of Cloudinary URLs (uploaded directly from the browser)
    const images = Array.isArray(body.images) ? body.images : (body.images ? [body.images] : []);
    const db     = getDb();
    const id     = newId();
    const now    = new Date().toISOString();

    await db.collection('products').doc(id).set({ ...data, images, createdAt: now });

    // Store variants in collection AND embed in product doc (both must stay in sync)
    const batch = db.batch();
    const variantsWithIds = [];
    for (const v of data.variants) {
      const vId = newId();
      batch.set(db.collection('variants').doc(vId), { ...v, productId: id });
      variantsWithIds.push({ ...v, id: vId, productId: id });
    }
    await batch.commit();
    // Embed variants array in product doc so admin edit page reads correct stock
    await db.collection('products').doc(id).update({ variants: variantsWithIds });

    const varSnap = await db.collection('variants').where('productId', '==', id).get();
    res.status(201).json({ message: 'Product created successfully', product: { id, ...data, images, createdAt: now, variants: snapToArr(varSnap) } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
};

// ── updateProduct ─────────────────────────────────────────────────────────────
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let body = { ...req.body };
    if (typeof body.variants === 'string') body.variants = JSON.parse(body.variants);

    // Pre-coerce form-data strings before Zod sees them
    if (typeof body.featured   === 'string') body.featured   = body.featured   === 'true';
    if (typeof body.newArrival === 'string') body.newArrival = body.newArrival === 'true';
    if (typeof body.price      === 'string') body.price      = parseFloat(body.price);

    const data = productSchema.partial().parse(body);
    const db   = getDb();
    const snap = await db.collection('products').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'Product not found' });

    const updateData = { ...data };

    // Images arrive as a pre-built array of Cloudinary URLs from the frontend
    // (kept existing URLs + any newly uploaded URLs, already merged client-side)
    if (Array.isArray(body.images)) {
      // Find images that were removed so we can delete them from Cloudinary
      const previousImages = snap.data().images || [];
      const removedImages  = previousImages.filter(url => !body.images.includes(url));
      updateData.images = body.images;
      // Delete removed images from Cloudinary after we confirm the update succeeds
      if (removedImages.length > 0) {
        // We'll delete after the Firestore write so we don't orphan on DB failure
        updateData._removedImages = removedImages;
      }
    }
    delete updateData.variants;

    // Only call update() when there is at least one field to write
    if (Object.keys(updateData).length > 0) {
      await snap.ref.update(updateData);
    }

    if (data.variants) {
      // Replace variants in collection
      const oldVars = await db.collection('variants').where('productId', '==', id).get();
      const delBatch = db.batch();
      oldVars.forEach(d => delBatch.delete(d.ref));
      await delBatch.commit();

      const addBatch = db.batch();
      const variantsWithIds = [];
      for (const v of data.variants) {
        const vId = newId();
        addBatch.set(db.collection('variants').doc(vId), { ...v, productId: id });
        variantsWithIds.push({ ...v, id: vId, productId: id });
      }
      await addBatch.commit();
      // Keep embedded array in product doc in sync so admin stock counts match
      await snap.ref.update({ variants: variantsWithIds });
    }

    const varSnap = await db.collection('variants').where('productId', '==', id).get();
    const removedImages = updateData._removedImages || [];
    delete updateData._removedImages;
    const product = { id, ...snap.data(), ...updateData, variants: snapToArr(varSnap) };

    // Delete removed images from Cloudinary now that Firestore update succeeded
    await deleteCloudinaryImages(removedImages);

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
};

// ── deleteProduct ─────────────────────────────────────────────────────────────
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const db     = getDb();
    const snap   = await db.collection('products').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'Product not found' });

    const productData = snap.data();

    // Delete variants + product doc from Firestore
    const varSnap = await db.collection('variants').where('productId', '==', id).get();
    const batch   = db.batch();
    varSnap.forEach(d => batch.delete(d.ref));
    batch.delete(snap.ref);
    await batch.commit();

    // Delete all associated images from Cloudinary (after Firestore succeeds)
    await deleteCloudinaryImages(productData.images || []);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

// ── bulkImport ────────────────────────────────────────────────────────────────
export const bulkImport = async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || !products.length)
      return res.status(400).json({ message: 'Invalid products data' });

    const db      = getDb();
    const results = { success: 0, failed: 0, errors: [] };
    const now     = new Date().toISOString();

    for (const pd of products) {
      try {
        const validated = productSchema.parse(pd);
        const id = newId();
        await db.collection('products').doc(id).set({ ...validated, images: pd.images || [], createdAt: now });
        const batch = db.batch();
        for (const v of validated.variants) batch.set(db.collection('variants').doc(newId()), { ...v, productId: id });
        await batch.commit();
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ product: pd.name || 'Unknown', error: e.message });
      }
    }

    res.json({ message: 'Bulk import completed', results });
  } catch (error) {
    res.status(500).json({ message: 'Failed to import products' });
  }
};

// ── getCategories ─────────────────────────────────────────────────────────────
export const getCategories = async (req, res) => {
  try {
    const db = getDb();
    // Use select() to fetch only the 'category' field — avoids transferring
    // images, descriptions, variants etc. for every product doc
    const snap = await db.collection('products').select('category').get();
    const countMap = {};
    snap.forEach(d => {
      const cat = d.data().category;
      if (cat) countMap[cat] = (countMap[cat] || 0) + 1;
    });
    const categories = Object.entries(countMap).map(([name, count]) => ({ name, count }));
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get categories' });
  }
};