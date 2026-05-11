import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Filter, Grid3X3, LayoutList, ShoppingCart, X } from 'lucide-react';
import { useProductStore, useCartStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

type ProductVariant = { id?: string; size: string; color: string; colorHex: string; stock: number };
type ProductType = { id: string; name: string; price: number; images: string[]; category: string; variants: ProductVariant[] };

function ProductCard({ product }: { product: ProductType }) {
  const { addItem } = useCartStore();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Guard against missing variants (shouldn't happen, but prevents crash)
  const variants = product.variants ?? [];
  const uniqueSizes = [...new Set(variants.map(v => v.size))];
  const uniqueColors = variants.reduce<{ color: string; hex: string }[]>((acc, v) => {
    if (!acc.find(c => c.color === v.color)) acc.push({ color: v.color, hex: v.colorHex });
    return acc;
  }, []);
  const isOutOfStock = variants.length === 0 || variants.every(v => v.stock === 0);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    // If only one size and one color, add directly
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
    if (!selectedSize || !selectedColor) {
      toast.error('Please select size and color');
      return;
    }
    const variant = variants.find(
      v => v.size === selectedSize && v.color === selectedColor && v.stock > 0
    );
    if (!variant) {
      toast.error('This combination is out of stock');
      return;
    }
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
                <span className="btn-flag text-white px-4 py-2 text-sm font-semibold uppercase tracking-wider">
                  Sold Out
                </span>
              </div>
            )}
            {/* Quick Add Button — appears on hover */}
            {!isOutOfStock && (
              <button
                onClick={handleQuickAdd}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 btn-flag text-white text-xs font-semibold px-4 py-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 whitespace-nowrap"
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

            {/* Size Badges */}
            <div className="flex flex-wrap gap-1 mt-2">
              {uniqueSizes.slice(0, 4).map(size => (
                <span key={size} className="text-[10px] px-1.5 py-0.5 bg-[#f5f5f0] text-blue-200">
                  {size}
                </span>
              ))}
              {uniqueSizes.length > 4 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-[#f5f5f0] text-blue-200">
                  +{uniqueSizes.length - 4}
                </span>
              )}
            </div>

            {/* Color Dots */}
            <div className="flex items-center gap-1 mt-2">
              {uniqueColors.slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border border-[#ddd]"
                  style={{ backgroundColor: c.hex }}
                  title={c.color}
              />
            ))}
            {uniqueColors.length > 5 && (
              <span className="text-[10px] text-blue-300/70">+{uniqueColors.length - 5}</span>
            )}
          </div>

            <p className="text-[#DC143C] font-semibold mt-3">${product.price.toFixed(2)}</p>
          </CardContent>
        </Card>
      </Link>

      {/* Size/Color picker popover */}
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

          {/* Size */}
          <div className="mb-3">
            <p className="text-xs text-blue-300/70 mb-1.5 uppercase tracking-wider">Size</p>
            <div className="flex flex-wrap gap-1.5">
              {uniqueSizes.map(size => {
                const available = variants.some(
                  v => v.size === size && (!selectedColor || v.color === selectedColor) && v.stock > 0
                );
                return (
                  <button
                    key={size}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setSelectedSize(size); }}
                    disabled={!available}
                    className={`px-2.5 py-1 text-xs border font-medium transition-colors ${
                      selectedSize === size
                        ? 'btn-flag text-white border-[#1a1a1a]'
                        : available
                        ? 'border-[#ddd] text-white hover:border-[#1a1a1a]'
                        : 'border-[#eee] text-[#ccc] cursor-not-allowed line-through'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color */}
          <div className="mb-3">
            <p className="text-xs text-blue-300/70 mb-1.5 uppercase tracking-wider">Color</p>
            <div className="flex flex-wrap gap-2">
              {uniqueColors.map(c => {
                const available = variants.some(
                  v => v.color === c.color && (!selectedSize || v.size === selectedSize) && v.stock > 0
                );
                return (
                  <button
                    key={c.color}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setSelectedColor(c.color); }}
                    disabled={!available}
                    title={c.color}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      selectedColor === c.color
                        ? 'border-[#1a1a1a] scale-110'
                        : available
                        ? 'border-transparent hover:border-[#888]'
                        : 'opacity-30 cursor-not-allowed'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                );
              })}
            </div>
          </div>

          <button
            onClick={handlePickerAdd}
            className="w-full btn-flag text-white py-2 text-xs font-semibold hover:opacity-90 transition-colors"
          >
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

export function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, categories, pagination, isLoading, fetchProducts, fetchCategories } = useProductStore();
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const applyFilters = useCallback(() => {
    const params: Record<string, string> = {};
    
    if (selectedCategories.length > 0) params.category = selectedCategories[0];
    if (selectedSizes.length > 0) params.size = selectedSizes[0];
    if (priceRange[0] > 0) params.minPrice = priceRange[0].toString();
    if (priceRange[1] < 500) params.maxPrice = priceRange[1].toString();
    if (sortBy) params.sort = sortBy;
    
    const searchQuery = searchParams.get('search');
    if (searchQuery) params.search = searchQuery;
    
    const featured = searchParams.get('featured');
    if (featured === 'true') params.featured = 'true';
    
    const newArrival = searchParams.get('newArrival');
    if (newArrival === 'true') params.newArrival = 'true';

    setSearchParams(params);
    fetchProducts(params);
  }, [selectedCategories, selectedSizes, priceRange, sortBy, searchParams]);

  useEffect(() => {
    fetchCategories();
    
    const params: Record<string, string | number | boolean> = {};
    
    const category = searchParams.get('category');
    if (category) {
      params.category = category;
      setSelectedCategories([category]);
    }
    
    const search = searchParams.get('search');
    if (search) params.search = search;
    
    const featured = searchParams.get('featured');
    if (featured === 'true') params.featured = true;
    
    const newArrival = searchParams.get('newArrival');
    if (newArrival === 'true') params.newArrival = true;
    
    fetchProducts(params);
  }, []);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSizes([]);
    setPriceRange([0, 500]);
    setSortBy('newest');
    setSearchParams({});
    fetchProducts();
  };

  const handlePageChange = (page: number) => {
    fetchProducts({}, page);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flag-header py-12">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <h1 
            className="text-4xl lg:text-5xl font-bold text-white"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            SHOP
          </h1>
          <p className="text-blue-300/70 mt-2">
            {searchParams.get('search') ? `Search results for "${searchParams.get('search')}"` : 
             searchParams.get('featured') === 'true' ? 'Featured Products' :
             searchParams.get('newArrival') === 'true' ? 'New Arrivals' :
             'All Products'}
          </p>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden">
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-full flex items-center justify-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(selectedCategories.length > 0 || selectedSizes.length > 0) && (
                <span className="bg-[#DC143C] text-white text-xs px-2 py-0.5 rounded-full">
                  {selectedCategories.length + selectedSizes.length}
                </span>
              )}
            </Button>
          </div>

          {/* Sidebar Filters */}
          <aside className={`lg:w-64 flex-shrink-0 ${isFilterOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Filters</h3>
                <button onClick={clearFilters} className="text-sm text-[#DC143C] hover:underline">
                  Clear All
                </button>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h4 className="font-medium text-white mb-3">Categories</h4>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <label key={category.name} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={selectedCategories.includes(category.name)}
                        onCheckedChange={() => toggleCategory(category.name)}
                      />
                      <span className="text-sm text-blue-200">{category.name}</span>
                      <span className="text-xs text-blue-300/70">({category.count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="font-medium text-white mb-3">Price Range</h4>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={500}
                  step={10}
                  className="mb-2"
                />
                <div className="flex justify-between text-sm text-blue-200">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
              </div>

              {/* Sizes */}
              <div className="mb-6">
                <h4 className="font-medium text-white mb-3">Sizes</h4>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={`px-3 py-1 text-sm border transition-colors ${
                        selectedSizes.includes(size)
                          ? 'btn-flag text-white border-[#1a1a1a]'
                          : 'bg-white text-blue-200 border-[#ddd] hover:border-[#1a1a1a]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={applyFilters} className="w-full bg-[#DC143C] text-white hover:bg-[#CC142B]">
                Apply Filters
              </Button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <p className="text-blue-200">
                Showing {products.length} of {pagination?.total || 0} products
              </p>
              
              <div className="flex items-center gap-4">
                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-200">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      applyFilters();
                    }}
                    className="border border-[#ddd] rounded px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="newest">Newest</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>

                {/* View Mode */}
                <div className="hidden sm:flex items-center border border-[#ddd] rounded">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'btn-flag text-white' : 'text-blue-200'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'btn-flag text-white' : 'text-blue-200'}`}
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-4 lg:gap-6`}>
              {isLoading ? (
                Array(8).fill(0).map((_, i) => <ProductSkeleton key={i} />)
              ) : products.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-blue-300/70 text-lg">No products found</p>
                  <Button onClick={clearFilters} variant="outline" className="mt-4">
                    Clear Filters
                  </Button>
                </div>
              ) : (
                products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center mt-10">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={pagination.page === page ? 'default' : 'outline'}
                      onClick={() => handlePageChange(page)}
                      className={pagination.page === page ? 'bg-[#DC143C] text-white' : ''}
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}