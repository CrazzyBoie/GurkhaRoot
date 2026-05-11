import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ArrowRight, Tag, Truck } from 'lucide-react';
import { useCartStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { couponsApi } from '@/services/api';
import { toast } from 'sonner';

export function Cart() {
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    getSubtotal, 
    getTotal, 
    couponCode, 
    discount, 
    setCoupon,
    giftWrap,
    giftNote,
    setGiftWrap,
  } = useCartStore();
  
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const navigate = useNavigate();

  const handleApplyCoupon = async () => {
    if (!promoCode.trim()) return;
    
    setIsApplyingCoupon(true);
    try {
      const response = await couponsApi.validate(promoCode.toUpperCase(), getSubtotal());
      setCoupon(response.data.coupon.code, response.data.discount);
      toast.success('Coupon applied successfully');
      setPromoCode('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid coupon code');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null, 0);
    toast.success('Coupon removed');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-white mb-4">Your Cart is Empty</h1>
            <p className="text-blue-300/70 mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Link to="/shop">
              <Button className="bg-[#DC143C] text-white hover:bg-[#CC142B]">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flag-header py-12">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <h1 
            className="text-4xl lg:text-5xl font-bold text-white"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            SHOPPING CART
          </h1>
          <p className="text-blue-300/70 mt-2">{items.length} items in your cart</p>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.variantId} className="flag-card border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                      <img
                        src={item.image || '/placeholder-product.jpg'}
                        alt={item.name}
                        className="w-24 h-24 lg:w-32 lg:h-32 object-cover"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/product/${item.productId}`}>
                        <h3 className="font-medium text-white truncate hover:text-[#DC143C]">
                          {item.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-blue-300/70 mt-1">
                        Size: {item.size} | Color: {item.color}
                      </p>
                      <p className="text-[#DC143C] font-semibold mt-2">
                        ${item.price.toFixed(2)}
                      </p>
                      
                      <div className="flex items-center justify-between mt-4">
                        {/* Quantity */}
                        <div className="flex items-center border border-[#ddd]">
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            className="px-3 py-1.5 hover:bg-white/5"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4 py-1.5 min-w-[3rem] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            className="px-3 py-1.5 hover:bg-white/5"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.variantId)}
                          className="text-blue-300/70 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold text-white">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Link to="/shop">
              <Button variant="outline" className="mt-4">
                Continue Shopping
              </Button>
            </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="flag-card border-0 shadow-sm sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>
                
                {/* Promo Code */}
                <div className="mb-6">
                  {couponCode ? (
                    <div className="flex items-center justify-between bg-[#f5f5f0] p-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#DC143C]" />
                        <span className="text-sm font-medium">{couponCode}</span>
                      </div>
                      <button onClick={removeCoupon} className="text-blue-300/70 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleApplyCoupon}
                        disabled={isApplyingCoupon || !promoCode.trim()}
                        variant="outline"
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </div>

                {/* Gift Wrap */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={giftWrap}
                      onChange={(e) => setGiftWrap(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-blue-200">Add gift wrap ($5.00)</span>
                  </label>
                  {giftWrap && (
                    <textarea
                      placeholder="Add a gift note (optional)"
                      value={giftNote}
                      onChange={(e) => setGiftWrap(true, e.target.value)}
                      className="w-full mt-2 p-2 border border-[#ddd] rounded text-sm"
                      rows={2}
                    />
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-blue-200">
                    <span>Subtotal</span>
                    <span>${getSubtotal().toFixed(2)}</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {giftWrap && (
                    <div className="flex justify-between text-blue-200">
                      <span>Gift Wrap</span>
                      <span>$5.00</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-blue-200">
                    <span className="flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      Shipping
                    </span>
                    <span className="text-green-600">Shipping will be calculated at checkout</span>
                  </div>
                  
                  <div className="border-t border-[#ddd] pt-2 mt-2">
                    <div className="flex justify-between text-lg font-semibold text-white">
                      <span>Total</span>
                      <span>${(getTotal() + (giftWrap ? 5 : 0)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => navigate('/checkout')}
                  className="w-full mt-6 bg-[#DC143C] text-white hover:bg-[#CC142B] py-6"
                >
                  Proceed to Checkout
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>

                <p className="text-center text-xs text-blue-300/70 mt-4">
                  Taxes calculated at checkout
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}