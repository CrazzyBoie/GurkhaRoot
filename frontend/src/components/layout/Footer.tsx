import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function Footer() {
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
  };

  return (
    <footer className="text-white" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #001f5c 50%, #0a0408 100%)' }}>
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold text-[#DC143C] mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                JOIN THE FAMILY
              </h3>
              <p className="text-blue-200">Subscribe for exclusive offers, new arrivals, and stories from our roots.</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full max-w-md gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-white/10 border-white/15 text-white placeholder:text-blue-300"
              />
              <Button type="submit" className="text-white border-white/20 hover:border-[#DC143C] hover:text-[#DC143C]" style={{ background: 'linear-gradient(135deg,#DC143C,#8B0000)' }}>
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h2 className="text-3xl font-bold text-[#DC143C] mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              GURKHA ROOTS
            </h2>
            <p className="text-blue-200 mb-4">
              Born between two flags — Nepal and New Zealand. Streetwear and casual fashion that celebrates heritage and modern style.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/gurkharootsnz" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://www.instagram.com/gurkharootsnz" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://wa.me/64226912942" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.535 5.858L.057 23.882l6.195-1.453A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.878 9.878 0 01-5.031-1.378l-.361-.214-3.741.877.894-3.658-.235-.374A9.861 9.861 0 012.106 12C2.106 6.58 6.58 2.106 12 2.106S21.894 6.58 21.894 12 17.42 21.894 12 21.894z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@gurkharootsnz" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/shop" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                  Shop All
                </Link>
              </li>
              <li>
                <Link to="/shop?newArrival=true" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/shop?featured=true" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                  Featured
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                  My Account
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Categories</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/shop?category=Tops" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                  Tops
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Jackets" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                  Jackets
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Pants" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                  Pants
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Hoodies" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                  Hoodies
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Accessories" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                  Accessories
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-[#c8a96e] mt-0.5" />
                <span className="text-blue-300">
                  123 Fashion Street<br />
                  Auckland, Auckland 2000<br />
                  New Zealand
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-[#c8a96e]" />
                <span className="text-blue-300">+61 2 1234 5678</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-[#c8a96e]" />
                <span className="text-blue-300">hello@gurkharoots.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-blue-300 text-sm">
              © {new Date().getFullYear()} Gurkha Roots. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm">
              <Link to="#" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                Privacy Policy
              </Link>
              <Link to="#" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                Terms of Service
              </Link>
              <Link to="#" className="text-blue-300 hover:text-[#DC143C] transition-colors">
                Shipping Info
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}