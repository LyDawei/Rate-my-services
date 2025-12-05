import { useState, useEffect } from 'react';
import { API_URL } from '../config';

const RATINGS_PER_PAGE = 10;

function RecentRatings({ refreshTrigger }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchRatings = async (offset = 0, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${API_URL}/ratings?limit=${RATINGS_PER_PAGE}&offset=${offset}`);
      const data = await response.json();

      if (data.success) {
        if (append) {
          setRatings(prev => [...prev, ...data.ratings]);
        } else {
          setRatings(data.ratings);
        }
        setHasMore(data.hasMore);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch ratings:', err);
      setError('Patient records temporarily unavailable');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Reset and fetch fresh data when refreshTrigger changes
    setRatings([]);
    fetchRatings(0, false);
  }, [refreshTrigger]);

  const handleLoadMore = () => {
    fetchRatings(ratings.length, true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (count) => {
    return '★'.repeat(count) + '☆'.repeat(5 - count);
  };

  if (loading) {
    return (
      <div className="recent-ratings loading">
        <h3>📋 Patient Feedback Log</h3>
        <p className="loading-text">Scanning patient records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recent-ratings error">
        <h3>📋 Patient Feedback Log</h3>
        <p>{error}</p>
        <button className="retry-btn" onClick={() => fetchRatings(0, false)}>
          Try Again
        </button>
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="recent-ratings empty">
        <h3>📋 Patient Feedback Log</h3>
        <p className="empty-text">
          No patient feedback recorded yet. Your feedback helps me improve my care.
        </p>
      </div>
    );
  }

  return (
    <div className="recent-ratings">
      <h3>📋 Patient Feedback Log <span className="total-count">({total} total)</span></h3>
      <div className="ratings-list">
        {ratings.map((rating) => (
          <div key={rating.id} className={`rating-card stars-${rating.stars}`}>
            <div className="rating-header">
              <span className="rating-stars" aria-label={`${rating.stars} out of 5 stars`}>
                {renderStars(rating.stars)}
              </span>
              <span className="rating-category">
                {rating.category_emoji} {rating.category_name}
              </span>
            </div>
            {rating.comment && (
              <p className="rating-comment">"{rating.comment}"</p>
            )}
            <div className="rating-footer">
              <span className="rating-author">— {rating.reviewer_name}</span>
              <span className="rating-date">{formatDate(rating.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          className="load-more-btn"
          onClick={handleLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading more records...' : 'Load More Patient Records'}
        </button>
      )}
    </div>
  );
}

export default RecentRatings;
