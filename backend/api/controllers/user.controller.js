import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getDb, newId, docToObj, snapToArr } from '../lib/firebase.js';

const updateProfileSchema = z.object({
  name:  z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const addressSchema = z.object({
  fullName:   z.string().min(1),
  phone:      z.string().min(1),
  line1:      z.string().min(1),
  line2:      z.string().optional(),
  city:       z.string().min(1),
  state:      z.string().min(1),
  country:    z.string().min(1),
  postalCode: z.string().min(1),
  isDefault:  z.coerce.boolean().default(false),
});

// ── Profile ───────────────────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const snap = await getDb().collection('users').doc(req.user.id).get();
    const user = docToObj(snap);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { passwordHash, refreshToken, ...safe } = user;
    res.json({ user: safe });
  } catch (error) { res.status(500).json({ message: 'Failed to get profile' }); }
};

export const updateProfile = async (req, res) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const db   = getDb();
    if (data.email) {
      const snap = await db.collection('users').where('email', '==', data.email).limit(1).get();
      if (!snap.empty && snap.docs[0].id !== req.user.id)
        return res.status(400).json({ message: 'Email already in use' });
    }
    await db.collection('users').doc(req.user.id).update(data);
    const updated = docToObj(await db.collection('users').doc(req.user.id).get());
    const { passwordHash, refreshToken, ...safe } = updated;
    res.json({ message: 'Profile updated successfully', user: safe });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'Current and new password (min 6 chars) required' });

    const snap = await getDb().collection('users').doc(req.user.id).get();
    const user = docToObj(snap);
    if (!user.passwordHash) return res.status(400).json({ message: 'Cannot change password for social accounts' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

    await snap.ref.update({ passwordHash: await bcrypt.hash(newPassword, 10) });
    res.json({ message: 'Password changed successfully' });
  } catch (error) { res.status(500).json({ message: 'Failed to change password' }); }
};

// ── Addresses ─────────────────────────────────────────────────────────────────
export const getAddresses = async (req, res) => {
  try {
    const snap = await getDb().collection('addresses').where('userId', '==', req.user.id).get();
    let addrs  = snapToArr(snap).sort((a, b) => (b.isDefault ? 1 : -1));
    res.json({ addresses: addrs });
  } catch (error) { res.status(500).json({ message: 'Failed to get addresses' }); }
};

export const addAddress = async (req, res) => {
  try {
    const data = addressSchema.parse(req.body);
    const db   = getDb();
    const now  = new Date().toISOString();
    if (data.isDefault) {
      const existing = await db.collection('addresses').where('userId', '==', req.user.id).get();
      const batch    = db.batch();
      existing.forEach(d => batch.update(d.ref, { isDefault: false }));
      await batch.commit();
    }
    const id = newId();
    await db.collection('addresses').doc(id).set({ userId: req.user.id, ...data, createdAt: now, updatedAt: now });
    res.status(201).json({ message: 'Address added successfully', address: { id, userId: req.user.id, ...data, createdAt: now } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Failed to add address' });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const data   = addressSchema.partial().parse(req.body);
    const db     = getDb();
    const snap   = await db.collection('addresses').doc(id).get();
    const addr   = docToObj(snap);
    if (!addr || addr.userId !== req.user.id) return res.status(404).json({ message: 'Address not found' });

    if (data.isDefault) {
      const existing = await db.collection('addresses').where('userId', '==', req.user.id).get();
      const batch    = db.batch();
      existing.forEach(d => { if (d.id !== id) batch.update(d.ref, { isDefault: false }); });
      await batch.commit();
    }
    await snap.ref.update({ ...data, updatedAt: new Date().toISOString() });
    res.json({ message: 'Address updated successfully', address: { ...addr, ...data } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
    res.status(500).json({ message: 'Failed to update address' });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const snap   = await getDb().collection('addresses').doc(id).get();
    const addr   = docToObj(snap);
    if (!addr || addr.userId !== req.user.id) return res.status(404).json({ message: 'Address not found' });
    await snap.ref.delete();
    res.json({ message: 'Address deleted successfully' });
  } catch (error) { res.status(500).json({ message: 'Failed to delete address' }); }
};

// ── Wishlist ──────────────────────────────────────────────────────────────────
export const getWishlist = async (req, res) => {
  try {
    const db   = getDb();
    const snap = await db.collection('wishlists').where('userId', '==', req.user.id).get();
    const items = [];
    for (const d of snap.docs) {
      const w = { id: d.id, ...d.data() };
      const pSnap = await db.collection('products').doc(w.productId).get();
      if (pSnap.exists) {
        w.product = { id: pSnap.id, ...pSnap.data() };
        const vSnap = await db.collection('variants').where('productId', '==', w.productId).get();
        w.product.variants = snapToArr(vSnap);
      }
      items.push(w);
    }
    res.json({ wishlist: items });
  } catch (error) { res.status(500).json({ message: 'Failed to get wishlist' }); }
};

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const db = getDb();
    const pSnap = await db.collection('products').doc(productId).get();
    if (!pSnap.exists) return res.status(404).json({ message: 'Product not found' });

    const existing = await db.collection('wishlists')
      .where('userId', '==', req.user.id).where('productId', '==', productId).limit(1).get();
    if (!existing.empty) return res.status(400).json({ message: 'Product already in wishlist' });

    const id  = newId();
    const now = new Date().toISOString();
    await db.collection('wishlists').doc(id).set({ userId: req.user.id, productId, createdAt: now });
    res.status(201).json({ message: 'Added to wishlist', wishlistItem: { id, userId: req.user.id, productId } });
  } catch (error) { res.status(500).json({ message: 'Failed to add to wishlist' }); }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const db = getDb();
    const snap = await db.collection('wishlists')
      .where('userId', '==', req.user.id).where('productId', '==', productId).limit(1).get();
    if (snap.empty) return res.status(404).json({ message: 'Product not in wishlist' });
    await snap.docs[0].ref.delete();
    res.json({ message: 'Removed from wishlist' });
  } catch (error) { res.status(500).json({ message: 'Failed to remove from wishlist' }); }
};

// ── Admin user management ─────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const db   = getDb();
    let users  = snapToArr(await db.collection('users').get());

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    if (role) users = users.filter(u => u.role === role);

    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total  = users.length;
    const pageN  = parseInt(page), limitN = parseInt(limit);
    const paged  = users.slice((pageN - 1) * limitN, pageN * limitN).map(({ passwordHash, refreshToken, ...u }) => u);

    res.json({ users: paged, pagination: { page: pageN, limit: limitN, total, pages: Math.ceil(total / limitN) } });
  } catch (error) { res.status(500).json({ message: 'Failed to get users' }); }
};

export const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body;
    if (id === req.user.id) return res.status(400).json({ message: 'Use your profile page to edit your own account' });

    const db   = getDb();
    const snap = await db.collection('users').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'User not found' });

    const validRoles = ['customer', 'inventory_manager', 'super_admin'];
    if (role && !validRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const update = {};
    if (name)  update.name  = name;
    if (email) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (role)  update.role  = role;

    await snap.ref.update(update);
    const updated = { id, ...snap.data(), ...update };
    const { passwordHash, refreshToken, ...safe } = updated;
    res.json({ message: 'User updated successfully', user: safe });
  } catch (error) { res.status(500).json({ message: 'Failed to update user' }); }
};

export const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ message: 'Cannot delete your own account' });
    const snap = await getDb().collection('users').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'User not found' });
    await snap.ref.delete();
    res.json({ message: 'User deleted successfully' });
  } catch (error) { res.status(500).json({ message: 'Failed to delete user' }); }
};

export const adminSetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (id === req.user.id) return res.status(400).json({ message: 'Use your profile page to change your own password' });
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const snap = await getDb().collection('users').doc(id).get();
    if (!snap.exists) return res.status(404).json({ message: 'User not found' });

    await snap.ref.update({ passwordHash: await bcrypt.hash(password, 10), refreshToken: null });
    res.json({ message: `Password updated for ${snap.data().name}` });
  } catch (error) { res.status(500).json({ message: 'Failed to set password' }); }
};

export const adminCreateUser = async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const validRoles = ['customer', 'inventory_manager', 'super_admin'];
    if (role && !validRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const db   = getDb();
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!snap.empty) return res.status(409).json({ message: 'A user with this email already exists' });

    const id  = newId();
    const now = new Date().toISOString();
    const user = { name, email, phone: phone || null, role: role || 'customer', passwordHash: await bcrypt.hash(password, 10), googleId: null, refreshToken: null, createdAt: now };
    await db.collection('users').doc(id).set(user);
    const { passwordHash, refreshToken, ...safe } = { id, ...user };
    res.status(201).json({ message: 'User created successfully', user: safe });
  } catch (error) { res.status(500).json({ message: 'Failed to create user' }); }
};
