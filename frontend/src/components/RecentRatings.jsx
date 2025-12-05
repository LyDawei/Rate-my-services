import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import BaymaxFace from './BaymaxFace';
import { API_URL } from '../config';

const RATINGS_PER_PAGE = 10;

// Map star rating to emotion for small Baymax faces
const RATING_EMOTIONS = {
  1: 'concerned',
  2: 'concerned',
  3: 'thinking',
  4: 'happy',
  5: 'celebrating'
};

function RecentRatings({ refreshTrigger }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [newRatingIds, setNewRatingIds] = useState(new Set());

  const fetchRatings = useCallback(async (offset = 0, append = false, currentRatings = []) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${API_URL}/ratings?limit=${RATINGS_PER_PAGE}&offset=${offset}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        if (append) {
          setRatings(prev => [...prev, ...data.ratings]);
        } else {
          // Mark new ratings for animation
          const existingIds = new Set(currentRatings.map(r => r.id));
          const newIds = new Set(data.ratings.filter(r => !existingIds.has(r.id)).map(r => r.id));
          setNewRatingIds(newIds);

          setRatings(data.ratings);

          // Clear new rating flags after animation
          setTimeout(() => setNewRatingIds(new Set()), 600);
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
  }, []);

  useEffect(() => {
    setRatings([]);
    fetchRatings(0, false, []);
  }, [refreshTrigger, fetchRatings]);

  const handleLoadMore = () => {
    fetchRatings(ratings.length, true, ratings);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Show relative time for recent ratings
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

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
        <h3>Patient Feedback Log</h3>
        <div className="loading-state">
          <BaymaxFace emotion="thinking" size={64} className="loading-baymax" />
          <p className="loading-text" aria-live="polite">Scanning patient records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recent-ratings error">
        <h3>Patient Feedback Log</h3>
        <div className="error-state">
          <BaymaxFace emotion="concerned" size={64} className="error-baymax" />
          <p className="error-title">Connection Error</p>
          <p className="error-text">{error}</p>
          <button className="retry-btn" onClick={() => fetchRatings(0, false)}>
            Run Diagnostics Again
          </button>
        </div>
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="recent-ratings empty">
        <h3>Patient Feedback Log</h3>
        <div className="empty-state">
          <BaymaxFace emotion="neutral" size={80} className="empty-baymax" />
          <p className="empty-title">No Feedback Recorded Yet</p>
          <p className="empty-text">
            Your feedback helps me become a better healthcare companion. I cannot deactivate until you say you are satisfied.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-ratings">
      <h3>
        Patient Feedback Log
        <span className="total-count">({total} total)</span>
      </h3>
      <div className="ratings-list">
        {ratings.map((rating, index) => {
          const isNew = newRatingIds.has(rating.id);
          const emotion = RATING_EMOTIONS[rating.stars] || 'neutral';

          return (
            <div
              key={rating.id}
              className={`rating-card stars-${rating.stars} ${isNew ? 'new-rating' : ''}`}
              style={{ '--entry-delay': `${index * 50}ms` }}
            >
              <div className="rating-header">
                <div className="rating-stars-section">
                  <BaymaxFace emotion={emotion} size={24} className="rating-baymax" />
                  <span className="rating-stars" aria-label={`${rating.stars} out of 5 stars`}>
                    {renderStars(rating.stars)}
                  </span>
                </div>
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
              {isNew && <span className="new-badge">NEW</span>}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          className="load-more-btn"
          onClick={handleLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <>
              <BaymaxFace emotion="thinking" size={20} className="btn-baymax" />
              Loading more records...
            </>
          ) : (
            'Load More Patient Records'
          )}
        </button>
      )}
    </div>
  );
}

RecentRatings.propTypes = {
  refreshTrigger: PropTypes.number.isRequired
};

export default RecentRatings;
