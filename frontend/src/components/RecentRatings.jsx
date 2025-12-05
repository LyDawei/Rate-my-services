import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

function RecentRatings({ refreshTrigger }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRatings = async () => {
    try {
      const response = await fetch(`${API_URL}/ratings?limit=10`);
      const data = await response.json();
      if (data.success) {
        setRatings(data.ratings);
      }
    } catch (err) {
      console.error('Failed to fetch ratings:', err);
      setError('Patient records temporarily unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [refreshTrigger]);

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
      <h3>📋 Patient Feedback Log</h3>
      <div className="ratings-list">
        {ratings.map((rating) => (
          <div key={rating.id} className={`rating-card stars-${rating.stars}`}>
            <div className="rating-header">
              <span className="rating-stars">{renderStars(rating.stars)}</span>
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
    </div>
  );
}

export default RecentRatings;
