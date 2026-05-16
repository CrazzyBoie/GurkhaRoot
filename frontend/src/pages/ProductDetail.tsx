import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, Share2, Truck, RefreshCw, Star, Send, ThumbsUp, MessageCircle, User, ZoomIn } from 'lucide-react';
import { useProductStore, useCartStore, useAuthStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { reviewsApi, productsApi } from '@/services/api';

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  verifiedPurchase: boolean;
  user: { name: string };
}

interface ReviewStats {
  average: number;
  total: number;
  distribution: Record<string, number>;
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentProduct, isProductLoading, fetchProduct } = useProductStore();
  const { addItem } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Review states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  // Live variant stock — refreshed every 30s and on page focus
  const [liveVariants, setLiveVariants] = useState<any[]>([]);

  // Modal — purely driven by image hover, modal itself is pointer-events-none
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string>('');

  // Auto-scroll
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
      fetchReviews(id, 1);
    }
  }, [id]);

  useEffect(() => {
    if (currentProduct?.images) {
      setSelectedImage(0);
      setSelectedSize(null);
      setSelectedColor(null);
      setQuantity(1);
    }
  }, [currentProduct]);

  // Fetch fresh variant stock from the server
  const fetchLiveStock = useCallback(async (productId: string) => {
    try {
      const res = await productsApi.getProduct(productId);
      if (res.data?.variants) setLiveVariants(res.data.variants);
    } catch {
      // silently ignore — stale data is better than an error
    }
  }, []);

  // Poll every 30s + refresh on window focus
  useEffect(() => {
    if (!id) return;
    fetchLiveStock(id);
    const interval = setInterval(() => fetchLiveStock(id), 30_000);
    const onFocus = () => fetchLiveStock(id);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [id, fetchLiveStock]);

  useEffect(() => {
    if (!currentProduct?.images || currentProduct.images.length <= 1) return;
    if (!isAutoScrolling) return;
    autoScrollIntervalRef.current = setInterval(() => {
      setSelectedImage(prev => {
        const next = (prev + 1) % currentProduct.images.length;
        thumbnailContainerRef.current?.scrollTo({ left: next * 88, behavior: 'smooth' });
        return next;
      });
    }, 3000);
    return () => { if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current); };
  }, [currentProduct?.images, isAutoScrolling]);

  const stopAutoScroll = useCallback(() => {
    setIsAutoScrolling(false);
    if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current);
  }, []);

  const startAutoScroll = useCallback(() => {
    if (currentProduct && currentProduct.images.length > 1) setIsAutoScrolling(true);
  }, [currentProduct]);

  // Open modal immediately on image hover
  const handleImageEnter = useCallback((src: string) => {
    setModalImage(src);
    setIsModalOpen(true);
    stopAutoScroll();
  }, [stopAutoScroll]);

  // Close modal immediately when mouse leaves the image element
  const handleImageLeave = useCallback(() => {
    setIsModalOpen(false);
    // Do NOT call navigate — stay on this page
  }, []);

  const fetchReviews = async (productId: string, page: number) => {
    setReviewLoading(true);
    try {
      const res = await reviewsApi.getProductReviews(productId, { page, limit: 5 });
      const data = res.data;
      if (page === 1) setReviews(data.reviews);
      else setReviews(prev => [...prev, ...data.reviews]);
      setReviewStats(data.stats);
      setHasMoreReviews(data.pagination.page < data.pagination.pages);
      if (isAuthenticated && user) {
        setUserHasReviewed(!!data.reviews.find((r: Review) => r.user.name === user.name));
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) { toast.error('Please login to write a review'); return; }
    if (userRating === 0) { toast.error('Please select a rating'); return; }
    if (!reviewComment.trim()) { toast.error('Please write a comment'); return; }
    if (!id) return;
    setSubmittingReview(true);
    try {
      const res = await reviewsApi.createReview(id, { rating: userRating, comment: reviewComment.trim() });
      const newReview = { ...res.data.review, verifiedPurchase: res.data.verifiedPurchase };
      setReviews(prev => [newReview, ...prev]);
      setUserHasReviewed(true);
      setUserRating(0);
      setReviewComment('');
      fetchReviews(id, 1);
      toast.success(res.data.verifiedPurchase ? 'Review submitted! Verified purchase badge added.' : 'Review submitted successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const loadMoreReviews = () => {
    if (!id) return;
    const nextPage = reviewPage + 1;
    setReviewPage(nextPage);
    fetchReviews(id, nextPage);
  };

  const handleThumbnailWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = thumbnailContainerRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;
    e.preventDefault();
    container.scrollLeft += e.deltaY;
  }, []);

  if (isProductLoading || !currentProduct) {
    return (
      <div className="min-h-screen py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const product = currentProduct;
  // Use live-refreshed variants when available, fall back to initial product data
  const variants = liveVariants.length > 0 ? liveVariants : product.variants;

  const uniqueSizes = [...new Set(variants.map((v: any) => v.size))];
  const uniqueColors = variants.reduce<{ color: string; hex: string }[]>((acc, v: any) => {
    if (!acc.find(c => c.color === v.color)) acc.push({ color: v.color, hex: v.colorHex });
    return acc;
  }, []);

  const getAvailableStock = () => {
    if (!selectedSize || !selectedColor) return 0;
    return variants.find((v: any) => v.size === selectedSize && v.color === selectedColor)?.stock || 0;
  };

  const getSelectedVariant = () => {
    if (!selectedSize || !selectedColor) return null;
    return variants.find((v: any) => v.size === selectedSize && v.color === selectedColor);
  };

  const handleAddToCart = () => {
    const variant = getSelectedVariant();
    if (!variant) { toast.error('Please select size and color'); return; }
    if (variant.stock < quantity) { toast.error('Insufficient stock'); return; }
    addItem(product, variant, quantity);
    toast.success('Added to cart');
  };

  const handleWishlist = () => {
    if (!isAuthenticated) { toast.error('Please login to add to wishlist'); return; }
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const isSizeAvailable = (size: string) =>
    !selectedColor
      ? variants.some((v: any) => v.size === size && v.stock > 0)
      : variants.some((v: any) => v.size === size && v.color === selectedColor && v.stock > 0);

  const isColorAvailable = (color: string) =>
    !selectedSize
      ? variants.some((v: any) => v.color === color && v.stock > 0)
      : variants.some((v: any) => v.color === color && v.size === selectedSize && v.stock > 0);

  const stock = getAvailableStock();
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const currentImageSrc = product.images[selectedImage] || '/placeholder-product.jpg';

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-blue-300/70 mb-6">
          <Link to="/" className="hover:text-[#DC143C]">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/shop" className="hover:text-[#DC143C]">Shop</Link>
          <span className="mx-2">/</span>
          <Link to={`/shop?category=${product.category}`} className="hover:text-[#DC143C]">{product.category}</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* ── Image Gallery ── */}
          <div className="space-y-4">
            {/* Main image
                onMouseEnter → open modal immediately
                onMouseLeave → close modal immediately (no timer, no navigate) */}
            <div
              className="aspect-square bg-white/10 overflow-hidden relative group cursor-zoom-in"
              onMouseEnter={() => handleImageEnter(currentImageSrc)}
              onMouseLeave={handleImageLeave}
            >
              <img
                src={currentImageSrc}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 rounded-full p-3">
                  <ZoomIn className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="relative">
                <div
                  ref={thumbnailContainerRef}
                  className="flex gap-2 overflow-x-auto scroll-smooth pb-2"
                  style={{ scrollbarWidth: 'thin' }}
                  onMouseEnter={stopAutoScroll}
                  onMouseLeave={startAutoScroll}
                  onWheel={handleThumbnailWheel}
                >
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => { setSelectedImage(index); stopAutoScroll(); }}
                      onMouseEnter={() => handleImageEnter(image)}
                      onMouseLeave={handleImageLeave}
                      className={`flex-shrink-0 w-20 h-20 border-2 overflow-hidden transition-all group cursor-zoom-in ${
                        selectedImage === index
                          ? 'border-[#DC143C] ring-2 ring-[#DC143C]/30'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110" />
                    </button>
                  ))}
                </div>
                {isAutoScrolling && (
                  <div className="absolute -top-2 right-0">
                    <span className="text-[10px] text-blue-300/50 bg-white/5 px-2 py-0.5 rounded-full">Auto-scrolling</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Product Info ── */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-blue-300/70 uppercase tracking-wider">{product.category}</p>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mt-1">{product.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(reviewStats?.average || product.rating || 0) ? 'text-[#DC143C] fill-[#c8a96e]' : 'text-[#ddd]'}`} />
                  ))}
                </div>
                <span className="text-sm text-blue-300/70">
                  {reviewStats?.average?.toFixed(1) || product.rating?.toFixed(1)} ({reviewStats?.total || product.reviewCount} reviews)
                </span>
              </div>
              <p className="text-2xl font-semibold text-[#DC143C] mt-3">${product.price.toFixed(2)}</p>
            </div>

            <p className="text-blue-200 leading-relaxed">{product.description}</p>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Size {selectedSize && <span className="text-blue-300/70">({selectedSize})</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {uniqueSizes.map(size => (
                  <button key={size} onClick={() => setSelectedSize(size)} disabled={!isSizeAvailable(size)}
                    className={`w-12 h-12 border-2 font-medium transition-colors ${
                      selectedSize === size ? 'border-[#DC143C] bg-[#DC143C] text-white'
                        : isSizeAvailable(size) ? 'border-[#ddd] hover:border-[#1a1a1a]'
                        : 'border-[#eee] text-[#ccc] cursor-not-allowed'}`}>
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Color {selectedColor && <span className="text-blue-300/70">({selectedColor})</span>}
              </label>
              <div className="flex flex-wrap gap-3">
                {uniqueColors.map(c => (
                  <button key={c.color} onClick={() => setSelectedColor(c.color)} disabled={!isColorAvailable(c.color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${selectedColor === c.color ? 'border-[#1a1a1a] scale-110' : 'border-transparent hover:scale-105'} ${!isColorAvailable(c.color) ? 'opacity-30 cursor-not-allowed' : ''}`}
                    style={{ backgroundColor: c.hex }} title={c.color} />
                ))}
              </div>
            </div>

            {stock > 0 && stock <= 5 && <p className="text-sm text-red-600 font-medium">Only {stock} left in stock!</p>}
            {stock === 0 && selectedSize && selectedColor && <p className="text-sm text-red-600 font-medium">Out of stock for this variant</p>}

            {/* Quantity & Actions */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center border border-[#ddd]">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3 hover:bg-white/5">-</button>
                <span className="px-4 py-3 min-w-[3rem] text-center">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(stock || 10, quantity + 1))} className="px-4 py-3 hover:bg-white/5">+</button>
              </div>
              <Button onClick={handleAddToCart} disabled={stock === 0} className="flex-1 text-white py-6" style={{ background: 'linear-gradient(135deg,#DC143C,#8B0000)', boxShadow: '0 4px 16px rgba(220,20,60,0.3)' }}>
                {stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <Button onClick={handleWishlist} className={`p-6 border rounded-md transition-colors ${isWishlisted ? 'text-red-400 border-red-400 bg-red-400/10' : 'text-white border-white/20 bg-white/8 hover:border-white/40'}`}>
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </Button>
              <Button className="p-6 border border-white/20 rounded-md bg-white/8 hover:bg-white/15 text-white transition-colors">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Material */}
            <div className="p-4 rounded-md" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <p className="text-sm"><span className="font-medium text-white">Material:</span>{' '}<span className="text-blue-200">{product.material}</span></p>
            </div>

            {/* Accordions */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="details">
                <AccordionTrigger className="text-white font-medium">Product Details</AccordionTrigger>
                <AccordionContent className="text-blue-200 space-y-2">
                  <p>{product.description}</p>
                  <ul className="mt-2 space-y-1"><li>Material: {product.material}</li><li>Category: {product.category}</li></ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="shipping">
                <AccordionTrigger className="text-white font-medium">Shipping & Returns</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-blue-200">
                    <div className="flex items-start gap-3">
                      <Truck className="w-5 h-5 text-[#DC143C] mt-0.5" />
                      <div><p className="font-medium text-white">Free Shipping</p><p className="text-sm">Free standard shipping on all orders over $100</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <RefreshCw className="w-5 h-5 text-[#DC143C] mt-0.5" />
                      <div><p className="font-medium text-white">Easy Returns</p><p className="text-sm">30-day return policy for unworn items</p></div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* ── Reviews ── */}
        <div className="mt-16 pt-12 border-t border-white/10">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-1 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Customer Reviews</h2>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < Math.floor(reviewStats?.average || 0) ? 'text-[#DC143C] fill-[#c8a96e]' : 'text-[#555]'}`} />
                    ))}
                  </div>
                  <span className="text-lg text-white font-medium">{reviewStats?.average?.toFixed(1) || '0.0'}</span>
                  <span className="text-sm text-blue-300/70">Based on {reviewStats?.total || 0} reviews</span>
                </div>
                {reviewStats && (
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviewStats.distribution[star] || 0;
                      const pct = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-sm text-white w-8">{star} star</span>
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#DC143C] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm text-blue-300/70 w-10 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-6 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#DC143C]" />Write a Review
                </h3>
                {!isAuthenticated ? (
                  <div className="text-center py-4">
                    <p className="text-blue-200 mb-3">Please login to write a review</p>
                    <Link to="/login"><Button className="bg-[#DC143C] text-white hover:bg-[#8B0000]">Login to Review</Button></Link>
                  </div>
                ) : userHasReviewed ? (
                  <p className="text-blue-200 text-center py-4">You have already reviewed this product. Thank you!</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-blue-200 mb-2">Your Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button key={star} type="button" onClick={() => setUserRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="p-1 transition-transform hover:scale-110">
                            <Star className={`w-7 h-7 ${star <= (hoverRating || userRating) ? 'text-[#DC143C] fill-[#c8a96e]' : 'text-[#555]'}`} />
                          </button>
                        ))}
                      </div>
                      {userRating > 0 && <p className="text-sm text-[#c8a96e] mt-1">{['Terrible', 'Poor', 'Average', 'Very Good', 'Excellent'][userRating - 1]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-blue-200 mb-2">Your Review</label>
                      <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share your experience with this product..." className="bg-white/5 border-white/10 text-white placeholder:text-blue-300/50 min-h-[100px]" />
                    </div>
                    <Button onClick={handleSubmitReview} disabled={submittingReview || userRating === 0 || !reviewComment.trim()} className="w-full bg-[#DC143C] text-white hover:bg-[#8B0000] disabled:opacity-50">
                      {submittingReview ? 'Submitting...' : <span className="flex items-center gap-2"><Send className="w-4 h-4" />Submit Review</span>}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              {reviews.length === 0 && !reviewLoading ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-[#555] mx-auto mb-4" />
                  <p className="text-lg text-white mb-2">No reviews yet</p>
                  <p className="text-sm text-blue-300/70">Be the first to review this product!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map(review => (
                    <div key={review.id} className="p-6 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#DC143C]/20 flex items-center justify-center"><User className="w-5 h-5 text-[#DC143C]" /></div>
                          <div><p className="font-medium text-white">{review.user.name}</p><p className="text-xs text-blue-300/70">{formatDate(review.createdAt)}</p></div>
                        </div>
                        {review.verifiedPurchase && <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full"><ThumbsUp className="w-3 h-3" />Verified Purchase</span>}
                      </div>
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-[#DC143C] fill-[#c8a96e]' : 'text-[#555]'}`} />)}
                      </div>
                      <p className="text-blue-200 leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                  {hasMoreReviews && (
                    <div className="text-center pt-4">
                      <Button variant="outline" onClick={loadMoreReviews} disabled={reviewLoading} className="border-white/20 text-white hover:bg-white/10">
                        {reviewLoading ? 'Loading...' : 'Load More Reviews'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: pointer-events-none so it never interferes with mouse events ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', animation: 'mfadeIn 0.15s ease-out' }}
        >
          <img
            src={modalImage}
            alt="Product zoom"
            className="rounded-xl shadow-2xl object-contain pointer-events-none"
            style={{ maxWidth: '78vw', maxHeight: '84vh', animation: 'mscaleIn 0.18s ease-out' }}
          />
          <style>{`
            @keyframes mfadeIn  { from { opacity:0 } to { opacity:1 } }
            @keyframes mscaleIn { from { opacity:0; transform:scale(0.93) } to { opacity:1; transform:scale(1) } }
          `}</style>
        </div>
      )}
    </div>
  );
}