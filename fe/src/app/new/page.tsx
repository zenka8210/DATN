"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProducts } from '@/hooks';
import { ProductWithCategory } from '@/types';
import ProductItem from '../components/ProductItem';
import { LoadingSpinner, Button, Pagination } from '../components/ui';
import { isProductOnSale } from '@/lib/productUtils';
import FilterSidebar from '../components/FilterSidebar';
import styles from './new.module.css';

export default function NewProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getProducts, loading, error } = useProducts();
  
  // Configuration constants
  const NEW_THRESHOLD_DAYS = 90; // 3 months - products newer than this are "truly new"
  const MIN_NEW_PRODUCTS = 50; // Minimum products to always show on new page
  const PRODUCTS_LIMIT = 150; // Fetch more products to ensure we have enough options
  
  // State management
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithCategory[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest-first');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedCategory, setSelectedCategory] = useState('');

  const productsPerPage = 12;

  useEffect(() => {
    // Get URL parameters
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'newest-first';
    const category = searchParams.get('category') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';

    setCurrentPage(page);
    setSearchTerm(search);
    setSortBy(sort);
    setSelectedCategory(category);
    setPriceRange({ min: minPrice, max: maxPrice });
  }, [searchParams]);

  useEffect(() => {
    const fetchNewProducts = async () => {
      try {
        const response = await getProducts({ 
          limit: PRODUCTS_LIMIT,
          sort: 'createdAt',
          order: 'desc' // Get newest products first
        });
        const productsArray = Array.isArray(response.data) ? response.data : 
                             (response.data && Array.isArray((response.data as any).data)) ? (response.data as any).data : [];
        
        // Define "new" threshold - products added within configured days
        const newThreshold = new Date(Date.now() - NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
        
        console.log('🕐 New products threshold:', newThreshold);
        
        // Filter active, non-sale products
        const activeProducts = productsArray
          .filter((product: ProductWithCategory) => 
            product.isActive !== false &&
            !isProductOnSale(product)
          );

        console.log('📦 Active non-sale products:', activeProducts.length);
        
        // Separate truly new products vs older products
        const reallyNewProducts = activeProducts.filter((product: ProductWithCategory) => {
          const productDate = product.createdAt ? new Date(product.createdAt) : new Date();
          return productDate >= newThreshold;
        });

        console.log('✨ Really new products (within 3 months):', reallyNewProducts.length);
        
        let finalNewProducts = [...reallyNewProducts];

        // If we don't have enough "truly new" products, fill with older ones
        if (finalNewProducts.length < MIN_NEW_PRODUCTS) {
          const olderProducts = activeProducts
            .filter((product: ProductWithCategory) => {
              const productDate = product.createdAt ? new Date(product.createdAt) : new Date();
              return productDate < newThreshold;
            })
            .sort((a: ProductWithCategory, b: ProductWithCategory) => {
              // Sort older products by date desc (newest of the old ones first)
              const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
              const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
              return dateB.getTime() - dateA.getTime();
            });

          const neededProducts = MIN_NEW_PRODUCTS - finalNewProducts.length;
          const additionalProducts = olderProducts.slice(0, neededProducts);
          
          console.log(`📈 Adding ${additionalProducts.length} older products to meet minimum threshold`);
          finalNewProducts = [...finalNewProducts, ...additionalProducts];
        }

        // Add metadata and sort all selected products
        const newProducts = finalNewProducts
          .map((product: ProductWithCategory, index: number) => {
            const productDate = product.createdAt ? new Date(product.createdAt) : new Date();
            const isReallyNew = productDate >= newThreshold;
            
            return {
              ...product,
              isNew: true,
              isReallyNew, // Flag to distinguish truly new vs threshold-based
              addedDate: productDate,
              newScore: productDate.getTime() // For sorting
            };
          })
          .sort((a: any, b: any) => {
            // Sort by creation date desc (newest first)
            return b.newScore - a.newScore;
          });

        console.log('✅ Final new products for display:', newProducts.length);
        console.log('📊 Really new vs older products:', {
          reallyNew: newProducts.filter(p => p.isReallyNew).length,
          older: newProducts.filter(p => !p.isReallyNew).length
        });

        setProducts(newProducts);

        // Extract unique categories from new products  
        const categories = Array.from(new Set(
          newProducts.map((product: ProductWithCategory) => {
            const categoryName = typeof product.category === 'object' && product.category?.name 
              ? product.category.name 
              : typeof product.category === 'string' 
                ? product.category 
                : '';
            return categoryName.toLowerCase();
          }).filter(Boolean)
        )) as string[];
        setAvailableCategories(categories);
      } catch (err) {
        console.error('Failed to fetch new products:', err);
      }
    };

    fetchNewProducts();
  }, [getProducts]);

  useEffect(() => {
    // Apply filters and sorting
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => {
        const categoryName = typeof product.category === 'object' && product.category?.name ? 
          product.category.name : typeof product.category === 'string' ? product.category : '';
        return categoryName.toLowerCase().includes(selectedCategory.toLowerCase());
      });
    }

    // Price range filter
    if (priceRange.min) {
      filtered = filtered.filter(product => product.price >= parseInt(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(product => product.price <= parseInt(priceRange.max));
    }

    // Sorting
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'newest-first':
          return (b.newScore || 0) - (a.newScore || 0);
        case 'oldest-first':
          return (a.newScore || 0) - (b.newScore || 0);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return (b.newScore || 0) - (a.newScore || 0);
      }
    });

    setFilteredProducts(filtered);
    setTotalPages(Math.ceil(filtered.length / productsPerPage));
  }, [products, searchTerm, sortBy, selectedCategory, priceRange]);

  const getCurrentPageProducts = () => {
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateURL = (params: Record<string, any>) => {
    const urlParams = new URLSearchParams(searchParams);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '') {
        urlParams.set(key, value.toString());
      } else {
        urlParams.delete(key);
      }
    });

    router.push(`/new?${urlParams.toString()}`, { scroll: false });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    updateURL({ search: searchTerm, page: 1 });
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setCurrentPage(1);
    updateURL({ sort: newSort, page: 1 });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    updateURL({ category, page: 1 });
  };

  const handlePriceFilter = () => {
    setCurrentPage(1);
    updateURL({ 
      minPrice: priceRange.min, 
      maxPrice: priceRange.max, 
      page: 1 
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('newest-first');
    setSelectedCategory('');
    setPriceRange({ min: '', max: '' });
    setCurrentPage(1);
    router.push('/new');
  };

  // Statistics for display
  const reallyNewCount = products.filter(p => (p as any).isReallyNew).length;
  const thresholdCount = products.filter(p => !(p as any).isReallyNew).length;

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // More granular time display for same-day products
    if (diffDays === 0) {
      if (diffMinutes < 60) {
        return diffMinutes <= 0 ? 'Vừa xong' : `${diffMinutes} phút trước`;
      }
      return `${diffHours} giờ trước`;
    }
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    return `${Math.floor(diffDays / 30)} tháng trước`;
  };

  if (loading) {
    return <LoadingSpinner fullscreen text="Đang tải sản phẩm mới..." />;
  }

  if (error) {
    return (
      <div className="container">
        <div className={styles.errorContainer}>
          <h2>Có lỗi xảy ra</h2>
          <p>Không thể tải sản phẩm mới. Vui lòng thử lại sau.</p>
          <button onClick={() => window.location.reload()} className={styles.retryButton}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const currentPageProducts = getCurrentPageProducts();

  return (
    <div className="container">
      <div className={styles.pageContainer}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            <span className={styles.newIcon}>🆕</span>
            Sản Phẩm Mới
          </h1>
          <p className={styles.pageSubtitle}>
            Tìm thấy {filteredProducts.length} sản phẩm mới nhất
            {reallyNewCount > 0 && thresholdCount > 0 && (
              <span className={styles.statsBreakdown}>
                <br />
                🆕 {reallyNewCount} sản phẩm mới trong {NEW_THRESHOLD_DAYS} ngày • ⭐ {thresholdCount} sản phẩm khác
              </span>
            )}
          </p>
        </div>

        <div className={styles.contentWrapper}>
          {/* Filters Sidebar */}
          <FilterSidebar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSearch={handleSearch}
            sortBy={sortBy}
            sortOptions={[
              { value: 'newest-first', label: 'Mới nhất trước' },
              { value: 'oldest-first', label: 'Cũ nhất trước' },
              { value: 'price-asc', label: 'Giá thấp đến cao' },
              { value: 'price-desc', label: 'Giá cao đến thấp' },
              { value: 'name-asc', label: 'Tên A-Z' },
              { value: 'name-desc', label: 'Tên Z-A' }
            ]}
            onSortChange={handleSortChange}
            availableCategories={availableCategories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            onPriceFilter={handlePriceFilter}
            onClearFilters={clearFilters}
          />

          {/* Products Grid */}
          <div className={styles.productsContainer}>
            {currentPageProducts.length > 0 ? (
              <div className={styles.productsGrid}>
                {currentPageProducts.map((product: any) => (
                  <div key={product._id} className={styles.productWrapper}>
                    <ProductItem 
                      product={product} 
                      layout="grid"
                    />
                    <div className={`${styles.newBadge} ${product.isReallyNew ? styles.reallyNew : styles.thresholdNew}`}>
                      {product.isReallyNew ? (
                        <>🆕 Mới {formatRelativeTime(product.addedDate)}</>
                      ) : (
                        <>⭐ {formatRelativeTime(product.addedDate)}</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noResults}>
                <div className={styles.noResultsIcon}>📦</div>
                <h3>Không tìm thấy sản phẩm nào</h3>
                <p>Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
                <Button onClick={clearFilters} className={styles.resetFiltersBtn}>
                  Xem tất cả sản phẩm mới
                </Button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                pagination={{
                  page: currentPage,
                  limit: productsPerPage,
                  totalPages: totalPages,
                  totalProducts: filteredProducts.length,
                  hasNextPage: currentPage < totalPages,
                  hasPrevPage: currentPage > 1
                }}
                onPageChange={handlePageChange}
                className={styles.paginationComponent}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
