
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Package, Truck, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('orderNumber');

  if (!orderNumber) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] mb-4">Order Not Found</h1>
          <Link to="/shop">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] py-16">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>

          <h1 
            className="text-4xl lg:text-5xl font-bold text-[#1a1a1a] mb-4"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            ORDER CONFIRMED
          </h1>
          
          <p className="text-[#555] text-lg mb-2">
            Thank you for your order!
          </p>
          
          <p className="text-[#888] mb-8">
            We've sent a confirmation email with your order details.
          </p>

          {/* Order Number */}
          <Card className="bg-white border-0 shadow-sm mb-8">
            <CardContent className="p-6">
              <p className="text-sm text-[#888] uppercase tracking-wider mb-2">Order Number</p>
              <p className="text-2xl font-bold text-[#c8a96e]">{orderNumber}</p>
            </CardContent>
          </Card>

          {/* What's Next */}
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            <div className="bg-white p-6 shadow-sm">
              <Package className="w-8 h-8 text-[#c8a96e] mx-auto mb-3" />
              <h3 className="font-semibold text-[#1a1a1a] mb-1">Order Processing</h3>
              <p className="text-sm text-[#888]">We're preparing your items</p>
            </div>
            <div className="bg-white p-6 shadow-sm">
              <Truck className="w-8 h-8 text-[#c8a96e] mx-auto mb-3" />
              <h3 className="font-semibold text-[#1a1a1a] mb-1">Shipping</h3>
              <p className="text-sm text-[#888]">Free delivery to your door</p>
            </div>
            <div className="bg-white p-6 shadow-sm">
              <Mail className="w-8 h-8 text-[#c8a96e] mx-auto mb-3" />
              <h3 className="font-semibold text-[#1a1a1a] mb-1">Updates</h3>
              <p className="text-sm text-[#888]">We'll email you tracking info</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/shop">
              <Button 
                variant="outline" 
                className="border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f5f5f0]"
              >
                Continue Shopping
              </Button>
            </Link>
            <Link to="/profile?tab=orders">
              <Button className="bg-[#c8a96e] text-[#1a1a1a] hover:bg-[#b8985e]">
                View My Orders
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
