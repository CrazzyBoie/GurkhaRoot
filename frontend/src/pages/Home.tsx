import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingCart, X } from 'lucide-react';
import { useProductStore, useCartStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type HomeVariant = { id?: string; size: string; color: string; colorHex: string; stock: number };
type HomeProduct = { id: string; name: string; price: number; images: string[]; category: string; variants?: HomeVariant[] };

function ProductCard({ product }: { product: HomeProduct }) {
  const { addItem } = useCartStore();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const variants = product.variants || [];
  const uniqueSizes = [...new Set(variants.map(v => v.size))];
  const uniqueColors = variants.reduce<{ color: string; hex: string }[]>((acc, v) => {
    if (!acc.find(c => c.color === v.color)) acc.push({ color: v.color, hex: v.colorHex });
    return acc;
  }, []);
  const isOutOfStock = variants.length > 0 && variants.every(v => v.stock === 0);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || variants.length === 0) return;
    if (uniqueSizes.length === 1 && uniqueColors.length === 1) {
      const variant = variants.find(v => v.stock > 0);
      if (variant) {
        addItem(product as any, variant as any, 1);
        toast.success(`${product.name} added to cart!`);
      }
      return;
    }
    setShowPicker(true);
  };

  const handlePickerAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSize || !selectedColor) { toast.error('Please select size and color'); return; }
    const variant = variants.find(v => v.size === selectedSize && v.color === selectedColor && v.stock > 0);
    if (!variant) { toast.error('This combination is out of stock'); return; }
    addItem(product as any, variant as any, 1);
    toast.success(`${product.name} added to cart!`);
    setShowPicker(false);
    setSelectedSize(null);
    setSelectedColor(null);
  };

  return (
    <div className="relative">
      <Link to={`/product/${product.id}`}>
        <Card className="group flag-card border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="relative aspect-[3/4] overflow-hidden bg-white/10">
            <img
              src={product.images[0] || '/placeholder-product.jpg'}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="bg-[#1a1a1a] text-white px-4 py-2 text-sm font-semibold uppercase tracking-wider">Sold Out</span>
              </div>
            )}
            {!isOutOfStock && variants.length > 0 && (
              <button
                onClick={handleQuickAdd}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-xs font-semibold px-4 py-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 whitespace-nowrap"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Quick Add
              </button>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
          <CardContent className="p-4">
            <p className="text-xs text-blue-300/70 uppercase tracking-wider mb-1">{product.category}</p>
            <h3 className="font-medium text-white truncate">{product.name}</h3>
            <p className="text-[#DC143C] font-semibold mt-1">${product.price.toFixed(2)}</p>
          </CardContent>
        </Card>
      </Link>

      {showPicker && (
        <div
          className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-white/10 shadow-xl p-4 z-50"
          onClick={e => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-white">Quick Add</span>
            <button onClick={e => { e.preventDefault(); e.stopPropagation(); setShowPicker(false); }}>
              <X className="w-4 h-4 text-blue-300/70" />
            </button>
          </div>
          <div className="mb-3">
            <p className="text-xs text-blue-300/70 mb-1.5 uppercase tracking-wider">Size</p>
            <div className="flex flex-wrap gap-1.5">
              {uniqueSizes.map(size => {
                const available = variants.some(v => v.size === size && (!selectedColor || v.color === selectedColor) && v.stock > 0);
                return (
                  <button key={size} onClick={e => { e.preventDefault(); e.stopPropagation(); setSelectedSize(size); }} disabled={!available}
                    className={`px-2.5 py-1 text-xs border font-medium transition-colors ${selectedSize === size ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : available ? 'border-[#ddd] text-white hover:border-[#1a1a1a]' : 'border-[#eee] text-[#ccc] cursor-not-allowed line-through'}`}>
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mb-3">
            <p className="text-xs text-blue-300/70 mb-1.5 uppercase tracking-wider">Color</p>
            <div className="flex flex-wrap gap-2">
              {uniqueColors.map(c => {
                const available = variants.some(v => v.color === c.color && (!selectedSize || v.size === selectedSize) && v.stock > 0);
                return (
                  <button key={c.color} onClick={e => { e.preventDefault(); e.stopPropagation(); setSelectedColor(c.color); }} disabled={!available} title={c.color}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${selectedColor === c.color ? 'border-[#1a1a1a] scale-110' : available ? 'border-transparent hover:border-[#888]' : 'opacity-30 cursor-not-allowed'}`}
                    style={{ backgroundColor: c.hex }} />
                );
              })}
            </div>
          </div>
          <button onClick={handlePickerAdd} className="w-full bg-[#1a1a1a] text-white py-2 text-xs font-semibold hover:bg-[#333] transition-colors">
            Add to Cart
          </button>
        </div>
      )}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <Card className="flag-card border-0 shadow-sm overflow-hidden">
      <Skeleton className="aspect-[3/4]" />
      <CardContent className="p-4">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  );
}

export function Home() {
  const { 
    featuredProducts, 
    newArrivals, 
    isFeaturedLoading,
    isNewArrivalsLoading,
    fetchFeaturedProducts, 
    fetchNewArrivals 
  } = useProductStore();

  // Show skeleton while either section is still loading
  const isLoading = isFeaturedLoading || isNewArrivalsLoading;

  const newArrivalsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFeaturedProducts();
    fetchNewArrivals();
  }, []);

  const scrollNewArrivals = (direction: 'left' | 'right') => {
    if (newArrivalsRef.current) {
      const scrollAmount = 320;
      newArrivalsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const categories = [
    { name: 'Tops', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', href: '/shop?category=Tops' },
    { name: 'Jackets', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', href: '/shop?category=Jackets' },
    { name: 'Pants', image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400', href: '/shop?category=Pants' },
    { name: 'Hoodies', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', href: '/shop?category=Hoodies' },
    { name: 'Accessories', image: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400', href: '/shop?category=Accessories' },
  ];

  return (
    <div className="">
      {/* Hero Section */}
      {/* 
        Background: blend of Nepal flag (crimson #DC143C + blue #003087) 
        and New Zealand flag (navy #00247D + red #CC142B).
        Diagonal gradient — Nepal red (top-left) → shared deep navy (centre) → NZ darker red (bottom-right).
      */}
      <section
        className="relative h-screen min-h-[600px] flex items-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #8B0A1A 0%, #003087 35%, #00247D 65%, #6B0000 100%)',
        }}
      >
        {/* Subtle noise/texture overlay to add depth */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 20% 50%, #DC143C44 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, #CC142B44 0%, transparent 60%)',
          }}
        />

        {/* Logo image — right half, fully contained */}
        <div className="absolute inset-0 flex items-center justify-end">
          <img
            src="/logo.png"
            alt="Gurkha Roots"
            className="h-full w-auto max-w-[65%] object-contain object-right"
            style={{ filter: 'brightness(0.9) saturate(0.7) opacity(0.55)' }}
          />
          {/* Left-to-right fade so text area stays clean */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, rgba(0,48,135,0.92) 0%, rgba(0,36,125,0.75) 45%, transparent 100%)',
            }}
          />
        </div>

        {/* Text content — left side */}
        <div className="relative z-10 w-full px-6 sm:px-12 lg:px-20 max-w-2xl">
          {/* Nepal flag crimson accent line */}
          <div className="flex items-center gap-3 mb-5">
            <span className="inline-block w-8 h-0.5 bg-[#DC143C]" />
            <p className="text-[#f5c6cb] text-sm tracking-[0.3em] uppercase font-medium">
              Roots Run Deep
            </p>
            <span className="inline-block w-8 h-0.5 bg-[#CC142B]" />
          </div>
          <h1
            className="text-6xl sm:text-7xl lg:text-9xl font-bold text-white leading-none tracking-wider mb-6"
            style={{ fontFamily: "'Bebas Neue', sans-serif", textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
          >
            GURKHA ROOTS
          </h1>
          <p className="text-blue-100 text-base sm:text-lg max-w-sm mb-10 leading-relaxed opacity-90">
            Born between two flags — Nepal and New Zealand. Streetwear that celebrates heritage.
          </p>
          <Link to="/shop">
            <Button
              size="lg"
              className="px-10 py-6 text-base font-semibold tracking-wide text-white border-2 border-white/40 hover:border-white transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #DC143C, #8B0000)', boxShadow: '0 4px 20px rgba(220,20,60,0.4)' }}
            >
              Shop Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="py-16 lg:py-24 flag-header">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 
                className="text-3xl lg:text-4xl font-bold text-white"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                NEW ARRIVALS
              </h2>
              <p className="text-blue-300/70 mt-1">Fresh drops from Gurkha Roots</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => scrollNewArrivals('left')}
                className="p-2 border border-[#333] text-white hover:border-[#c8a96e] hover:text-[#DC143C] transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollNewArrivals('right')}
                className="p-2 border border-[#333] text-white hover:border-[#c8a96e] hover:text-[#DC143C] transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div 
            ref={newArrivalsRef}
            className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-72">
                  <ProductSkeleton />
                </div>
              ))
            ) : (
              newArrivals.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-72">
                  <ProductCard product={product} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 
              className="text-3xl lg:text-4xl font-bold text-white"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              FEATURED PRODUCTS
            </h2>
            <p className="text-blue-300/70 mt-2">Handpicked favorites from our collection</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {isLoading ? (
              Array(8).fill(0).map((_, i) => <ProductSkeleton key={i} />)
            ) : (
              featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
          
          <div className="text-center mt-10">
            <Link to="/shop">
              <Button 
                variant="outline" 
                className="border-[#1a1a1a] text-blue-300 hover:bg-[#1a1a1a] hover:text-blue-300 transition-colors"
              >
                View All Products
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 lg:py-24 bg-[#e8e8e3]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 
              className="text-3xl lg:text-4xl font-bold text-white"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              SHOP BY CATEGORY
            </h2>
            <p className="text-blue-300/70 mt-2">Find your perfect style</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((category) => (
              <Link key={category.name} to={category.href}>
                <div className="group relative aspect-square overflow-hidden flag-header">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h3 
                      className="text-xl lg:text-2xl font-bold text-white tracking-wider"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {category.name.toUpperCase()}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="py-16 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800"
                alt="Gurkha Roots Store"
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-[#c8a96e] hidden lg:block" />
            </div>
            <div>
              <h2 
                className="text-3xl lg:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                BORN BETWEEN TWO FLAGS
              </h2>
              <p className="text-[#DC143C] text-lg mb-4">Nepal and Newzeland</p>
              <p className="text-blue-200 mb-6 leading-relaxed">
                Gurkha Roots is more than just a clothing brand — it's a celebration of heritage, 
                courage, and connection. Inspired by the legendary Gurkha warriors of Nepal and 
                the laid-back Newzeland lifestyle, we create streetwear that tells a story.
              </p>
              <p className="text-blue-200 mb-8 leading-relaxed">
                Every piece in our collection is designed with purpose, blending traditional 
                Nepali craftsmanship with modern Newzeland fashion sensibilities. From the 
                mountains of the Himalayas to the beaches of Bondi, our roots run deep.
              </p>
              <Link to="/shop">
                <Button className="bg-[#1a1a1a] text-white hover:bg-[#333]">
                  Explore Our Story
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}