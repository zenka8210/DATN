'use client';

import { useState } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import Button from './ui/Button';
import { useNotification } from '@/contexts/NotificationContext';
import styles from './WriteReviewForm.module.css';

interface WriteReviewFormProps {
  onSubmit: (review: { rating: number; comment: string }) => Promise<void>;
  isSubmitting: boolean;
  isLoggedIn: boolean;
  onLoginRedirect: () => void;
}

export default function WriteReviewForm({ 
  onSubmit, 
  isSubmitting, 
  isLoggedIn, 
  onLoginRedirect 
}: WriteReviewFormProps) {
  const [review, setReview] = useState({
    rating: 5,
    comment: ''
  });
  const { success, error, warning } = useNotification();

  // Render interactive stars
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= review.rating ? (
          <FaStar
            key={i}
            className={`${styles.star} ${styles.filled} ${styles.interactive}`}
            onClick={() => setReview(prev => ({ ...prev, rating: i }))}
          />
        ) : (
          <FaRegStar
            key={i}
            className={`${styles.star} ${styles.empty} ${styles.interactive}`}
            onClick={() => setReview(prev => ({ ...prev, rating: i }))}
          />
        )
      );
    }
    return <div className={styles.stars}>{stars}</div>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 WriteReviewForm handleSubmit triggered!', { review });
    
    // Validate input
    if (!review.comment.trim()) {
      console.log('❌ Validation failed: Empty comment');
      warning('Nội dung thiếu', 'Vui lòng nhập nội dung đánh giá!');
      return;
    }
    
    if (review.comment.trim().length < 5) {
      console.log('❌ Validation failed: Comment too short');
      warning('Nội dung quá ngắn', 'Vui lòng nhập ít nhất 5 ký tự!');
      return;
    }
    
    console.log('✅ Validation passed, calling onSubmit');
    try {
      await onSubmit(review);
      console.log('✅ onSubmit completed successfully');
      setReview({ rating: 5, comment: '' }); // Reset form
    } catch (err: any) {
      console.error('❌ onSubmit failed:', err);
      error('Gửi đánh giá thất bại', err.message || 'Có lỗi xảy ra khi gửi đánh giá');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className={styles.loginPrompt}>
        <div className={styles.promptCard}>
          <div className={styles.promptIcon}>✍️</div>
          <h3 className={styles.promptTitle}>Viết đánh giá sản phẩm</h3>
          <p className={styles.promptDescription}>
            Đăng nhập để chia sẻ trải nghiệm của bạn và giúp khách hàng khác có thêm thông tin hữu ích
          </p>
          <Button
            variant="primary"
            onClick={onLoginRedirect}
            className={styles.loginButton}
          >
            Đăng nhập để đánh giá
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.writeReviewForm}>
      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <div className={styles.headerIcon}>⭐</div>
          <div className={styles.headerContent}>
            <h3 className={styles.formTitle}>Chia sẻ đánh giá của bạn</h3>
            <p className={styles.formSubtitle}>
              Giúp khách hàng khác có thêm thông tin hữu ích về sản phẩm này
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Rating Section */}
          <div className={styles.ratingSection}>
            <label className={styles.sectionLabel}>
              <span className={styles.labelIcon}>🌟</span>
              Đánh giá tổng thể
            </label>
            <div className={styles.ratingContainer}>
              <div className={styles.starsWrapper}>
                {renderStars()}
                <span className={styles.ratingText}>
                  {review.rating === 5 && "Tuyệt vời! 🔥"}
                  {review.rating === 4 && "Rất tốt 👍"}
                  {review.rating === 3 && "Tốt 😊"}
                  {review.rating === 2 && "Ổn 😐"}
                  {review.rating === 1 && "Cần cải thiện 😔"}
                </span>
              </div>
              <div className={styles.ratingDescription}>
                Nhấn vào sao để chọn điểm số phù hợp
              </div>
            </div>
          </div>

          {/* Comment Section */}
          <div className={styles.commentSection}>
            <label htmlFor="review-comment" className={styles.sectionLabel}>
              <span className={styles.labelIcon}>💬</span>
              Chia sẻ trải nghiệm chi tiết
            </label>
            <div className={styles.commentContainer}>
              <textarea
                id="review-comment"
                value={review.comment}
                onChange={(e) => setReview(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Hãy chia sẻ những điều bạn thích về sản phẩm này: chất lượng, thiết kế, độ bền, cảm nhận khi sử dụng..."
                rows={5}
                className={styles.commentTextarea}
                maxLength={1000}
              />
              <div className={styles.textareaFooter}>
                <div className={styles.characterCount}>
                  {review.comment.length}/1000 ký tự
                </div>
                <div className={styles.helpText}>
                  Ít nhất 5 ký tự để gửi đánh giá
                </div>
              </div>
            </div>
          </div>
          
          {/* Submit Section */}
          <div className={styles.submitSection}>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || review.comment.length < 5}
              className={styles.submitButton}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.submitSpinner}></span>
                  Đang gửi...
                </>
              ) : (
                <>
                  <span>📝</span>
                  Gửi đánh giá
                </>
              )}
            </Button>
            <p className={styles.submitNote}>
              Đánh giá của bạn sẽ được hiển thị công khai và giúp ích cho khách hàng khác
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
