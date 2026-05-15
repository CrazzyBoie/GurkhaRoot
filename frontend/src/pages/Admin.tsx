import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart2, Package, ShoppingBag, Users, Tag, AlertTriangle,
  Plus, Trash2, Edit2, X, Upload, Search, UserCog, Shield, ShieldCheck, KeyRound, Eye, EyeOff,
  Truck, Globe, Zap, Clock, Check, Pencil, Download, Copy, CalendarRange, UserPlus,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { adminApi, productsApi, ordersApi, couponsApi, userApi, adminShippingApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { useAuthStore } from '../stores';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED:    'bg-purple-100 text-purple-800',
  DELIVERED:  'bg-green-100 text-green-800',
  CANCELLED:  'bg-red-100 text-red-800',
};

const ROLE_STYLES: Record<string, string> = {
  customer:          'bg-gray-100 text-gray-700',
  inventory_manager: 'bg-blue-100 text-blue-700',
  super_admin:       'bg-[#DC143C]/20 text-[#8a6e3e]',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  customer:          <Users className="w-3 h-3" />,
  inventory_manager: <UserCog className="w-3 h-3" />,
  super_admin:       <ShieldCheck className="w-3 h-3" />,
};

const METHOD_ICONS: Record<string, React.ReactNode> = {
  standard:  <Truck className="w-4 h-4 text-blue-400" />,
  express:   <Zap className="w-4 h-4 text-yellow-400" />,
  overnight: <Clock className="w-4 h-4 text-purple-400" />,
};

export function Admin() {
  // ── Clean URL routing: /admin/:tab ─────────────────────────────────────────
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab = tab || 'dashboard';
  const setTab = (t: string) => navigate(`/admin/${t}`);

  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [dashDateFrom, setDashDateFrom] = useState('');
  const [dashDateTo, setDashDateTo] = useState('');
  const [dashDateRange, setDashDateRange] = useState(30);

  // ── Products ───────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<any[]>([]);
  const [productPage, setProductPage] = useState(1);
  const [productPages, setProductPages] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    name: '', description: '', category: '', price: '', material: '',
    featured: false, newArrival: false,
    variants: [{ size: '', color: '', colorHex: '#000000', stock: '' }],
  });
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [showBulkProductForm, setShowBulkProductForm] = useState(false);
  const [bulkProductCount, setBulkProductCount] = useState(5);
  const [bulkBaseForm, setBulkBaseForm] = useState({
    name: '', description: '', category: '', price: '', material: '',
    featured: false, newArrival: false,
    variants: [{ size: '', color: '', colorHex: '#000000', stock: '' }],
  });
  const [bulkImageFiles, setBulkImageFiles] = useState<FileList | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // ── Orders ─────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<any[]>([]);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPages, setOrderPages] = useState(1);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');

  // ── Coupons ────────────────────────────────────────────────────────────────
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [couponForm, setCouponForm] = useState({
    code: '', type: 'percentage', value: '', usageLimit: '', expiryDate: '', active: true,
  });
  const [savingCoupon, setSavingCoupon] = useState(false);

  // ── Users ──────────────────────────────────────────────────────────────────
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', role: 'customer' });
  const [savingUser, setSavingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [setPasswordUser, setSetPasswordUser] = useState<any>(null);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ name: '', email: '', phone: '', role: 'customer', password: '' });
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [savingCreateUser, setSavingCreateUser] = useState(false);

  // ── Shipping ───────────────────────────────────────────────────────────────
  const [shippingSubTab, setShippingSubTab] = useState<'countries' | 'methods'>('countries');
  const [shippingCountries, setShippingCountries] = useState<any[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<any>(null);
  const [countryForm, setCountryForm] = useState({
    name: '', code: '', baseCost: '', freeThreshold: '', currency: 'NZD', active: true,
  });
  const [savingCountry, setSavingCountry] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [methodForm, setMethodForm] = useState({
    label: '', description: '', cost: '', active: true,
  });
  const [savingMethod, setSavingMethod] = useState(false);

  // ── Tab load effects ───────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
    if (activeTab === 'products') loadProducts();
    if (activeTab === 'orders' && isSuperAdmin) loadOrders();
    if (activeTab === 'coupons' && isSuperAdmin) loadCoupons();
    if (activeTab === 'users' && isSuperAdmin) loadUsers();
    if (activeTab === 'shipping') loadShipping();
  }, [activeTab, productPage, orderPage, usersPage]);

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadDashboard = async () => {
    try {
      const [statsRes, chartRes, ordersRes, stockRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getSalesChart(dashDateRange),
        adminApi.getRecentOrders(5),
        adminApi.getLowStock(),
      ]);
      setStats(statsRes.data.stats);
      setChartData(chartRes.data.chartData);
      setRecentOrders(ordersRes.data.orders);
      setLowStock(stockRes.data.variants);
    } catch {
      toast.error('Failed to load dashboard data');
    }
  };

  const loadProducts = async () => {
    try {
      const res = await productsApi.getProducts({ page: productPage, limit: 10, search: productSearch || undefined });
      setProducts(res.data.products);
      setProductPages(res.data.pagination.pages);
    } catch {
      toast.error('Failed to load products');
    }
  };

  const loadOrders = async () => {
    try {
      const res = await ordersApi.getAllOrders({ page: orderPage, limit: 15, search: orderSearch || undefined, status: orderStatus || undefined });
      setOrders(res.data.orders);
      setOrderPages(res.data.pagination.pages);
    } catch {
      toast.error('Failed to load orders');
    }
  };

  const loadCoupons = async () => {
    try {
      const res = await couponsApi.getCoupons();
      setCoupons(res.data.coupons || []);
    } catch {
      toast.error('Failed to load coupons');
    }
  };

  const loadUsers = async () => {
    try {
      const res = await userApi.getAllUsers({ page: usersPage, limit: 15, search: userSearch || undefined, role: userRoleFilter || undefined });
      setUsersList(res.data.users);
      setUsersPages(res.data.pagination.pages);
      setUsersTotal(res.data.pagination.total);
    } catch {
      toast.error('Failed to load users');
    }
  };

  const loadShipping = async () => {
    setShippingLoading(true);
    try {
      const [countriesRes] = await Promise.all([
        adminShippingApi.getCountries(),
        adminShippingApi.getMethods(),
      ]);
      setShippingCountries(countriesRes.data.countries || []);
    } catch {
      toast.error('Failed to load shipping data');
    } finally {
      setShippingLoading(false);
    }
  };

  // ── Products ───────────────────────────────────────────────────────────────
  const openProductForm = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name, description: product.description,
        category: product.category, price: String(product.price),
        material: product.material, featured: product.featured,
        newArrival: product.newArrival,
        variants: product.variants?.length > 0
          ? product.variants.map((v: any) => ({ size: v.size, color: v.color, colorHex: v.colorHex, stock: String(v.stock) }))
          : [{ size: '', color: '', colorHex: '#000000', stock: '' }],
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', description: '', category: '', price: '', material: '', featured: false, newArrival: false, variants: [{ size: '', color: '', colorHex: '#000000', stock: '' }] });
    }
    setImageFiles(null);
    setShowProductForm(true);
  };

  const handleSaveProduct = async () => {
    setSavingProduct(true);
    try {
      const formData = new FormData();
      formData.append('name', productForm.name);
      formData.append('description', productForm.description);
      formData.append('category', productForm.category);
      formData.append('price', productForm.price);
      formData.append('material', productForm.material);
      formData.append('featured', String(productForm.featured));
      formData.append('newArrival', String(productForm.newArrival));
      formData.append('variants', JSON.stringify(productForm.variants.map(v => ({ ...v, stock: parseInt(v.stock) || 0 }))));
      if (imageFiles) Array.from(imageFiles).forEach(file => formData.append('images', file));
      if (editingProduct) {
        await productsApi.updateProduct(editingProduct.id, formData);
        toast.success('Product updated');
      } else {
        await productsApi.createProduct(formData);
        toast.success('Product created');
      }
      setShowProductForm(false);
      loadProducts();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productsApi.deleteProduct(id);
      toast.success('Product deleted');
      loadProducts();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  // ── Orders ─────────────────────────────────────────────────────────────────
  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      await ordersApi.updateStatus(id, status);
      toast.success('Order status updated');
      loadOrders();
    } catch {
      toast.error('Failed to update order status');
    }
  };

  // ── Coupons ────────────────────────────────────────────────────────────────
  const openCouponForm = (coupon?: any) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm({
        code: coupon.code, type: coupon.type, value: String(coupon.value),
        usageLimit: String(coupon.usageLimit),
        expiryDate: new Date(coupon.expiryDate).toISOString().split('T')[0],
        active: coupon.active,
      });
    } else {
      setEditingCoupon(null);
      setCouponForm({ code: '', type: 'percentage', value: '', usageLimit: '', expiryDate: '', active: true });
    }
    setShowCouponForm(true);
  };

  const closeCouponForm = () => { setShowCouponForm(false); setEditingCoupon(null); };

  const handleSaveCoupon = async () => {
    if (!couponForm.code.trim()) { toast.error('Coupon code is required'); return; }
    if (!couponForm.value || parseFloat(couponForm.value) <= 0) { toast.error('Value must be greater than 0'); return; }
    if (!couponForm.usageLimit || parseInt(couponForm.usageLimit) <= 0) { toast.error('Usage limit must be greater than 0'); return; }
    if (!couponForm.expiryDate) { toast.error('Expiry date is required'); return; }
    setSavingCoupon(true);
    try {
      const payload = {
        code: couponForm.code.toUpperCase().trim(), type: couponForm.type,
        value: parseFloat(couponForm.value), usageLimit: parseInt(couponForm.usageLimit),
        expiryDate: new Date(couponForm.expiryDate).toISOString(), active: couponForm.active,
      };
      if (editingCoupon) {
        await couponsApi.updateCoupon(editingCoupon.id, payload);
        toast.success('Coupon updated successfully');
      } else {
        await couponsApi.createCoupon(payload);
        toast.success('Coupon created successfully');
      }
      closeCouponForm();
      loadCoupons();
    } catch (e: any) {
      toast.error(e.response?.data?.message || `Failed to ${editingCoupon ? 'update' : 'create'} coupon`);
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try { await couponsApi.deleteCoupon(id); toast.success('Coupon deleted'); loadCoupons(); }
    catch { toast.error('Failed to delete coupon'); }
  };

  const handleToggleCoupon = async (coupon: any) => {
    try {
      await couponsApi.updateCoupon(coupon.id, { active: !coupon.active });
      toast.success(coupon.active ? 'Coupon deactivated' : 'Coupon activated');
      loadCoupons();
    } catch { toast.error('Failed to toggle coupon status'); }
  };

  // ── Users ──────────────────────────────────────────────────────────────────
  const openUserModal = (u: any) => {
    setEditingUser(u);
    setUserForm({ name: u.name, email: u.email, phone: u.phone || '', role: u.role });
    setShowUserModal(true);
  };
  const closeUserModal = () => { setShowUserModal(false); setEditingUser(null); };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      await userApi.updateUser(editingUser.id, userForm);
      toast.success('User updated successfully');
      closeUserModal();
      loadUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update user');
    } finally { setSavingUser(false); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    setDeletingUserId(id);
    try {
      await userApi.deleteUser(id);
      toast.success('User deleted');
      loadUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete user');
    } finally { setDeletingUserId(null); }
  };

  const openResetModal = (u: any) => { setSetPasswordUser(u); setNewPassword(''); setShowPassword(false); setShowSetPasswordModal(true); };
  const closeResetModal = () => { setShowSetPasswordModal(false); setSetPasswordUser(null); setNewPassword(''); };

  const handleSendPasswordReset = async () => {
    if (!setPasswordUser || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPassword(true);
    try {
      const res = await userApi.adminSetPassword(setPasswordUser.id, newPassword);
      toast.success(res.data.message || 'Password updated successfully');
      closeResetModal();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to set password');
    } finally { setSavingPassword(false); }
  };

  const handleUserSearch = () => { setUsersPage(1); loadUsers(); };

  // ── Shipping: Countries ────────────────────────────────────────────────────
  const openCountryModal = (country?: any) => {
    if (country) {
      setEditingCountry(country);
      setCountryForm({
        name: country.name, code: country.code, baseCost: String(country.baseCost),
        freeThreshold: country.freeThreshold != null ? String(country.freeThreshold) : '',
        currency: country.currency, active: country.active,
      });
    } else {
      setEditingCountry(null);
      setCountryForm({ name: '', code: '', baseCost: '0', freeThreshold: '', currency: 'NZD', active: true });
    }
    setShowCountryModal(true);
  };

  const closeCountryModal = () => { setShowCountryModal(false); setEditingCountry(null); };

  const handleSaveCountry = async () => {
    if (!countryForm.name.trim() || !countryForm.code.trim()) { toast.error('Country name and code are required'); return; }
    setSavingCountry(true);
    try {
      const payload = {
        name: countryForm.name.trim(), code: countryForm.code.trim().toUpperCase(),
        baseCost: parseFloat(countryForm.baseCost) || 0,
        freeThreshold: countryForm.freeThreshold !== '' ? parseFloat(countryForm.freeThreshold) : null,
        currency: countryForm.currency.trim().toUpperCase() || 'NZD', active: countryForm.active,
      };
      if (editingCountry) {
        await adminShippingApi.updateCountry(editingCountry.id, payload);
        toast.success('Country updated');
      } else {
        await adminShippingApi.createCountry(payload);
        toast.success('Country added — standard/express/overnight methods auto-created');
      }
      closeCountryModal();
      loadShipping();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save country');
    } finally { setSavingCountry(false); }
  };

  const handleDeleteCountry = async (id: string) => {
    if (!confirm('Delete this country and all its shipping methods?')) return;
    try { await adminShippingApi.deleteCountry(id); toast.success('Country deleted'); loadShipping(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete country'); }
  };

  const handleToggleCountry = async (country: any) => {
    try {
      await adminShippingApi.updateCountry(country.id, { active: !country.active });
      toast.success(country.active ? 'Country disabled' : 'Country enabled');
      loadShipping();
    } catch { toast.error('Failed to update country'); }
  };

  // ── Shipping: Methods ──────────────────────────────────────────────────────
  const openMethodModal = (method: any) => {
    setEditingMethod(method);
    setMethodForm({ label: method.label, description: method.description, cost: String(method.cost), active: method.active });
    setShowMethodModal(true);
  };

  const closeMethodModal = () => { setShowMethodModal(false); setEditingMethod(null); };

  const handleSaveMethod = async () => {
    if (!editingMethod) return;
    setSavingMethod(true);
    try {
      await adminShippingApi.updateMethod(editingMethod.id, {
        label: methodForm.label.trim(), description: methodForm.description.trim(),
        cost: parseFloat(methodForm.cost) || 0, active: methodForm.active,
      });
      toast.success('Method updated');
      closeMethodModal();
      loadShipping();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update method');
    } finally { setSavingMethod(false); }
  };

  // ── Bulk Product Entry ─────────────────────────────────────────────────────
  const handleSaveBulkProducts = async () => {
    if (!bulkBaseForm.name.trim() || !bulkBaseForm.price) { toast.error('Name and price are required'); return; }
    setSavingBulk(true);
    setBulkProgress({ done: 0, total: bulkProductCount });
    let successCount = 0;
    for (let i = 0; i < bulkProductCount; i++) {
      try {
        const formData = new FormData();
        formData.append('name', bulkProductCount === 1 ? bulkBaseForm.name : `${bulkBaseForm.name} #${i + 1}`);
        formData.append('description', bulkBaseForm.description);
        formData.append('category', bulkBaseForm.category);
        formData.append('price', bulkBaseForm.price);
        formData.append('material', bulkBaseForm.material);
        formData.append('featured', String(bulkBaseForm.featured));
        formData.append('newArrival', String(bulkBaseForm.newArrival));
        formData.append('variants', JSON.stringify(bulkBaseForm.variants.map(v => ({ ...v, stock: parseInt(v.stock) || 0 }))));
        if (bulkImageFiles) Array.from(bulkImageFiles).forEach(file => formData.append('images', file));
        await productsApi.createProduct(formData);
        successCount++;
        setBulkProgress({ done: i + 1, total: bulkProductCount });
      } catch { toast.error(`Failed to create product ${i + 1}`); }
    }
    setSavingBulk(false);
    setBulkProgress(null);
    if (successCount > 0) {
      toast.success(`${successCount} product(s) created`);
      setShowBulkProductForm(false);
      setBulkBaseForm({ name: '', description: '', category: '', price: '', material: '', featured: false, newArrival: false, variants: [{ size: '', color: '', colorHex: '#000000', stock: '' }] });
      setBulkImageFiles(null);
      setBulkProductCount(5);
      loadProducts();
    }
  };

  // ── Create New User ────────────────────────────────────────────────────────
  const openCreateUserModal = () => {
    setCreateUserForm({ name: '', email: '', phone: '', role: 'customer', password: '' });
    setCreateUserPassword('');
    setShowCreatePassword(false);
    setShowCreateUserModal(true);
  };
  const closeCreateUserModal = () => { setShowCreateUserModal(false); };

  const handleCreateUser = async () => {
    if (!createUserForm.name.trim() || !createUserForm.email.trim() || createUserPassword.length < 6) {
      toast.error('Name, email and password (min 6 chars) are required'); return;
    }
    setSavingCreateUser(true);
    try {
      await userApi.createUser({ ...createUserForm, password: createUserPassword });
      toast.success('User created successfully');
      closeCreateUserModal();
      loadUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create user');
    } finally { setSavingCreateUser(false); }
  };

  // ── Export helpers ─────────────────────────────────────────────────────────
  const exportToCSV = (filename: string, rows: string[][], headers: string[]) => {
    const escape = (v: any) => {
      const s = String(v ?? '').replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };
    const csvContent = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}`);
  };

  const exportProducts = () => {
    const headers = ['Name', 'Category', 'Price', 'Material', 'Variants', 'Featured', 'New Arrival'];
    const rows = products.map(p => [p.name, p.category, p.price.toFixed(2), p.material || '', p.variants?.length || 0, p.featured ? 'Yes' : 'No', p.newArrival ? 'Yes' : 'No']);
    exportToCSV('products.csv', rows, headers);
  };

  const exportOrders = () => {
    const headers = ['Order #', 'Customer', 'Email', 'Date', 'Total', 'Payment', 'Status'];
    const rows = orders.map(o => [o.orderNumber, o.user?.name || 'Guest', o.user?.email || o.guestEmail || '', new Date(o.createdAt).toLocaleDateString('en-AU'), o.total?.toFixed(2), o.paymentMethod === 'google_pay' ? 'Google Pay' : 'Card', o.status]);
    exportToCSV('orders.csv', rows, headers);
  };

  const exportCoupons = () => {
    const headers = ['Code', 'Type', 'Value', 'Usage Limit', 'Used', 'Expiry', 'Active'];
    const rows = coupons.map(c => [c.code, c.type, c.value, c.usageLimit, c.usedCount ?? 0, new Date(c.expiryDate).toLocaleDateString('en-AU'), c.active ? 'Yes' : 'No']);
    exportToCSV('coupons.csv', rows, headers);
  };

  const exportUsers = () => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Orders', 'Joined'];
    const rows = usersList.map(u => [u.name, u.email, u.phone || '', u.role, u._count?.orders ?? 0, new Date(u.createdAt).toLocaleDateString('en-AU')]);
    exportToCSV('users.csv', rows, headers);
  };

  const exportShipping = () => {
    const headers = ['Country', 'Code', 'Base Cost', 'Free Threshold', 'Currency', 'Active'];
    const rows = shippingCountries.map(c => [c.name, c.code, c.baseCost.toFixed(2), c.freeThreshold != null ? c.freeThreshold.toFixed(2) : '', c.currency, c.active ? 'Yes' : 'No']);
    exportToCSV('shipping.csv', rows, headers);
  };

  // ── Tab list ───────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'products',  label: 'Products',  icon: Package },
    ...(isSuperAdmin ? [
      { id: 'orders',   label: 'Orders',   icon: ShoppingBag },
      { id: 'coupons',  label: 'Coupons',  icon: Tag },
      { id: 'shipping', label: 'Shipping', icon: Truck },
      { id: 'users',    label: 'Users',    icon: Users },
    ] : [
      { id: 'shipping', label: 'Shipping', icon: Truck },
    ]),
  ];

  return (
    <div className="min-h-screen">
      <div className="flag-header py-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            ADMIN PANEL
          </h1>
          <p className="text-blue-300/70 text-sm mt-1">Logged in as {user?.name} ({user?.role?.replace('_', ' ')})</p>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Tab nav ── */}
        <div className="flex gap-2 mb-6 border-b border-white/10 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-[#DC143C] text-white'
                  : 'border-transparent text-blue-300/70 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Dashboard ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <CalendarRange className="w-4 h-4 text-blue-300/70 shrink-0" />
              <span className="text-sm text-blue-200 font-medium">Filter period:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-blue-300/70">From</label>
                  <input type="date" value={dashDateFrom} onChange={e => setDashDateFrom(e.target.value)} className="border border-white/15 rounded bg-white/10 text-white px-2 py-1 text-xs" />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-blue-300/70">To</label>
                  <input type="date" value={dashDateTo} onChange={e => setDashDateTo(e.target.value)} className="border border-white/15 rounded bg-white/10 text-white px-2 py-1 text-xs" />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[7, 30, 90, 365].map(d => (
                  <button key={d} onClick={() => { setDashDateRange(d); setDashDateFrom(''); setDashDateTo(''); }} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${dashDateRange === d && !dashDateFrom ? 'bg-[#DC143C] text-white' : 'bg-white/10 text-blue-200 hover:bg-white/20'}`}>
                    {d === 365 ? '1Y' : `${d}D`}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={loadDashboard} className="bg-[#1a1a1a] text-white text-xs">Apply</Button>
            </div>

            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', value: `$${stats.totalRevenue?.toFixed(2) || '0.00'}`, color: 'text-[#DC143C]' },
                  { label: 'Total Orders',  value: stats.totalOrders,  color: 'text-blue-600' },
                  { label: 'Products',      value: stats.totalProducts, color: 'text-green-600' },
                  { label: 'Customers',     value: stats.totalUsers,    color: 'text-purple-600' },
                ].map((m, i) => (
                  <Card key={i} className="flag-card border-0 shadow-sm">
                    <CardContent className="p-6">
                      <p className="text-xs text-blue-300/70 mb-1">{m.label}</p>
                      <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {chartData.length > 0 && (
              <Card className="flag-card border-0 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-4">Sales — Last {dashDateRange} Days{dashDateFrom ? ` (from ${dashDateFrom}${dashDateTo ? ' to ' + dashDateTo : ''})` : ''}</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c8a96e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#c8a96e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                      <Tooltip formatter={(v: any) => [`$${v.toFixed(2)}`, 'Sales']} />
                      <Area type="monotone" dataKey="sales" stroke="#c8a96e" strokeWidth={2} fill="url(#salesGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="flag-card border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between mb-4">
                    <h3 className="font-semibold text-white">Recent Orders</h3>
                    {isSuperAdmin && <button onClick={() => setTab('orders')} className="text-xs text-[#DC143C] hover:underline">View all</button>}
                  </div>
                  <div className="space-y-3">
                    {recentOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-xs text-blue-300/70">{order.user?.name || order.guestEmail || 'Guest'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                          <p className="font-semibold mt-1">${order.total?.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="flag-card border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <h3 className="font-semibold text-white">Low Stock Alerts</h3>
                  </div>
                  {lowStock.length === 0 ? (
                    <p className="text-sm text-blue-300/70">All variants are well stocked.</p>
                  ) : (
                    <div className="space-y-2">
                      {lowStock.slice(0, 6).map(v => (
                        <div key={v.id} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">{v.product.name}</p>
                            <p className="text-xs text-blue-300/70">{v.size} / {v.color}</p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${v.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {v.stock} left
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Products ── */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-1">
                <Input placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadProducts()} className="max-w-xs" />
                <Button variant="outline" onClick={loadProducts}>Search</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportProducts} className="text-blue-200 border-white/20 hover:bg-white/10"><Download className="w-3 h-3 mr-1" />Export CSV</Button>
                <Button onClick={() => setShowBulkProductForm(v => !v)} variant="outline" className="border-[#DC143C]/40 text-[#DC143C] hover:bg-[#DC143C]/10"><Copy className="w-4 h-4 mr-2" /> Bulk Add</Button>
                <Button onClick={() => openProductForm()} className="bg-[#1a1a1a] text-white"><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
              </div>
            </div>
            {showBulkProductForm && (
              <Card className="flag-card border-0 shadow-sm border-l-4 border-l-[#DC143C]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white flex items-center gap-2"><Copy className="w-4 h-4 text-[#DC143C]" />Bulk Product Entry</h3>
                      <p className="text-xs text-blue-300/70 mt-0.5">Create multiple products with the same info and variants. Names will be auto-numbered.</p>
                    </div>
                    <button onClick={() => setShowBulkProductForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <div className="mb-4 flex items-center gap-3">
                    <label className="text-sm text-blue-200 font-medium">Number of products to create:</label>
                    <input type="number" min="2" max="50" value={bulkProductCount} onChange={e => setBulkProductCount(Math.min(50, Math.max(2, parseInt(e.target.value) || 2)))} className="w-20 border border-white/15 rounded bg-white/10 text-white px-3 py-1.5 text-sm" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><Label>Base Name <span className="text-blue-300/50 text-xs">(will become "Name #1", "Name #2"…)</span></Label><Input value={bulkBaseForm.name} onChange={e => setBulkBaseForm({ ...bulkBaseForm, name: e.target.value })} placeholder="e.g. Gurkha Tee" /></div>
                    <div className="md:col-span-2"><Label>Description</Label><textarea value={bulkBaseForm.description} onChange={e => setBulkBaseForm({ ...bulkBaseForm, description: e.target.value })} className="w-full border border-white/15 rounded bg-white/10 text-white px-3 py-2 text-sm min-h-[80px] resize-y" /></div>
                    <div><Label>Category</Label><Input value={bulkBaseForm.category} onChange={e => setBulkBaseForm({ ...bulkBaseForm, category: e.target.value })} placeholder="Tops, Jackets..." /></div>
                    <div><Label>Price (NZD)</Label><Input type="number" value={bulkBaseForm.price} onChange={e => setBulkBaseForm({ ...bulkBaseForm, price: e.target.value })} /></div>
                    <div className="md:col-span-2"><Label>Material</Label><Input value={bulkBaseForm.material} onChange={e => setBulkBaseForm({ ...bulkBaseForm, material: e.target.value })} /></div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={bulkBaseForm.featured} onChange={e => setBulkBaseForm({ ...bulkBaseForm, featured: e.target.checked })} />Featured</label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={bulkBaseForm.newArrival} onChange={e => setBulkBaseForm({ ...bulkBaseForm, newArrival: e.target.checked })} />New Arrival</label>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Shared Images</Label>
                      <div className="mt-1 border-2 border-dashed border-white/10 rounded p-4 text-center">
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => setBulkImageFiles(e.target.files)} className="hidden" id="bulk-img-upload" />
                        <label htmlFor="bulk-img-upload" className="cursor-pointer flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-blue-300/70" />
                          <span className="text-sm text-blue-300/70">{bulkImageFiles ? `${bulkImageFiles.length} file(s) selected` : 'Click to select shared images'}</span>
                        </label>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex justify-between mb-2">
                        <Label>Shared Variants</Label>
                        <button type="button" onClick={() => setBulkBaseForm({ ...bulkBaseForm, variants: [...bulkBaseForm.variants, { size: '', color: '', colorHex: '#000000', stock: '' }] })} className="text-xs text-[#DC143C] hover:underline">+ Add variant</button>
                      </div>
                      <div className="space-y-2">
                        {bulkBaseForm.variants.map((v, i) => (
                          <div key={i} className="grid grid-cols-5 gap-2 items-center">
                            <Input placeholder="Size" value={v.size} onChange={e => { const vs = [...bulkBaseForm.variants]; vs[i].size = e.target.value; setBulkBaseForm({ ...bulkBaseForm, variants: vs }); }} />
                            <Input placeholder="Color" value={v.color} onChange={e => { const vs = [...bulkBaseForm.variants]; vs[i].color = e.target.value; setBulkBaseForm({ ...bulkBaseForm, variants: vs }); }} />
                            <input type="color" value={v.colorHex} onChange={e => { const vs = [...bulkBaseForm.variants]; vs[i].colorHex = e.target.value; setBulkBaseForm({ ...bulkBaseForm, variants: vs }); }} className="h-9 w-full rounded border cursor-pointer" />
                            <Input type="number" placeholder="Stock" value={v.stock} onChange={e => { const vs = [...bulkBaseForm.variants]; vs[i].stock = e.target.value; setBulkBaseForm({ ...bulkBaseForm, variants: vs }); }} />
                            <Button variant="outline" size="sm" className="text-red-500" onClick={() => { const vs = bulkBaseForm.variants.filter((_, j) => j !== i); setBulkBaseForm({ ...bulkBaseForm, variants: vs }); }}><X className="w-3 h-3" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {bulkProgress && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-blue-200 mb-1"><span>Creating products…</span><span>{bulkProgress.done}/{bulkProgress.total}</span></div>
                      <div className="w-full bg-white/10 rounded-full h-2"><div className="bg-[#DC143C] h-2 rounded-full transition-all" style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }} /></div>
                    </div>
                  )}
                  <div className="flex gap-3 mt-6">
                    <Button onClick={handleSaveBulkProducts} disabled={savingBulk} className="bg-[#DC143C] text-white hover:bg-[#b01030]">{savingBulk ? `Creating... (${bulkProgress?.done ?? 0}/${bulkProductCount})` : `Create ${bulkProductCount} Products`}</Button>
                    <Button variant="outline" onClick={() => setShowBulkProductForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {showProductForm && (
              <Card className="flag-card border-0 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-4">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><Label>Name</Label><Input value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} /></div>
                    <div className="md:col-span-2"><Label>Description</Label><textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} className="w-full border border-white/15 rounded bg-white/10 text-white px-3 py-2 text-sm min-h-[80px] resize-y" /></div>
                    <div><Label>Category</Label><Input value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} placeholder="Tops, Jackets..." /></div>
                    <div><Label>Price (NZD)</Label><Input type="number" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} /></div>
                    <div className="md:col-span-2"><Label>Material</Label><Input value={productForm.material} onChange={e => setProductForm({ ...productForm, material: e.target.value })} /></div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={productForm.featured} onChange={e => setProductForm({ ...productForm, featured: e.target.checked })} />Featured</label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={productForm.newArrival} onChange={e => setProductForm({ ...productForm, newArrival: e.target.checked })} />New Arrival</label>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Product Images</Label>
                      <div className="mt-1 border-2 border-dashed border-white/10 rounded p-4 text-center">
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => setImageFiles(e.target.files)} className="hidden" id="img-upload" />
                        <label htmlFor="img-upload" className="cursor-pointer flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-blue-300/70" />
                          <span className="text-sm text-blue-300/70">{imageFiles ? `${imageFiles.length} file(s) selected` : 'Click to select images'}</span>
                        </label>
                      </div>
                      {editingProduct?.images?.length > 0 && !imageFiles && <p className="text-xs text-blue-300/70 mt-1">Current: {editingProduct.images.length} image(s). Upload new to replace.</p>}
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex justify-between mb-2">
                        <Label>Variants (Size / Color / Stock)</Label>
                        <button type="button" onClick={() => setProductForm({ ...productForm, variants: [...productForm.variants, { size: '', color: '', colorHex: '#000000', stock: '' }] })} className="text-xs text-[#DC143C] hover:underline">+ Add variant</button>
                      </div>
                      <div className="space-y-2">
                        {productForm.variants.map((v, i) => (
                          <div key={i} className="grid grid-cols-5 gap-2 items-center">
                            <Input placeholder="Size" value={v.size} onChange={e => { const vs = [...productForm.variants]; vs[i].size = e.target.value; setProductForm({ ...productForm, variants: vs }); }} />
                            <Input placeholder="Color" value={v.color} onChange={e => { const vs = [...productForm.variants]; vs[i].color = e.target.value; setProductForm({ ...productForm, variants: vs }); }} />
                            <input type="color" value={v.colorHex} onChange={e => { const vs = [...productForm.variants]; vs[i].colorHex = e.target.value; setProductForm({ ...productForm, variants: vs }); }} className="h-9 w-full rounded border cursor-pointer" />
                            <Input type="number" placeholder="Stock" value={v.stock} onChange={e => { const vs = [...productForm.variants]; vs[i].stock = e.target.value; setProductForm({ ...productForm, variants: vs }); }} />
                            <Button variant="outline" size="sm" className="text-red-500" onClick={() => { const vs = productForm.variants.filter((_, j) => j !== i); setProductForm({ ...productForm, variants: vs }); }}><X className="w-3 h-3" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button onClick={handleSaveProduct} disabled={savingProduct} className="bg-[#1a1a1a] text-white">{savingProduct ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}</Button>
                    <Button variant="outline" onClick={() => setShowProductForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="flag-card border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-blue-200">Product</th>
                        <th className="text-left py-3 px-4 font-medium text-blue-200">Category</th>
                        <th className="text-left py-3 px-4 font-medium text-blue-200">Price</th>
                        <th className="text-left py-3 px-4 font-medium text-blue-200">Variants</th>
                        <th className="text-left py-3 px-4 font-medium text-blue-200">Flags</th>
                        <th className="text-right py-3 px-4 font-medium text-blue-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {products.map(product => (
                        <tr key={product.id} className="hover:bg-white/5">
                          <td className="py-3 px-4"><div className="flex items-center gap-3"><img src={product.images?.[0] || '/placeholder.jpg'} alt={product.name} className="w-10 h-10 object-cover rounded" onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }} /><span className="font-medium text-white">{product.name}</span></div></td>
                          <td className="py-3 px-4 text-blue-200">{product.category}</td>
                          <td className="py-3 px-4 font-medium">${product.price.toFixed(2)}</td>
                          <td className="py-3 px-4 text-blue-200">{product.variants?.length || 0}</td>
                          <td className="py-3 px-4"><div className="flex gap-1">{product.featured && <span className="text-xs bg-[#DC143C] text-white px-1.5 py-0.5 rounded">Featured</span>}{product.newArrival && <span className="text-xs bg-[#1a1a1a] text-white px-1.5 py-0.5 rounded">New</span>}</div></td>
                          <td className="py-3 px-4 text-right"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => openProductForm(product)}><Edit2 className="w-3 h-3" /></Button><Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDeleteProduct(product.id)}><Trash2 className="w-3 h-3" /></Button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {productPages > 1 && (
                  <div className="flex justify-center gap-2 p-4 border-t">
                    <Button variant="outline" size="sm" disabled={productPage === 1} onClick={() => setProductPage(p => p - 1)}>Previous</Button>
                    <span className="flex items-center text-sm text-blue-200 px-3">Page {productPage} of {productPages}</span>
                    <Button variant="outline" size="sm" disabled={productPage === productPages} onClick={() => setProductPage(p => p + 1)}>Next</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Orders ── */}
        {activeTab === 'orders' && isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="Search by order # or customer..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadOrders()} className="max-w-xs" />
              <select value={orderStatus} onChange={e => { setOrderStatus(e.target.value); setOrderPage(1); }} className="border border-white/15 rounded bg-white/10 text-white px-3 py-2 text-sm">
                <option value="">All Statuses</option>
                {['PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Button variant="outline" onClick={loadOrders}>Search</Button>
              <Button variant="outline" onClick={exportOrders} className="text-blue-200 border-white/20 hover:bg-white/10 ml-auto"><Download className="w-3 h-3 mr-1" />Export CSV</Button>
            </div>
            <Card className="flag-card border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-blue-200">Order #</th>
                        <th className="text-left py-3 px-4 font-medium text-blue-200">Customer</th>
                        <th className="text-left py-3 px-4 font-medium text-blue-200">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-blue-200">Total</th>
                        <th className="text-left py-3 px-4 font-medium text-blue-200">Payment</th>
                        <th className="text-left py-3 px-4 font-medium text-blue-200">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-blue-200">Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-white/5">
                          <td className="py-3 px-4 font-medium">{order.orderNumber}</td>
                          <td className="py-3 px-4 text-blue-200">{order.user?.name || order.guestEmail || 'Guest'}{!order.userId && <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1 rounded">Guest</span>}</td>
                          <td className="py-3 px-4 text-blue-200">{new Date(order.createdAt).toLocaleDateString('en-AU')}</td>
                          <td className="py-3 px-4 font-semibold">${order.total?.toFixed(2)}</td>
                          <td className="py-3 px-4 text-blue-200 capitalize">{order.paymentMethod === 'google_pay' ? 'Google Pay' : 'Card'}</td>
                          <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>{order.status}</span></td>
                          <td className="py-3 px-4 text-right"><select defaultValue={order.status} onChange={e => handleUpdateOrderStatus(order.id, e.target.value)} className="border border-white/15 rounded bg-white/10 text-white px-2 py-1 text-xs">{['PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {orderPages > 1 && (
                  <div className="flex justify-center gap-2 p-4 border-t">
                    <Button variant="outline" size="sm" disabled={orderPage === 1} onClick={() => setOrderPage(p => p - 1)}>Previous</Button>
                    <span className="flex items-center text-sm text-blue-200 px-3">Page {orderPage} of {orderPages}</span>
                    <Button variant="outline" size="sm" disabled={orderPage === orderPages} onClick={() => setOrderPage(p => p + 1)}>Next</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Coupons ── */}
        {activeTab === 'coupons' && isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Discount Coupons</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportCoupons} className="text-blue-200 border-white/20 hover:bg-white/10"><Download className="w-3 h-3 mr-1" />Export CSV</Button>
                <Button onClick={() => openCouponForm()} className="bg-[#1a1a1a] text-white"><Plus className="w-4 h-4 mr-2" /> New Coupon</Button>
              </div>
            </div>
            {showCouponForm && (
              <Card className="flag-card border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
                    <button onClick={closeCouponForm} className="p-1.5 rounded-lg hover:bg-white/5"><X className="w-5 h-5 text-blue-200" /></button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Code</Label>
                      <Input value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" className="mt-1 bg-white/10 border-white/15 text-white font-mono" disabled={!!editingCoupon} />
                      {editingCoupon && <p className="text-xs text-blue-300/50 mt-1">Code cannot be changed</p>}
                    </div>
                    <div>
                      <Label>Type</Label>
                      <select value={couponForm.type} onChange={e => setCouponForm({ ...couponForm, type: e.target.value })} className="mt-1 w-full border border-white/15 rounded bg-white/10 text-white px-3 py-2 text-sm">
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount ($)</option>
                      </select>
                    </div>
                    <div>
                      <Label>Value</Label>
                      <Input type="number" min="0" step={couponForm.type === 'percentage' ? '1' : '0.01'} value={couponForm.value} onChange={e => setCouponForm({ ...couponForm, value: e.target.value })} placeholder={couponForm.type === 'percentage' ? '10' : '25.00'} className="mt-1 bg-white/10 border-white/15 text-white" />
                    </div>
                    <div>
                      <Label>Usage Limit</Label>
                      <Input type="number" min="1" value={couponForm.usageLimit} onChange={e => setCouponForm({ ...couponForm, usageLimit: e.target.value })} placeholder="100" className="mt-1 bg-white/10 border-white/15 text-white" />
                    </div>
                    <div>
                      <Label>Expiry Date</Label>
                      <Input type="date" value={couponForm.expiryDate} onChange={e => setCouponForm({ ...couponForm, expiryDate: e.target.value })} className="mt-1 bg-white/10 border-white/15 text-white" />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-200">
                        <input type="checkbox" checked={couponForm.active} onChange={e => setCouponForm({ ...couponForm, active: e.target.checked })} className="w-4 h-4" />
                        Active (available for customers)
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button onClick={handleSaveCoupon} disabled={savingCoupon} className="bg-[#1a1a1a] text-white">{savingCoupon ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}</Button>
                    <Button variant="outline" onClick={closeCouponForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="flag-card border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10"><tr>
                      <th className="text-left py-3 px-4 font-medium text-blue-200">Code</th>
                      <th className="text-left py-3 px-4 font-medium text-blue-200">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-blue-200">Value</th>
                      <th className="text-left py-3 px-4 font-medium text-blue-200">Used / Limit</th>
                      <th className="text-left py-3 px-4 font-medium text-blue-200">Expires</th>
                      <th className="text-left py-3 px-4 font-medium text-blue-200">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-blue-200">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/10">
                      {coupons.map(coupon => (
                        <tr key={coupon.id} className="hover:bg-white/5">
                          <td className="py-3 px-4 font-mono font-semibold text-white">{coupon.code}</td>
                          <td className="py-3 px-4 capitalize text-blue-200">{coupon.type}</td>
                          <td className="py-3 px-4 font-medium text-white">{coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value.toFixed(2)}`}</td>
                          <td className="py-3 px-4 text-blue-200">{coupon.usedCount} / {coupon.usageLimit}</td>
                          <td className="py-3 px-4 text-blue-200">{new Date(coupon.expiryDate).toLocaleDateString('en-AU')}</td>
                          <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{coupon.active ? 'Active' : 'Inactive'}</span></td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openCouponForm(coupon)} title="Edit"><Edit2 className="w-3 h-3" /></Button>
                              <Button variant="outline" size="sm" onClick={() => handleToggleCoupon(coupon)} title={coupon.active ? 'Deactivate' : 'Activate'}>{coupon.active ? <X className="w-3 h-3 text-orange-400" /> : <Check className="w-3 h-3 text-green-400" />}</Button>
                              <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDeleteCoupon(coupon.id)} title="Delete"><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {coupons.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-blue-300/70">No coupons yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Shipping ── */}
        {activeTab === 'shipping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Shipping Configuration</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportShipping} className="text-blue-200 border-white/20 hover:bg-white/10 text-xs"><Download className="w-3 h-3 mr-1" />Export CSV</Button>
                <button onClick={loadShipping} className="text-xs text-blue-300/70 hover:text-white underline">Refresh</button>
              </div>
            </div>
            <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
              <button onClick={() => setShippingSubTab('countries')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${shippingSubTab === 'countries' ? 'bg-[#DC143C] text-white' : 'text-blue-300/70 hover:text-white'}`}>
                <Globe className="w-4 h-4" /> Countries
              </button>
              <button onClick={() => setShippingSubTab('methods')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${shippingSubTab === 'methods' ? 'bg-[#DC143C] text-white' : 'text-blue-300/70 hover:text-white'}`}>
                <Truck className="w-4 h-4" /> Methods
              </button>
            </div>
            {shippingLoading ? (
              <div className="space-y-3">{[1,2,3].map(n => <div key={n} className="h-16 bg-white/5 animate-pulse rounded-lg" />)}</div>
            ) : (
              <>
                {shippingSubTab === 'countries' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Shipping Countries</p>
                        <p className="text-xs text-blue-300/70">{shippingCountries.length} countries configured</p>
                      </div>
                      {isSuperAdmin && (
                        <Button onClick={() => openCountryModal()} className="bg-[#DC143C] text-white hover:bg-[#b01030]">
                          <Plus className="w-4 h-4 mr-2" /> Add Country
                        </Button>
                      )}
                    </div>
                    <Card className="flag-card border-0 shadow-sm">
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b border-white/10">
                              <tr>
                                <th className="text-left py-3 px-4 font-medium text-blue-200">Country</th>
                                <th className="text-left py-3 px-4 font-medium text-blue-200">Code</th>
                                <th className="text-left py-3 px-4 font-medium text-blue-200">Base Cost</th>
                                <th className="text-left py-3 px-4 font-medium text-blue-200">Free Threshold</th>
                                <th className="text-left py-3 px-4 font-medium text-blue-200">Currency</th>
                                <th className="text-left py-3 px-4 font-medium text-blue-200">Status</th>
                                {isSuperAdmin && <th className="text-right py-3 px-4 font-medium text-blue-200">Actions</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {shippingCountries.map(country => (
                                <tr key={country.id} className="hover:bg-white/5">
                                  <td className="py-3 px-4 font-medium text-white">{country.name}</td>
                                  <td className="py-3 px-4 font-mono text-blue-200">{country.code}</td>
                                  <td className="py-3 px-4 text-blue-200">{country.baseCost === 0 ? <span className="text-green-400">Free</span> : `$${country.baseCost.toFixed(2)}`}</td>
                                  <td className="py-3 px-4 text-blue-200">{country.freeThreshold != null ? `$${country.freeThreshold.toFixed(2)}` : <span className="text-blue-300/40">—</span>}</td>
                                  <td className="py-3 px-4 text-blue-200">{country.currency}</td>
                                  <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${country.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{country.active ? 'Active' : 'Inactive'}</span></td>
                                  {isSuperAdmin && (
                                    <td className="py-3 px-4 text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleToggleCountry(country)} title={country.active ? 'Disable' : 'Enable'}>{country.active ? <X className="w-3 h-3 text-orange-400" /> : <Check className="w-3 h-3 text-green-400" />}</Button>
                                        <Button variant="outline" size="sm" onClick={() => openCountryModal(country)}><Pencil className="w-3 h-3" /></Button>
                                        <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDeleteCountry(country.id)}><Trash2 className="w-3 h-3" /></Button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                              {shippingCountries.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-blue-300/70">No countries configured</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {shippingSubTab === 'methods' && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Shipping Methods</p>
                      <p className="text-xs text-blue-300/70">Per-country rate overrides. Methods are auto-created when you add a country.</p>
                    </div>
                    {shippingCountries.length === 0 ? (
                      <Card className="flag-card border-0 shadow-sm"><CardContent className="p-8 text-center text-blue-300/70">No countries yet — add a country first and its methods will appear here.</CardContent></Card>
                    ) : (
                      shippingCountries.map(country => (
                        <Card key={country.id} className="flag-card border-0 shadow-sm">
                          <CardContent className="p-0">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-400" />
                                <span className="font-medium text-white">{country.name}</span>
                                <span className="text-xs font-mono text-blue-300/70 bg-white/5 px-1.5 py-0.5 rounded">{country.code}</span>
                                {!country.active && <span className="text-xs text-orange-400">(disabled)</span>}
                              </div>
                            </div>
                            <div className="divide-y divide-white/5">
                              {(country.methods || []).map((method: any) => (
                                <div key={method.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5">
                                  <div className="flex items-center gap-3">
                                    {METHOD_ICONS[method.methodId] ?? <Truck className="w-4 h-4 text-blue-400" />}
                                    <div>
                                      <p className="text-sm font-medium text-white">{method.label}</p>
                                      <p className="text-xs text-blue-300/70">{method.description}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className={`text-sm font-semibold ${method.cost === 0 ? 'text-green-400' : 'text-white'}`}>{method.cost === 0 ? 'Free' : `$${method.cost.toFixed(2)}`}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${method.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{method.active ? 'On' : 'Off'}</span>
                                    {isSuperAdmin && <Button variant="outline" size="sm" onClick={() => openMethodModal(method)}><Pencil className="w-3 h-3" /></Button>}
                                  </div>
                                </div>
                              ))}
                              {(!country.methods || country.methods.length === 0) && <div className="px-4 py-3 text-sm text-blue-300/70">No methods for this country.</div>}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Users ── */}
        {activeTab === 'users' && isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">User Management</h2>
                <p className="text-sm text-blue-300/70 mt-0.5">{usersTotal} total users</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportUsers} className="text-blue-200 border-white/20 hover:bg-white/10"><Download className="w-3 h-3 mr-1" />Export CSV</Button>
                <Button onClick={openCreateUserModal} className="bg-[#1a1a1a] text-white"><UserPlus className="w-4 h-4 mr-2" /> New User</Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/70" />
                <Input placeholder="Search by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUserSearch()} className="pl-9" />
              </div>
              <select value={userRoleFilter} onChange={e => { setUserRoleFilter(e.target.value); setUsersPage(1); }} className="border border-white/15 rounded bg-white/10 text-white px-3 py-2 text-sm">
                <option value="">All Roles</option>
                <option value="customer">Customer</option>
                <option value="inventory_manager">Inventory Manager</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <Button variant="outline" onClick={handleUserSearch}>Search</Button>
            </div>
            <Card className="flag-card border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10"><tr>
                      <th className="text-left py-3 px-4 font-medium text-blue-200">User</th>
                      <th className="text-left py-3 px-4 font-medium text-blue-200">Phone</th>
                      <th className="text-left py-3 px-4 font-medium text-blue-200">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-blue-200">Orders</th>
                      <th className="text-left py-3 px-4 font-medium text-blue-200">Joined</th>
                      <th className="text-right py-3 px-4 font-medium text-blue-200">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/10">
                      {usersList.map(u => (
                        <tr key={u.id} className="hover:bg-white/5">
                          <td className="py-3 px-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white text-xs font-bold shrink-0">{u.name?.charAt(0)?.toUpperCase() || '?'}</div><div><p className="font-medium text-white">{u.name}{u.id === user?.id && <span className="ml-1.5 text-xs text-[#DC143C]">(you)</span>}</p><p className="text-xs text-blue-300/70">{u.email}</p></div></div></td>
                          <td className="py-3 px-4 text-blue-200">{u.phone || <span className="text-[#ccc]">—</span>}</td>
                          <td className="py-3 px-4"><span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLES[u.role] || 'bg-gray-100 text-gray-600'}`}>{ROLE_ICONS[u.role]}{u.role.replace('_', ' ')}</span></td>
                          <td className="py-3 px-4 text-blue-200">{u._count?.orders ?? 0}</td>
                          <td className="py-3 px-4 text-blue-200">{new Date(u.createdAt).toLocaleDateString('en-AU')}</td>
                          <td className="py-3 px-4 text-right"><div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openUserModal(u)} disabled={u.id === user?.id} title={u.id === user?.id ? 'Use Profile page to edit your own account' : 'Edit user'}><Edit2 className="w-3 h-3" /></Button>
                            <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => openResetModal(u)} disabled={u.id === user?.id} title="Set password"><KeyRound className="w-3 h-3" /></Button>
                            <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDeleteUser(u.id)} disabled={u.id === user?.id || deletingUserId === u.id} title={u.id === user?.id ? 'Cannot delete your own account' : 'Delete user'}>{deletingUserId === u.id ? <span className="text-xs">...</span> : <Trash2 className="w-3 h-3" />}</Button>
                          </div></td>
                        </tr>
                      ))}
                      {usersList.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-blue-300/70">No users found</td></tr>}
                    </tbody>
                  </table>
                </div>
                {usersPages > 1 && (
                  <div className="flex justify-center gap-2 p-4 border-t">
                    <Button variant="outline" size="sm" disabled={usersPage === 1} onClick={() => setUsersPage(p => p - 1)}>Previous</Button>
                    <span className="flex items-center text-sm text-blue-200 px-3">Page {usersPage} of {usersPages}</span>
                    <Button variant="outline" size="sm" disabled={usersPage === usersPages} onClick={() => setUsersPage(p => p + 1)}>Next</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Add / Edit Country modal ── */}
      {showCountryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCountryModal} />
          <div className="relative bg-[#0f172a] rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">{editingCountry ? 'Edit Country' : 'Add Shipping Country'}</h3>
              <button onClick={closeCountryModal} className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-slate-300">Country Name</Label><Input value={countryForm.name} onChange={e => setCountryForm({ ...countryForm, name: e.target.value })} placeholder="New Zealand" className="mt-1 bg-slate-800 border-slate-600 text-white" disabled={!!editingCountry} /></div>
                <div><Label className="text-slate-300">ISO Code</Label><Input value={countryForm.code} onChange={e => setCountryForm({ ...countryForm, code: e.target.value.toUpperCase() })} placeholder="NZ" maxLength={3} className="mt-1 bg-slate-800 border-slate-600 text-white font-mono" disabled={!!editingCountry} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-slate-300">Base Cost ($)</Label><Input type="number" min="0" step="0.01" value={countryForm.baseCost} onChange={e => setCountryForm({ ...countryForm, baseCost: e.target.value })} placeholder="15.00" className="mt-1 bg-slate-800 border-slate-600 text-white" /><p className="text-xs text-slate-500 mt-1">Standard rate. Express = ×1.8, Overnight = ×3</p></div>
                <div><Label className="text-slate-300">Free Threshold ($)</Label><Input type="number" min="0" step="0.01" value={countryForm.freeThreshold} onChange={e => setCountryForm({ ...countryForm, freeThreshold: e.target.value })} placeholder="100 (optional)" className="mt-1 bg-slate-800 border-slate-600 text-white" /><p className="text-xs text-slate-500 mt-1">Leave blank for no free shipping</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-slate-300">Currency</Label><Input value={countryForm.currency} onChange={e => setCountryForm({ ...countryForm, currency: e.target.value.toUpperCase() })} placeholder="NZD" maxLength={3} className="mt-1 bg-slate-800 border-slate-600 text-white font-mono" /></div>
                <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300"><input type="checkbox" checked={countryForm.active} onChange={e => setCountryForm({ ...countryForm, active: e.target.checked })} className="w-4 h-4" />Active</label></div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-700">
              <Button onClick={handleSaveCountry} disabled={savingCountry} className="flex-1 bg-[#DC143C] text-white hover:bg-[#b01030]">{savingCountry ? 'Saving...' : editingCountry ? 'Update Country' : 'Add Country'}</Button>
              <Button variant="outline" onClick={closeCountryModal} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Method modal ── */}
      {showMethodModal && editingMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMethodModal} />
          <div className="relative bg-[#0f172a] rounded-xl shadow-2xl w-full max-w-sm border border-slate-700">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                {METHOD_ICONS[editingMethod.methodId] ?? <Truck className="w-5 h-5 text-blue-400" />}
                <div><h3 className="text-base font-semibold text-white">Edit {editingMethod.methodId} method</h3><p className="text-xs text-slate-400">{editingMethod.country?.name}</p></div>
              </div>
              <button onClick={closeMethodModal} className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><Label className="text-slate-300">Label</Label><Input value={methodForm.label} onChange={e => setMethodForm({ ...methodForm, label: e.target.value })} className="mt-1 bg-slate-800 border-slate-600 text-white" /></div>
              <div><Label className="text-slate-300">Description</Label><Input value={methodForm.description} onChange={e => setMethodForm({ ...methodForm, description: e.target.value })} placeholder="5–10 business days" className="mt-1 bg-slate-800 border-slate-600 text-white" /></div>
              <div><Label className="text-slate-300">Cost ($)</Label><Input type="number" min="0" step="0.01" value={methodForm.cost} onChange={e => setMethodForm({ ...methodForm, cost: e.target.value })} className="mt-1 bg-slate-800 border-slate-600 text-white" /></div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300"><input type="checkbox" checked={methodForm.active} onChange={e => setMethodForm({ ...methodForm, active: e.target.checked })} className="w-4 h-4" />Active (shown to customers)</label>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-700">
              <Button onClick={handleSaveMethod} disabled={savingMethod} className="flex-1 bg-[#DC143C] text-white hover:bg-[#b01030]">{savingMethod ? 'Saving...' : 'Save Method'}</Button>
              <Button variant="outline" onClick={closeMethodModal} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create User modal ── */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCreateUserModal} />
          <div className="relative bg-[#0f172a] rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center"><UserPlus className="w-5 h-5 text-blue-400" /></div>
                <div><h3 className="text-lg font-semibold text-white">Create New User</h3><p className="text-xs text-slate-400 mt-0.5">Add a new user account</p></div>
              </div>
              <button onClick={closeCreateUserModal} className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><Label className="text-slate-300">Full Name</Label><Input value={createUserForm.name} onChange={e => setCreateUserForm({ ...createUserForm, name: e.target.value })} placeholder="Full name" className="mt-1 bg-slate-800 border-slate-600 text-white" /></div>
              <div><Label className="text-slate-300">Email Address</Label><Input type="email" value={createUserForm.email} onChange={e => setCreateUserForm({ ...createUserForm, email: e.target.value })} placeholder="email@example.com" className="mt-1 bg-slate-800 border-slate-600 text-white" /></div>
              <div><Label className="text-slate-300">Phone Number</Label><Input value={createUserForm.phone} onChange={e => setCreateUserForm({ ...createUserForm, phone: e.target.value })} placeholder="+64 21 000 0000" className="mt-1 bg-slate-800 border-slate-600 text-white" /></div>
              <div>
                <Label className="text-slate-300">Password</Label>
                <div className="relative mt-1">
                  <Input type={showCreatePassword ? 'text' : 'password'} value={createUserPassword} onChange={e => setCreateUserPassword(e.target.value)} placeholder="Min. 6 characters" className="pr-10 bg-slate-800 border-slate-600 text-white" />
                  <button type="button" onClick={() => setShowCreatePassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" tabIndex={-1}>{showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
                {createUserPassword.length > 0 && createUserPassword.length < 6 && <p className="text-xs text-red-400 mt-1">Password must be at least 6 characters</p>}
              </div>
              <div>
                <Label className="text-slate-300">Role</Label>
                <select value={createUserForm.role} onChange={e => setCreateUserForm({ ...createUserForm, role: e.target.value })} className="mt-1 w-full border border-slate-600 rounded bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]">
                  <option value="customer">Customer</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                {createUserForm.role === 'super_admin' && <p className="text-xs text-amber-500 mt-1 flex items-center gap-1"><Shield className="w-3 h-3" />Super admins have full access to all admin features</p>}
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-700">
              <Button onClick={handleCreateUser} disabled={savingCreateUser || !createUserForm.name.trim() || !createUserForm.email.trim() || createUserPassword.length < 6} className="flex-1 bg-[#1a1a1a] text-white hover:opacity-90">{savingCreateUser ? 'Creating...' : 'Create User'}</Button>
              <Button variant="outline" onClick={closeCreateUserModal} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User modal ── */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeUserModal} />
          <div className="relative bg-[#0f172a] rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div><h3 className="text-lg font-semibold text-white">Edit User</h3><p className="text-xs text-slate-400 mt-0.5">{editingUser.email}</p></div>
              <button onClick={closeUserModal} className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><Label htmlFor="user-name" className="text-slate-300">Full Name</Label><Input id="user-name" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} placeholder="Full name" className="mt-1 bg-slate-800 border-slate-600 text-white" /></div>
              <div><Label htmlFor="user-email" className="text-slate-300">Email Address</Label><Input id="user-email" type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} placeholder="email@example.com" className="mt-1 bg-slate-800 border-slate-600 text-white" /></div>
              <div><Label htmlFor="user-phone" className="text-slate-300">Phone Number</Label><Input id="user-phone" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} placeholder="+64 21 000 0000" className="mt-1 bg-slate-800 border-slate-600 text-white" /></div>
              <div>
                <Label htmlFor="user-role" className="text-slate-300">Role</Label>
                <select id="user-role" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="mt-1 w-full border border-slate-600 rounded bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]">
                  <option value="customer">Customer</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                {userForm.role === 'super_admin' && <p className="text-xs text-amber-500 mt-1 flex items-center gap-1"><Shield className="w-3 h-3" />Super admins have full access to all admin features</p>}
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-700">
              <Button onClick={handleSaveUser} disabled={savingUser || !userForm.name.trim() || !userForm.email.trim()} className="flex-1 bg-[#1a1a1a] text-white hover:opacity-90">{savingUser ? 'Saving...' : 'Save Changes'}</Button>
              <Button variant="outline" onClick={closeUserModal} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Set Password modal ── */}
      {showSetPasswordModal && setPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeResetModal} />
          <div className="relative bg-[#0f172a] rounded-xl shadow-2xl w-full max-w-sm border border-slate-700">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-900 flex items-center justify-center"><KeyRound className="w-5 h-5 text-amber-400" /></div>
                <div><h3 className="text-base font-semibold text-white">Set New Password</h3><p className="text-xs text-slate-400">{setPasswordUser.name} · {setPasswordUser.email}</p></div>
              </div>
              <button onClick={closeResetModal} className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="new-password" className="text-slate-300">New Password</Label>
                <div className="relative mt-1">
                  <Input id="new-password" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendPasswordReset()} placeholder="Min. 6 characters" className="pr-10 bg-slate-800 border-slate-600 text-white" autoFocus />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" tabIndex={-1}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
                {newPassword.length > 0 && newPassword.length < 6 && <p className="text-xs text-red-400 mt-1">Password must be at least 6 characters</p>}
              </div>
              <p className="text-xs text-slate-500">This will immediately replace the user's current password. They will not be notified.</p>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-700">
              <Button onClick={handleSendPasswordReset} disabled={savingPassword || newPassword.length < 6} className="flex-1 bg-[#1a1a1a] text-white hover:opacity-90">{savingPassword ? 'Saving...' : 'Set Password'}</Button>
              <Button variant="outline" onClick={closeResetModal} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}