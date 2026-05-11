import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { User, Package, Heart, MapPin, Edit2, Trash2, Plus, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { userApi, ordersApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
//import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED:    'bg-purple-100 text-purple-800',
  DELIVERED:  'bg-green-100 text-green-800',
  CANCELLED:  'bg-red-100 text-red-800',
};

export function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  const { user, logout, fetchUser } = useAuthStore();

  // Profile edit state
  const [profileData, setProfileData] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPages, setOrderPages] = useState(1);

  // Addresses state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: '', phone: '', line1: '', line2: '',
    city: '', state: '', country: 'Australia', postalCode: '', isDefault: false,
  });

  // Wishlist state
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const setTab = (tab: string) => setSearchParams({ tab });

  // ── Load data when tab changes ──────────────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'addresses') loadAddresses();
    if (activeTab === 'wishlist') loadWishlist();
  }, [activeTab, orderPage]);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await ordersApi.getMyOrders({ page: orderPage, limit: 8 });
      setOrders(res.data.orders);
      setOrderPages(res.data.pagination.pages);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      const res = await userApi.getAddresses();
      setAddresses(res.data.addresses || []);
    } catch {
      toast.error('Failed to load addresses');
    }
  };

  const loadWishlist = async () => {
    setWishlistLoading(true);
    try {
      const res = await userApi.getWishlist();
      setWishlist(res.data.wishlist || []);
    } catch {
      toast.error('Failed to load wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  // ── Profile actions ─────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await userApi.updateProfile(profileData);
      await fetchUser();
      toast.success('Profile updated successfully');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Address actions ─────────────────────────────────────────────────────────

  const handleAddAddress = async () => {
    try {
      await userApi.addAddress(newAddress);
      toast.success('Address added');
      setShowAddAddress(false);
      setNewAddress({ fullName: '', phone: '', line1: '', line2: '', city: '', state: '', country: 'Australia', postalCode: '', isDefault: false });
      loadAddresses();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add address');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await userApi.deleteAddress(id);
      toast.success('Address removed');
      loadAddresses();
    } catch {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await userApi.updateAddress(id, { isDefault: true });
      toast.success('Default address updated');
      loadAddresses();
    } catch {
      toast.error('Failed to update address');
    }
  };

  // ── Wishlist actions ────────────────────────────────────────────────────────

  const handleRemoveWishlist = async (productId: string) => {
    try {
      await userApi.removeFromWishlist(productId);
      setWishlist(prev => prev.filter((w: any) => w.product.id !== productId));
      toast.success('Removed from wishlist');
    } catch {
      toast.error('Failed to remove from wishlist');
    }
  };

  const tabs = [
    { id: 'profile',   label: 'Profile',    icon: User },
    { id: 'orders',    label: 'My Orders',  icon: Package },
    { id: 'addresses', label: 'Addresses',  icon: MapPin },
    { id: 'wishlist',  label: 'Wishlist',   icon: Heart },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flag-header py-12">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            MY ACCOUNT
          </h1>
          <p className="text-blue-300/70 mt-2">{user?.email}</p>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">

          {/* ── Sidebar ── */}
          <div className="lg:col-span-1">
            <Card className="flag-card border-0 shadow-sm">
              <CardContent className="p-4">
                {/* Avatar */}
                <div className="flex flex-col items-center py-4 mb-4 border-b">
                  <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#DC143C] text-2xl font-bold mb-2">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold text-white">{user?.name}</p>
                  <p className="text-xs text-blue-300/70">{user?.role?.replace('_', ' ')}</p>
                </div>

                <nav className="space-y-1">
                  {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                        activeTab === id
                          ? 'bg-[#1a1a1a] text-[#DC143C]'
                          : 'text-blue-200 hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}

                  {(user?.role === 'super_admin' || user?.role === 'inventory_manager') && (
                    <Link
                      to="/admin"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-blue-200 hover:bg-white/5 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  )}

                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-red-500 hover:bg-red-50 transition-colors mt-4"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* ── Content ── */}
          <div className="lg:col-span-3">

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <Card className="flag-card border-0 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Personal Information</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input
                        value={profileData.name}
                        onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={user?.email || ''} disabled className="bg-[#f5f5f0]" />
                      <p className="text-xs text-blue-300/70 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={profileData.phone}
                        onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="+61 400 000 000"
                      />
                    </div>
                    <div>
                      <Label>Account Role</Label>
                      <Input value={user?.role?.replace('_', ' ') || ''} disabled className="bg-[#f5f5f0] capitalize" />
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="mt-6 btn-flag text-white"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">My Orders</h2>

                {ordersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Card key={i} className="flag-card border-0 shadow-sm">
                        <CardContent className="p-6">
                          <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-[#e0e0e0] rounded w-1/3" />
                            <div className="h-4 bg-[#e0e0e0] rounded w-1/2" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <Card className="flag-card border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                      <Package className="w-12 h-12 text-blue-300/70 mx-auto mb-4" />
                      <p className="text-blue-200 mb-4">You haven't placed any orders yet.</p>
                      <Link to="/shop">
                        <Button className="btn-flag text-white">Start Shopping</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {orders.map(order => (
                      <Card key={order.id} className="flag-card border-0 shadow-sm">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="font-semibold text-white">{order.orderNumber}</p>
                              <p className="text-sm text-blue-300/70">
                                {new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                                {order.status}
                              </span>
                              <p className="font-semibold text-white mt-1">${order.total.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {order.items?.slice(0, 3).map((item: any) => (
                              <div key={item.id} className="flex items-center gap-3">
                                <img
                                  src={item.image || '/placeholder.jpg'}
                                  alt={item.name}
                                  className="w-12 h-12 object-cover rounded"
                                  onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{item.name}</p>
                                  <p className="text-xs text-blue-300/70">Size: {item.size} | Color: {item.color} | Qty: {item.quantity}</p>
                                </div>
                                <p className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                              </div>
                            ))}
                            {order.items?.length > 3 && (
                              <p className="text-xs text-blue-300/70 pl-15">+{order.items.length - 3} more items</p>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4 pt-4 border-t">
                            <span className="text-xs text-blue-300/70">
                              Payment: {order.paymentMethod === 'google_pay' ? 'Google Pay' : 'Card'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Pagination */}
                    {orderPages > 1 && (
                      <div className="flex justify-center gap-2 mt-4">
                        <Button variant="outline" disabled={orderPage === 1} onClick={() => setOrderPage(p => p - 1)}>
                          Previous
                        </Button>
                        <span className="flex items-center px-4 text-sm text-blue-200">
                          Page {orderPage} of {orderPages}
                        </span>
                        <Button variant="outline" disabled={orderPage === orderPages} onClick={() => setOrderPage(p => p + 1)}>
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Saved Addresses</h2>
                  <Button
                    onClick={() => setShowAddAddress(!showAddAddress)}
                    className="btn-flag text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Address
                  </Button>
                </div>

                {/* Add Address Form */}
                {showAddAddress && (
                  <Card className="flag-card border-0 shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-white mb-4">New Address</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label>Full Name</Label>
                          <Input value={newAddress.fullName} onChange={e => setNewAddress({ ...newAddress, fullName: e.target.value })} />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Address Line 1</Label>
                          <Input value={newAddress.line1} onChange={e => setNewAddress({ ...newAddress, line1: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Address Line 2 (Optional)</Label>
                          <Input value={newAddress.line2} onChange={e => setNewAddress({ ...newAddress, line2: e.target.value })} />
                        </div>
                        <div>
                          <Label>City</Label>
                          <Input value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} />
                        </div>
                        <div>
                          <Label>State</Label>
                          <Input value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} />
                        </div>
                        <div>
                          <Label>Postal Code</Label>
                          <Input value={newAddress.postalCode} onChange={e => setNewAddress({ ...newAddress, postalCode: e.target.value })} />
                        </div>
                        <div>
                          <Label>Country</Label>
                          <Input value={newAddress.country} disabled />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <Button onClick={handleAddAddress} className="btn-flag text-white">Save Address</Button>
                        <Button variant="outline" onClick={() => setShowAddAddress(false)}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {addresses.length === 0 && !showAddAddress ? (
                  <Card className="flag-card border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                      <MapPin className="w-12 h-12 text-blue-300/70 mx-auto mb-4" />
                      <p className="text-blue-200">No saved addresses yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  addresses.map(address => (
                    <Card key={address.id} className="flag-card border-0 shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-white">{address.fullName}</p>
                              {address.isDefault && (
                                <span className="text-xs bg-[#DC143C] text-white px-2 py-0.5 rounded font-medium">Default</span>
                              )}
                            </div>
                            <p className="text-sm text-blue-200">{address.phone}</p>
                            <p className="text-sm text-blue-200">
                              {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.postalCode}, {address.country}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!address.isDefault && (
                              <Button variant="outline" size="sm" onClick={() => handleSetDefault(address.id)}>
                                Set Default
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => handleDeleteAddress(address.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* WISHLIST TAB */}
            {activeTab === 'wishlist' && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">My Wishlist</h2>

                {wishlistLoading ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <Card key={i} className="flag-card border-0 shadow-sm">
                        <CardContent className="p-4 animate-pulse">
                          <div className="bg-[#e0e0e0] h-40 rounded mb-3" />
                          <div className="h-4 bg-[#e0e0e0] rounded w-3/4 mb-2" />
                          <div className="h-4 bg-[#e0e0e0] rounded w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : wishlist.length === 0 ? (
                  <Card className="flag-card border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                      <Heart className="w-12 h-12 text-blue-300/70 mx-auto mb-4" />
                      <p className="text-blue-200 mb-4">Your wishlist is empty.</p>
                      <Link to="/shop">
                        <Button className="btn-flag text-white">Browse Products</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wishlist.map((item: any) => (
                      <Card key={item.id} className="flag-card border-0 shadow-sm group">
                        <CardContent className="p-4">
                          <Link to={`/product/${item.product.id}`}>
                            <div className="relative overflow-hidden rounded mb-3">
                              <img
                                src={item.product.images?.[0] || '/placeholder.jpg'}
                                alt={item.product.name}
                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
                              />
                            </div>
                            <p className="font-medium text-white mb-1">{item.product.name}</p>
                            <p className="text-[#DC143C] font-semibold">${item.product.price.toFixed(2)}</p>
                          </Link>
                          <div className="flex gap-2 mt-3">
                            <Link to={`/product/${item.product.id}`} className="flex-1">
                              <Button className="w-full btn-flag text-white text-xs h-8">View Product</Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 border-red-200 hover:bg-red-50 h-8"
                              onClick={() => handleRemoveWishlist(item.product.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}