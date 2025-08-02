'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts';
import { useApiNotification } from '@/hooks';
import { PageHeader, LoadingSpinner, Button, Pagination, OrderDetailButton } from '@/app/components/ui';
import { orderService } from '@/services/orderService';
import { OrderWithRefs } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { 
  FaShoppingBag, 
  FaEye, 
  FaClock, 
  FaCheckCircle, 
  FaTruck, 
  FaTimesCircle,
  FaFilter,
  FaSearch,
  FaTimes
} from 'react-icons/fa';
import styles from './OrdersPage.module.css';

// Order status options for filter
const ORDER_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipped', label: 'Đã gửi hàng' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' }
];

interface OrderFilters {
  status: string;
  startDate: string;
  endDate: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { showError } = useApiNotification();

  // States
  const [orders, setOrders] = useState<OrderWithRefs[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [limit] = useState(10);

  // Filter states
  const [filters, setFilters] = useState<OrderFilters>({
    status: '',
    startDate: '',
    endDate: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/orders');
      return;
    }
  }, [user, router, authLoading]);

  // Load user orders
  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, currentPage, filters]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      
      const queryParams: any = {
        page: currentPage,
        limit,
        ...(filters.status && { status: filters.status as any }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      };

      console.log('📦 Loading orders with params:', queryParams);

      const response = await orderService.getUserOrders(queryParams);
      
      let ordersData: OrderWithRefs[] = [];
      let totalCount = 0;
      let totalPagesCount = 1;

      // Handle different response structures
      if (Array.isArray(response)) {
        ordersData = response;
        totalCount = response.length;
      } else if ((response as any)?.data?.documents && Array.isArray((response as any).data.documents)) {
        ordersData = (response as any).data.documents;
        totalCount = (response as any).data.pagination?.total || (response as any).data.documents.length;
        totalPagesCount = (response as any).data.pagination?.pages || Math.ceil((response as any).data.documents.length / limit);
      } else if (response?.data && Array.isArray(response.data)) {
        ordersData = response.data;
        totalCount = (response as any).total || response.data.length;
        totalPagesCount = (response as any).pages || Math.ceil(response.data.length / limit);
      } else if ((response as any)?.orders && Array.isArray((response as any).orders)) {
        ordersData = (response as any).orders;
        totalCount = (response as any).total || (response as any).orders.length;
        totalPagesCount = (response as any).pages || 1;
      } else {
        console.warn('⚠️ Unexpected orders response structure:', response);
        ordersData = [];
      }
      
      setOrders(ordersData);
      setTotalOrders(totalCount);
      setTotalPages(totalPagesCount);
      
    } catch (error: any) {
      console.error('❌ Error loading orders:', error);
      setOrders([]);
      if (error.message && !error.message.includes('Unauthorized')) {
        showError('Không thể tải danh sách đơn hàng', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      status: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get status icon and label
  const getStatusDisplay = (status: string) => {
    const statusConfig = {
      pending: { icon: <FaClock />, label: 'Chờ xác nhận', className: styles.statusPending },
      processing: { icon: <FaTruck />, label: 'Đang xử lý', className: styles.statusProcessing },
      shipped: { icon: <FaTruck />, label: 'Đã gửi hàng', className: styles.statusShipped },
      delivered: { icon: <FaCheckCircle />, label: 'Đã giao', className: styles.statusDelivered },
      cancelled: { icon: <FaTimesCircle />, label: 'Đã hủy', className: styles.statusCancelled }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      icon: <FaClock />,
      label: status, 
      className: styles.statusPending 
    };

    return (
      <span className={`${styles.orderStatus} ${config.className}`}>
        <span className={styles.statusIcon}>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="container">
        <div className={styles.pageContainer}>
          <div className={styles.loadingSection}>
            <LoadingSpinner size="lg" />
            <p>Đang kiểm tra xác thực...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.pageContainer}>
        <PageHeader
          title="Đơn hàng của tôi"
          subtitle="Theo dõi trạng thái và lịch sử đơn hàng"
          icon={FaShoppingBag}
          breadcrumbs={[
            { label: 'Trang chủ', href: '/' },
            { label: 'Đơn hàng', href: '/orders' }
          ]}
        />

        <div className={styles.mainContent}>
          {/* Filters Section */}
          <div className={styles.filtersSection}>
            <div className={styles.filtersGrid}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Trạng thái</label>
                <select
                  className={styles.filterSelect}
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  {ORDER_STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Từ ngày</label>
                <input
                  type="date"
                  className={styles.filterSelect}
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Đến ngày</label>
                <input
                  type="date"
                  className={styles.filterSelect}
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>

              <div className={styles.filterActions}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!filters.status && !filters.startDate && !filters.endDate}
                >
                  <FaTimes />
                  Xóa bộ lọc
                </Button>
              </div>
            </div>
          </div>

          {/* Orders Container */}
          <div className={styles.ordersContainer}>
            <div className={styles.ordersHeader}>
              <div>
                <h2 className={styles.ordersTitle}>
                  <FaShoppingBag />
                  Danh sách đơn hàng
                </h2>
                <p className={styles.ordersCount}>
                  {totalOrders > 0 ? `${totalOrders} đơn hàng` : 'Không có đơn hàng'}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className={styles.loadingSection}>
                <LoadingSpinner size="lg" />
                <p>Đang tải danh sách đơn hàng...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FaShoppingBag />
                </div>
                <h3>Chưa có đơn hàng nào</h3>
                <p>Bạn chưa có đơn hàng nào. Hãy bắt đầu mua sắm ngay!</p>
                <Button variant="primary" onClick={() => router.push('/products')}>
                  <FaShoppingBag className={styles.buttonIcon} />
                  Bắt đầu mua sắm
                </Button>
              </div>
            ) : (
              <>
                <div className={styles.ordersList}>
                  {orders.map((order) => (
                    <div key={order._id} className={styles.orderCard}>
                      <div className={styles.orderHeader}>
                        <div className={styles.orderInfo}>
                          <h4 className={styles.orderCode}>#{order.orderCode}</h4>
                          <div className={styles.orderMeta}>
                            <span className={styles.orderDate}>
                              <FaClock className={styles.metaIcon} />
                              {formatDate(order.createdAt)}
                            </span>
                            {getStatusDisplay(order.status)}
                          </div>
                        </div>
                        <div className={styles.orderTotal}>
                          <span className={styles.totalLabel}>Tổng tiền:</span>
                          <span className={styles.totalAmount}>{formatCurrency(order.finalTotal || 0)}</span>
                        </div>
                      </div>
                      
                      <div className={styles.orderItems}>
                        {order.items?.slice(0, 2).map((item: any, index: number) => (
                          <div key={index} className={styles.orderItem}>
                            <div className={styles.itemInfo}>
                              <span className={styles.itemName}>
                                {item.productVariant?.product?.name || item.productName}
                              </span>
                              <span className={styles.itemDetails}>
                                Số lượng: {item.quantity} • {formatCurrency(item.price)}
                              </span>
                              {item.productVariant?.color?.name || item.productVariant?.size?.name ? (
                                <div className={styles.itemVariant}>
                                  {item.productVariant?.color?.name && `Màu: ${item.productVariant.color.name}`}
                                  {item.productVariant?.color?.name && item.productVariant?.size?.name && ' • '}
                                  {item.productVariant?.size?.name && `Size: ${item.productVariant.size.name}`}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                        {(order.items?.length || 0) > 2 && (
                          <div className={styles.moreItems}>
                            +{(order.items?.length || 0) - 2} sản phẩm khác
                          </div>
                        )}
                      </div>

                      <div className={styles.orderActions}>
                        <OrderDetailButton 
                          orderId={order._id}
                          variant="outline"
                          size="sm"
                        >
                          <FaEye className={styles.buttonIcon} />
                          Xem chi tiết
                        </OrderDetailButton>
                        {order.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={styles.cancelButton}
                            onClick={() => {
                              if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
                                // Handle cancel order
                                console.log('Cancel order:', order._id);
                              }
                            }}
                          >
                            <FaTimesCircle className={styles.buttonIcon} />
                            Hủy đơn
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={styles.paginationWrapper}>
                    <Pagination
                      pagination={{
                        page: currentPage,
                        limit: limit,
                        totalPages: totalPages,
                        totalProducts: totalOrders,
                        hasNextPage: currentPage < totalPages,
                        hasPrevPage: currentPage > 1
                      }}
                      onPageChange={handlePageChange}
                      showInfo={true}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
