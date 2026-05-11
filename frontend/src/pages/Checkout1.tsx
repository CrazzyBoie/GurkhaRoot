import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, Package, Check } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ordersApi, userApi } from '@/services/api';
import { toast } from 'sonner';

export function Checkout() {
  const { items, getTotal, couponCode, discount, giftWrap, giftNote, clearCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cod'>('cod');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  
  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: 'Australia',
    postalCode: '',
  });

  // Load saved addresses if authenticated
  useState(() => {
    if (isAuthenticated) {
      userApi.getAddresses().then(res => {
        setSavedAddresses(res.data.addresses);
        const defaultAddress = res.data.addresses.find((a: any) => a.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        }
      });
    }
  });

  const handlePlaceOrder = async () => {
    setIsLoading(true);
    try {
      const orderData: any = {
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        paymentMethod,
        giftWrap,
        giftNote: giftNote || undefined,
      };

      if (couponCode) {
        orderData.couponCode = couponCode;
      }

      if (selectedAddressId && isAuthenticated) {
        orderData.addressId = selectedAddressId;
      } else {
        orderData.shippingAddress = shippingAddress;
      }

      const response = await ordersApi.createOrder(orderData);
      
      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order-confirmation?orderNumber=${response.data.order.orderNumber}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  const subtotal = getTotal() + (giftWrap ? 5 : 0);

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {/* Header */}
      <div className="bg-[#1a1a1a] py-12">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <h1 
            className="text-4xl lg:text-5xl font-bold text-[#f5f5f0]"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            CHECKOUT
          </h1>
          
          {/* Steps */}
          <div className="flex items-center gap-4 mt-6">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#c8a96e]' : 'text-[#888]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-[#c8a96e] text-[#1a1a1a]' : 'bg-[#333] text-[#888]'}`}>
                <Truck className="w-4 h-4" />
              </div>
              <span className="text-sm hidden sm:inline">Shipping</span>
            </div>
            <div className="flex-1 h-px bg-[#333]" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#c8a96e]' : 'text-[#888]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-[#c8a96e] text-[#1a1a1a]' : 'bg-[#333] text-[#888]'}`}>
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-sm hidden sm:inline">Payment</span>
            </div>
            <div className="flex-1 h-px bg-[#333]" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-[#c8a96e]' : 'text-[#888]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-[#c8a96e] text-[#1a1a1a]' : 'bg-[#333] text-[#888]'}`}>
                <Check className="w-4 h-4" />
              </div>
              <span className="text-sm hidden sm:inline">Review</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Shipping Address</h2>
                  
                  {/* Saved Addresses */}
                  {savedAddresses.length > 0 && (
                    <div className="mb-6">
                      <Label className="mb-2 block">Select a saved address</Label>
                      <RadioGroup
                        value={selectedAddressId}
                        onValueChange={setSelectedAddressId}
                        className="space-y-2"
                      >
                        {savedAddresses.map((address) => (
                          <div key={address.id} className="flex items-center space-x-2 border p-3 rounded">
                            <RadioGroupItem value={address.id} id={address.id} />
                            <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                              <p className="font-medium">{address.fullName}</p>
                              <p className="text-sm text-[#888]">
                                {address.line1}, {address.city}, {address.state} {address.postalCode}
                              </p>
                              {address.isDefault && (
                                <span className="text-xs bg-[#c8a96e] text-[#1a1a1a] px-2 py-0.5 rounded">Default</span>
                              )}
                            </Label>
                          </div>
                        ))}
                        <div className="flex items-center space-x-2 border p-3 rounded">
                          <RadioGroupItem value="" id="new" />
                          <Label htmlFor="new" className="cursor-pointer">Use a new address</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* New Address Form */}
                  {(!selectedAddressId || savedAddresses.length === 0) && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>Full Name</Label>
                        <Input
                          value={shippingAddress.fullName}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                          placeholder="+61 123 456 789"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Address Line 1</Label>
                        <Input
                          value={shippingAddress.line1}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, line1: e.target.value })}
                          placeholder="123 Main Street"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Address Line 2 (Optional)</Label>
                        <Input
                          value={shippingAddress.line2}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, line2: e.target.value })}
                          placeholder="Apt 4B"
                        />
                      </div>
                      <div>
                        <Label>City</Label>
                        <Input
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                          placeholder="Sydney"
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Input
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                          placeholder="NSW"
                        />
                      </div>
                      <div>
                        <Label>Postal Code</Label>
                        <Input
                          value={shippingAddress.postalCode}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                          placeholder="2000"
                        />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <Input value={shippingAddress.country} disabled />
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={() => setStep(2)} 
                    className="w-full mt-6 bg-[#1a1a1a] text-[#f5f5f0]"
                  >
                    Continue to Payment
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Payment Method</h2>
                  
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as 'stripe' | 'cod')}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 border p-4 rounded cursor-pointer hover:border-[#c8a96e]">
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-[#c8a96e]" />
                          <div>
                            <p className="font-medium">Cash on Delivery</p>
                            <p className="text-sm text-[#888]">Pay when you receive your order</p>
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 border p-4 rounded cursor-pointer hover:border-[#c8a96e]">
                      <RadioGroupItem value="stripe" id="stripe" />
                      <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-[#c8a96e]" />
                          <div>
                            <p className="font-medium">Credit/Debit Card</p>
                            <p className="text-sm text-[#888]">Pay securely with Stripe</p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button 
                      onClick={() => setStep(3)} 
                      className="flex-1 bg-[#1a1a1a] text-[#f5f5f0]"
                    >
                      Review Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Review Your Order</h2>
                  
                  <div className="space-y-4 mb-6">
                    {items.map((item) => (
                      <div key={item.variantId} className="flex gap-4">
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover" />
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-[#888]">Size: {item.size} | Color: {item.color}</p>
                          <p className="text-sm">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Subtotal</span>
                      <span>${getTotal().toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm mb-2 text-green-600">
                        <span>Discount</span>
                        <span>-${discount.toFixed(2)}</span>
                      </div>
                    )}
                    {giftWrap && (
                      <div className="flex justify-between text-sm mb-2">
                        <span>Gift Wrap</span>
                        <span>$5.00</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm mb-2">
                      <span>Shipping</span>
                      <span className="text-green-600">Free</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button 
                      onClick={handlePlaceOrder} 
                      disabled={isLoading}
                      className="flex-1 bg-[#c8a96e] text-[#1a1a1a] hover:bg-[#b8985e]"
                    >
                      {isLoading ? 'Placing Order...' : 'Place Order'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-0 shadow-sm sticky top-24">
              <CardContent className="p-6">
                <h3 className="font-semibold text-[#1a1a1a] mb-4">Order Summary</h3>
                
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between text-[#555]">
                    <span>Items ({items.reduce((sum, i) => sum + i.quantity, 0)})</span>
                    <span>${getTotal().toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  {giftWrap && (
                    <div className="flex justify-between text-[#555]">
                      <span>Gift Wrap</span>
                      <span>$5.00</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#555]">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold text-lg text-[#1a1a1a]">
                    <span>Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
