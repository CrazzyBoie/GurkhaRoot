import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, Menu, X } from 'lucide-react';
import { useAuthStore, useCartStore } from '@/stores';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { user, isAuthenticated, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
    { name: 'New Arrivals', href: '/shop?newArrival=true' },
    { name: 'Featured', href: '/shop?featured=true' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#001f5c]/95 backdrop-blur-md shadow-lg border-b border-white/10'
          : 'bg-[#001f5c]'
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo + Brand Name */}
          <Link to="/" className="flex items-center space-x-3">
            {/* Logo with matching background */}
            <div className="bg-blue-950 p-2 rounded-lg flex items-center justify-center">
              <img
                src="/logo.png"           // Your Gurkha Roots logo
                alt="Gurkha Roots Logo"
                className="h-9 w-auto lg:h-11 object-contain"
              />
            </div>

            {/* Brand Text */}
            <span
              className="text-2xl lg:text-3xl font-bold text-white tracking-wider"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              GURKHA ROOTS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-white/90 hover:text-[#DC143C] transition-colors text-sm uppercase tracking-wider font-medium"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden lg:flex items-center">
            <div className="relative">
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 xl:w-64 bg-white/10 border-white/15 text-white placeholder:text-blue-200 pr-10 focus:border-[#DC143C]"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-[#DC143C]"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* Cart with Hover Tooltip */}
            <div className="relative group">
              <Link to="/cart">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-white hover:text-[#DC143C] hover:bg-transparent"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {getItemCount() > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#DC143C] text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {getItemCount()}
                    </span>
                  )}
                </Button>
              </Link>
              <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-lg border border-gray-700">
                Cart
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-l border-t border-gray-700 rotate-45"></div>
              </div>
            </div>

            {/* Account with Hover Tooltip */}
            {isAuthenticated ? (
              <div className="relative group">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:text-[#DC143C] hover:bg-transparent"
                    >
                      <User className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-[#001f5c] border-white/10"
                  >
                    <div className="px-3 py-2 text-white">
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-xs text-blue-300">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="text-white hover:text-[#DC143C] cursor-pointer">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile?tab=orders" className="text-white hover:text-[#DC143C] cursor-pointer">
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    {(user?.role === 'super_admin' || user?.role === 'inventory_manager') && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="text-white hover:text-blue-300 cursor-pointer">
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-white hover:text-[#DC143C] cursor-pointer"
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-lg border border-gray-700">
                  Account
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-l border-t border-gray-700 rotate-45"></div>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <Link to="/login">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-[#DC143C] hover:bg-transparent"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
                <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-lg border border-gray-700">
                  Login / Account
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-l border-t border-gray-700 rotate-45"></div>
                </div>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:text-[#DC143C] hover:bg-transparent"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10">
          <div className="px-4 py-4 space-y-4">
            <form onSubmit={handleSearch} className="flex items-center">
              <div className="relative w-full">
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border-white/15 text-white placeholder:text-blue-200 pr-10 focus:border-[#DC143C]"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-[#DC143C]"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            <nav className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-white/90 hover:text-[#DC143C] transition-colors py-2 text-sm uppercase tracking-wider font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}