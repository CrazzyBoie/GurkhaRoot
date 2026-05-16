import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, MapPin, Mail, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ordersApi } from '@/services/api';

const STATUS_STEPS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  PENDING:    { label: 'Pending',    icon: Clock,        color: 'text-yellow-700', bg: 'bg-yellow-100' },
  PROCESSING: { label: 'Processing', icon: Package,      color: 'text-blue-700',   bg: 'bg-blue-100'   },
  SHIPPED:    { label: 'Shipped',    icon: Truck,        color: 'text-purple-700', bg: 'bg-purple-100' },
  DELIVERED:  { label: 'Delivered',  icon: CheckCircle,  color: 'text-green-700',  bg: 'bg-green-100'  },
  CANCELLED:  { label: 'Cancelled',  icon: XCircle,      color: 'text-red-700',    bg: 'bg-red-100'    },
};

export function TrackOrder() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [email, setEmail]             = useState(searchParams.get('email') || '');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [order, setOrder]             = useState<any>(null);

  // Auto-lookup if both params are in the URL (e.g. from email link)
  useEffect(() => {
    const qOrderNumber = searchParams.get('orderNumber');
    const qEmail       = searchParams.get('email');
    if (qOrderNumber && qEmail) {
      setOrderNumber(qOrderNumber);
      setEmail(qEmail);
      handleTrack(qOrderNumber, qEmail);
    }
  }, []);

  const handleTrack = async (on = orderNumber, em = email) => {
    if (!on.trim() || !em.trim()) {
      setError('Please enter both your order number and email address.');
      return;
    }
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await ordersApi.trackOrder(on.trim(), em.trim());
      setOrder(res.data.order);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Order not found. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;
  const isCancelled = order?.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {/* Header */}
      <div className="bg-[#1a1a1a] py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h1
            className="text-4xl lg:text-5xl font-bold text-[#c8a96e]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px' }}
          >
            TRACK YOUR ORDER
          </h1>
          <p className="text-[#f5f5f0]/70 mt-2">
            Enter your order number and email to see your order status.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Lookup form */}
        <Card className="bg-white border-0 shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-[#1a1a1a] font-medium mb-1 block">Order Number</Label>
                <Input
                  placeholder="e.g. GR-20250515-1234"
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTrack()}
                  className="border-[#ddd] focus:border-[#c8a96e] focus:ring-[#c8a96e]"
                />
              </div>
              <div>
                <Label className="text-[#1a1a1a] font-medium mb-1 block">Email Address</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTrack()}
                  className="border-[#ddd] focus:border-[#c8a96e] focus:ring-[#c8a96e]"
                />
              </div>
            </div>
            {error && (
              <p className="text-red-600 text-sm mb-4">{error}</p>
            )}
            <Button
              onClick={() => handleTrack()}
              disabled={loading}
              className="bg-[#c8a96e] text-[#1a1a1a] hover:bg-[#b8985e] font-semibold w-full sm:w-auto"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
                  Searching…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Track Order
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Order result */}
        {order && (
          <div className="space-y-6">

            {/* Order summary bar */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider mb-1">Order Number</p>
                    <p className="text-xl font-bold text-[#c8a96e]">{order.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider mb-1">Date Placed</p>
                    <p className="font-semibold text-[#1a1a1a]">
                      {new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider mb-1">Order Total</p>
                    <p className="font-semibold text-[#1a1a1a]">${order.total.toFixed(2)}</p>
                  </div>
                  <div>
                    {(() => {
                      const meta = STATUS_META[order.status] || STATUS_META['PENDING'];
                      const Icon = meta.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${meta.bg} ${meta.color}`}>
                          <Icon className="w-4 h-4" />
                          {meta.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress tracker (hidden for cancelled) */}
            {!isCancelled && (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="font-semibold text-[#1a1a1a] mb-6">Order Progress</h2>
                  <div className="relative flex items-start justify-between">
                    {/* connector line */}
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#e0e0e0] z-0" />
                    <div
                      className="absolute top-5 left-0 h-0.5 bg-[#c8a96e] z-0 transition-all duration-500"
                      style={{
                        width: currentStepIndex <= 0 ? '0%'
                          : currentStepIndex >= STATUS_STEPS.length - 1 ? '100%'
                          : `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`
                      }}
                    />
                    {STATUS_STEPS.map((step, i) => {
                      const meta = STATUS_META[step];
                      const Icon = meta.icon;
                      const done = i <= currentStepIndex;
                      return (
                        <div key={step} className="relative z-10 flex flex-col items-center flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                            done
                              ? 'bg-[#c8a96e] border-[#c8a96e] text-[#1a1a1a]'
                              : 'bg-white border-[#ddd] text-[#bbb]'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <p className={`mt-2 text-xs font-medium text-center leading-tight ${done ? 'text-[#1a1a1a]' : 'text-[#aaa]'}`}>
                            {meta.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancelled notice */}
            {isCancelled && (
              <Card className="bg-red-50 border border-red-200 shadow-sm">
                <CardContent className="p-6 flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-800">This order has been cancelled.</p>
                    <p className="text-sm text-red-600 mt-0.5">If you have questions, please contact us.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="font-semibold text-[#1a1a1a] mb-4">Items Ordered</h2>
                <div className="space-y-4">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 pb-4 border-b border-[#f0f0f0] last:border-0 last:pb-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-[#f0f0f0] rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-[#bbb]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1a1a1a] truncate">{item.name}</p>
                        <p className="text-sm text-[#888]">Size: {item.size} · Color: {item.color}</p>
                        <p className="text-sm text-[#888]">Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                      </div>
                      <p className="font-semibold text-[#1a1a1a] whitespace-nowrap">
                        ${(item.quantity * item.price).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-[#f0f0f0] space-y-1.5 text-sm">
                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#888]">Discount</span>
                      <span className="text-green-600 font-medium">-${order.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#888]">Shipping</span>
                    <span>{order.shippingCost === 0 ? 'Free' : `$${order.shippingCost?.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-[#f0f0f0]">
                    <span>Total</span>
                    <span className="text-[#c8a96e]">${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping address */}
            {order.shippingSnap && (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[#c8a96e]" />
                    <h2 className="font-semibold text-[#1a1a1a]">Shipping Address</h2>
                  </div>
                  <address className="not-italic text-sm text-[#555] leading-relaxed">
                    <span className="font-medium text-[#1a1a1a]">{order.shippingSnap.fullName}</span><br />
                    {order.shippingSnap.line1}<br />
                    {order.shippingSnap.line2 && <>{order.shippingSnap.line2}<br /></>}
                    {order.shippingSnap.city}, {order.shippingSnap.state} {order.shippingSnap.postalCode}<br />
                    {order.shippingSnap.country}
                  </address>
                </CardContent>
              </Card>
            )}

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/shop">
                <Button variant="outline" className="border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white w-full sm:w-auto">
                  Continue Shopping
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-[#1a1a1a] text-white hover:bg-[#333] w-full sm:w-auto flex items-center gap-2">
                  Create an Account
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-[#888]">
              <Mail className="w-3 h-3 inline mr-1" />
              Create an account to track all your orders in one place and enjoy faster checkout.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
