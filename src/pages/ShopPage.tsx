/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/shop/ProductCard';
import { Search, Filter, SlidersHorizontal, RotateCcw, X, Check, Package } from 'lucide-react';
import { usePageSEO } from '../hooks/usePageSEO';

interface ShopPageProps {
  initialCategorySlug?: string;
  onSelectProduct?: (id: string) => void;
  openAuthModal?: () => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  initialCategorySlug,
  onSelectProduct,
  openAuthModal,
}) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { products, activeProducts, activeCategories } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategorySlug || slug || 'all'
  );

  const matchedCat = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return null;
    return activeCategories.find((c) => c.slug === selectedCategory);
  }, [selectedCategory, activeCategories]);

  usePageSEO({
    title: matchedCat ? `${matchedCat.name} | Arooj` : 'Shop | Arooj',
  });

  useEffect(() => {
    if (slug) {
      setSelectedCategory(slug);
    } else if (initialCategorySlug) {
      setSelectedCategory(initialCategorySlug);
    }
  }, [slug, initialCategorySlug]);

  const handleSelectProduct = (id: string) => {
    if (onSelectProduct) {
      onSelectProduct(id);
    } else {
      const target = activeProducts.find((p) => p.id === id);
      navigate(target ? `/product/${target.slug}` : `/product/${id}`);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(15000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'featured'>('newest');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return activeProducts
      .filter((product) => {
        // Category filter
        if (selectedCategory !== 'all') {
          const cat = activeCategories.find((c) => c.slug === selectedCategory);
          if (cat && product.category_id !== cat.id) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = product.name.toLowerCase().includes(q);
          const matchDesc = product.description.toLowerCase().includes(q);
          if (!matchName && !matchDesc) return false;
        }

        // Price range
        if (product.base_price < minPrice || product.base_price > maxPrice) {
          return false;
        }

        // In-stock only
        if (inStockOnly) {
          const totalStock = product.variants.reduce((sum, v) => sum + v.stock_quantity, 0);
          if (totalStock <= 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.base_price - b.base_price;
        if (sortBy === 'price-desc') return b.base_price - a.base_price;
        if (sortBy === 'featured') return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [
    activeProducts,
    activeCategories,
    selectedCategory,
    searchQuery,
    minPrice,
    maxPrice,
    inStockOnly,
    sortBy,
  ]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setMinPrice(0);
    setMaxPrice(15000);
    setInStockOnly(false);
    setSortBy('newest');
  };

  const isFiltered =
    selectedCategory !== 'all' ||
    searchQuery.trim() !== '' ||
    minPrice > 0 ||
    maxPrice < 15000 ||
    inStockOnly;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Sticky Filter Bar */}
      <div className="sticky top-20 z-30 bg-[#FBF5EC]/95 backdrop-blur-md border border-[#E3D5C4] rounded-[24px] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3B2A20]">
            {selectedCategory === 'all'
              ? 'Catalog'
              : activeCategories.find((c) => c.slug === selectedCategory)?.name || 'Catalog'}
          </h1>
          <p className="text-xs text-[#6B5B50] mt-0.5">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} · Free Delivery Nationwide
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="md:hidden flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] border border-[#3B2A20] rounded-full text-xs font-semibold bg-transparent text-[#3B2A20] hover:bg-[#3B2A20] hover:text-[#F3E9DC] transition-colors cursor-pointer"
          >
            <Filter className="w-4 h-4 text-[#B4502F]" strokeWidth={1.5} />
            Filters {isFiltered && '(Active)'}
          </button>

          {/* Quick Category Tabs (Desktop) */}
          <div className="hidden lg:flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 min-h-[44px] rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#B4502F] text-white shadow-xs'
                  : 'bg-white text-[#6B5B50] border border-[#E3D5C4] hover:text-[#3B2A20] hover:border-[#3B2A20]'
              }`}
            >
              All
            </button>
            {activeCategories.slice(0, 4).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.slug)}
                className={`px-4 py-2 min-h-[44px] rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === c.slug
                    ? 'bg-[#B4502F] text-white shadow-xs'
                    : 'bg-white text-[#6B5B50] border border-[#E3D5C4] hover:text-[#3B2A20] hover:border-[#3B2A20]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 ml-auto md:ml-0">
            <span className="text-xs text-[#6B5B50] hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-medium bg-white border border-[#E3D5C4] rounded-full px-4 py-2.5 min-h-[44px] text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] cursor-pointer"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="featured">Featured First</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Desktop Filters Sidebar */}
        <aside className="hidden md:block space-y-6">
          <div className="bg-[#FBF5EC] p-6 rounded-[24px] border border-[#E3D5C4] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E3D5C4] pb-3">
              <h3 className="font-serif text-base font-bold text-[#3B2A20] flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-[#B4502F]" strokeWidth={1.5} /> Filter Products
              </h3>
              {isFiltered && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-[#B4502F] hover:text-[#964225] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            {/* Keyword Search */}
            <div>
              <label className="text-xs font-semibold text-[#3B2A20] block mb-2 uppercase tracking-wider">
                Keyword Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Kurta, Attar, Leather..."
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-[#3B2A20] placeholder:text-[#6B5B50] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-3 text-[#6B5B50] hover:text-[#3B2A20]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="text-xs font-semibold text-[#3B2A20] block mb-2 uppercase tracking-wider">
                Department
              </label>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#B4502F] text-white font-bold'
                      : 'text-[#6B5B50] hover:bg-[#F3E9DC] hover:text-[#3B2A20]'
                  }`}
                >
                  All Categories ({activeProducts.length})
                </button>
                {activeCategories.map((c) => {
                  const count = activeProducts.filter((p) => p.category_id === c.id).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.slug)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-full text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                        selectedCategory === c.slug
                          ? 'bg-[#B4502F] text-white font-bold'
                          : 'text-[#6B5B50] hover:bg-[#F3E9DC] hover:text-[#3B2A20]'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="text-[11px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-xs font-semibold text-[#3B2A20] block mb-2 uppercase tracking-wider">
                Max Price: Rs. {maxPrice.toLocaleString()}
              </label>
              <input
                type="range"
                min="500"
                max="15000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#B4502F]"
              />
              <div className="flex justify-between text-[11px] text-[#6B5B50] mt-1">
                <span>Rs. 500</span>
                <span>Rs. 15,000</span>
              </div>
            </div>

            {/* In Stock Only */}
            <div className="pt-2 border-t border-[#E3D5C4]">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#3B2A20]">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-[#B4502F] accent-[#B4502F] w-4 h-4 cursor-pointer"
                />
                <span>In-Stock Items Only</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Product Grid Area: 2 columns mobile, 3 tablet, 3-4 desktop */}
        <main className="md:col-span-3">
          {products.length === 0 ? (
            <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-12 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 bg-[#F3E9DC] rounded-full flex items-center justify-center mx-auto text-[#B4502F]">
                <Package className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#3B2A20]">
                No products yet. Check back soon!
              </h3>
              <p className="text-xs text-[#6B5B50] max-w-sm mx-auto">
                Our catalog is currently being prepared with refined elegance. Check back shortly for our full collection of premium apparel and attars.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-12 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 bg-[#F3E9DC] rounded-full flex items-center justify-center mx-auto text-[#B4502F]">
                <Search className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#3B2A20]">
                No items match your selected filters
              </h3>
              <p className="text-xs text-[#6B5B50] max-w-sm mx-auto">
                Try widening your price range, searching for different keywords, or selecting another department.
              </p>
              <button
                onClick={resetFilters}
                className="px-6 py-2.5 min-h-[44px] rounded-full bg-[#B4502F] text-white font-semibold text-xs hover:bg-[#964225] transition-colors shadow-xs cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={handleSelectProduct}
                  openAuthModal={openAuthModal}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filters Bottom Sheet */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#FBF5EC] rounded-t-[24px] sm:rounded-[24px] max-h-[85vh] p-6 space-y-6 overflow-y-auto shadow-2xl animate-in slide-in-from-bottom border border-[#E3D5C4]">
            <div className="flex items-center justify-between border-b border-[#E3D5C4] pb-4">
              <h3 className="font-serif text-lg font-bold text-[#3B2A20]">Filter Catalog</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 text-[#6B5B50] hover:text-[#3B2A20] rounded-full cursor-pointer"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Mobile Categories */}
            <div>
              <p className="text-xs font-semibold uppercase text-[#6B5B50] mb-2 tracking-wider">
                Department
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left p-2.5 rounded-full text-xs cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#B4502F] text-white font-bold'
                      : 'text-[#3B2A20] hover:bg-[#F3E9DC]'
                  }`}
                >
                  All Categories ({activeProducts.length})
                </button>
                {activeCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.slug)}
                    className={`w-full text-left p-2.5 rounded-full text-xs cursor-pointer ${
                      selectedCategory === c.slug
                        ? 'bg-[#B4502F] text-white font-bold'
                        : 'text-[#3B2A20] hover:bg-[#F3E9DC]'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Slider */}
            <div>
              <p className="text-xs font-semibold uppercase text-[#6B5B50] mb-2 tracking-wider">
                Max Price: Rs. {maxPrice.toLocaleString()}
              </p>
              <input
                type="range"
                min="500"
                max="15000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#B4502F]"
              />
            </div>

            <div className="pt-4 border-t border-[#E3D5C4] flex gap-3">
              <button
                onClick={resetFilters}
                className="flex-1 py-3 min-h-[44px] border border-[#3B2A20] rounded-full text-xs font-semibold text-[#3B2A20] hover:bg-[#E3D5C4]/30 cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 py-3 min-h-[44px] bg-[#B4502F] hover:bg-[#964225] rounded-full text-xs font-semibold text-white cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
