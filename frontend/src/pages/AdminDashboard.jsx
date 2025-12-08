/**
 * AdminDashboard Page
 * Protected admin view displaying stats and ratings data
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BaymaxFace from '../components/BaymaxFace';
import BackgroundBlobs from '../components/BackgroundBlobs';
import { API_URL } from '../config';

// ============== ADMIN STATS DISPLAY ==============

// Care level configuration
const CARE_LEVELS = [
  { min: 0, max: 2, title: 'Healthcare Companion in Training', emotion: 'concerned' },
  { min: 2, max: 3, title: 'IT Care Provider', emotion: 'thinking' },
  { min: 3, max: 3.5, title: 'Certified IT Healthcare Companion', emotion: 'neutral' },
  { min: 3.5, max: 4, title: 'Advanced Care Provider', emotion: 'happy' },
  { min: 4, max: 4.5, title: 'Superior Healthcare Companion', emotion: 'happy' },
  { min: 4.5, max: 5.1, title: 'Legendary Baymax Status', emotion: 'celebrating' },
];

function AdminStatsDisplay({ refreshTrigger }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animateStats, setAnimateStats] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/stats`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setAnimateStats(false);
        setTimeout(() => setAnimateStats(true), 100);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAnimateStats(false);
    fetchStats();
  }, [refreshTrigger, fetchStats]);

  const getCareLevel = (avgRating) => {
    const level = CARE_LEVELS.find(l => avgRating >= l.min && avgRating < l.max);
    return level || CARE_LEVELS[0];
  };

  if (loading) {
    return (
      <div className="stats-display loading">
        <h3>Care Statistics</h3>
        <div className="loading-state">
          <BaymaxFace emotion="thinking" size={64} className="loading-baymax" />
          <p className="loading-text">Scanning healthcare database...</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.total_ratings === 0) {
    return (
      <div className="stats-display empty">
        <h3>Care Statistics</h3>
        <div className="empty-state">
          <BaymaxFace emotion="neutral" size={80} className="empty-baymax" />
          <p className="empty-title">Ready to Provide Care</p>
          <p className="empty-text">
            No patient feedback recorded yet.
          </p>
        </div>
      </div>
    );
  }

  const avgRating = stats.average_stars || 0;
  const careLevel = getCareLevel(avgRating);

  const starDist = [1, 2, 3, 4, 5].map(star => {
    const found = stats.star_distribution.find(s => s.stars === star);
    return { stars: star, count: found ? found.count : 0 };
  });

  return (
    <div className="stats-display">
      <h3>Care Statistics</h3>

      <div className="hero-title-section">
        <BaymaxFace emotion={careLevel.emotion} size={56} className="hero-baymax" />
        <span className="hero-title">{careLevel.title}</span>
        <div className="avg-rating">
          <span className="avg-number">{avgRating.toFixed(1)}</span>
          <span className="avg-stars">*</span>
          <span className="avg-label">satisfaction</span>
        </div>
        <div className="care-level-bar">
          <div
            className="care-level-fill"
            style={{ width: `${(avgRating / 5) * 100}%` }}
          />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{stats.total_ratings}</span>
          <span className="stat-label">Patients Served</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.ratings_this_week}</span>
          <span className="stat-label">This Week</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.fun_facts?.features_built || 0}</span>
          <span className="stat-label">Features Built</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.fun_facts?.bugs_fixed || 0}</span>
          <span className="stat-label">Bugs Fixed</span>
        </div>
      </div>

      {/* Issue Tracking Stats (Admin only) */}
      {stats.issue_tracking && (
        <div className="issue-tracking-section">
          <h4>Issue Resolution</h4>
          <div className="issue-stats">
            <div className="issue-stat resolved">
              <span className="issue-count">{stats.issue_tracking.resolved}</span>
              <span className="issue-label">Resolved</span>
            </div>
            <div className="issue-stat unresolved">
              <span className="issue-count">{stats.issue_tracking.unresolved}</span>
              <span className="issue-label">Unresolved</span>
            </div>
            <div className="issue-stat recurring">
              <span className="issue-count">{stats.issue_tracking.recurring}</span>
              <span className="issue-label">Recurring</span>
            </div>
          </div>
        </div>
      )}

      <div className="distribution-section">
        <h4>Satisfaction Distribution</h4>
        <div className="star-distribution">
          {[...starDist].reverse().map(({ stars, count }, index) => {
            const percentage = stats.total_ratings > 0
              ? (count / stats.total_ratings) * 100
              : 0;
            return (
              <div
                className="star-bar"
                key={stars}
                style={{ '--bar-delay': `${index * 100}ms` }}
              >
                <span className="star-label">{stars}*</span>
                <div className="bar-container">
                  <div
                    className={`bar-fill ${animateStats ? 'animate' : ''}`}
                    style={{ '--target-width': `${percentage}%` }}
                  />
                </div>
                <span className="bar-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {stats.category_breakdown.length > 0 && (
        <div className="category-stats">
          <h4>Treatment Types</h4>
          <div className="category-list">
            {stats.category_breakdown.slice(0, 5).map((cat, index) => (
              <div
                className="category-stat"
                key={cat.category}
                style={{ '--entry-delay': `${index * 80}ms` }}
              >
                <span className="cat-emoji">{cat.category_emoji}</span>
                <span className="cat-name">{cat.category_name}</span>
                <span className="cat-count">{cat.count} patients</span>
                <span className="cat-avg">{cat.avg_stars}*</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============== ADMIN RATINGS LIST ==============

const RATINGS_PER_PAGE = 10;

const RATING_EMOTIONS = {
  1: 'concerned',
  2: 'concerned',
  3: 'thinking',
  4: 'happy',
  5: 'celebrating'
};

function AdminRecentRatings({ refreshTrigger, onDelete }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  const fetchRatings = useCallback(async (offset = 0, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${API_URL}/admin/ratings?limit=${RATINGS_PER_PAGE}&offset=${offset}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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
  }, []);

  useEffect(() => {
    fetchRatings(0, false);
  }, [refreshTrigger, fetchRatings]);

  const handleLoadMore = () => {
    fetchRatings(ratings.length, true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rating?')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`${API_URL}/admin/ratings/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setRatings(prev => prev.filter(r => r.id !== id));
        setTotal(prev => prev - 1);
        if (onDelete) onDelete();
      } else {
        alert(data.error || 'Failed to delete rating');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete rating');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

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
    return '*'.repeat(count) + '-'.repeat(5 - count);
  };

  if (loading) {
    return (
      <div className="recent-ratings loading">
        <h3>Patient Feedback Log</h3>
        <div className="loading-state">
          <BaymaxFace emotion="thinking" size={64} className="loading-baymax" />
          <p className="loading-text">Scanning patient records...</p>
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
            Awaiting patient feedback submissions.
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
          const emotion = RATING_EMOTIONS[rating.stars] || 'neutral';
          const isDeleting = deletingId === rating.id;

          return (
            <div
              key={rating.id}
              className={`rating-card stars-${rating.stars} ${isDeleting ? 'deleting' : ''}`}
              style={{ '--entry-delay': `${index * 50}ms` }}
            >
              <div className="rating-header">
                <div className="rating-stars-section">
                  <BaymaxFace emotion={emotion} size={24} className="rating-baymax" />
                  <span className="rating-stars">
                    {renderStars(rating.stars)}
                  </span>
                </div>
                <span className="rating-category">
                  {rating.category_emoji} {rating.category_name}
                </span>
                <button
                  className="delete-rating-btn"
                  onClick={() => handleDelete(rating.id)}
                  disabled={isDeleting}
                  title="Delete rating"
                >
                  {isDeleting ? '...' : 'x'}
                </button>
              </div>
              {rating.comment && (
                <p className="rating-comment">"{rating.comment}"</p>
              )}
              <div className="rating-footer">
                <span className="rating-author">- {rating.reviewer_name}</span>
                <span className="rating-date">{formatDate(rating.created_at)}</span>
              </div>
              {/* Show follow-up responses if available */}
              {(rating.resolves_issue !== null || rating.issue_recurrence !== null) && (
                <div className="rating-followup">
                  {rating.resolves_issue !== null && (
                    <span className={`followup-badge ${rating.resolves_issue ? 'positive' : 'negative'}`}>
                      {rating.resolves_issue ? 'Issue Resolved' : 'Issue Not Resolved'}
                    </span>
                  )}
                  {rating.issue_recurrence !== null && rating.issue_recurrence === 1 && (
                    <span className="followup-badge recurring">
                      Recurring Issue
                    </span>
                  )}
                </div>
              )}
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

// ============== MAIN DASHBOARD ==============

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="admin-dashboard">
      <BackgroundBlobs count={3} animate={false} />

      <header className="admin-header glass-panel">
        <div className="admin-header-left">
          <BaymaxFace emotion="happy" size={48} />
          <div className="admin-title">
            <h1>Admin Dashboard</h1>
            <p className="admin-user">Welcome, {user?.display_name || user?.username}</p>
          </div>
        </div>
        <div className="admin-header-right">
          <Link to="/" className="admin-nav-link">
            View Public Form
          </Link>
          <button className="refresh-btn" onClick={handleRefresh} title="Refresh data">
            Refresh
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-content">
          <div className="admin-stats-section">
            <AdminStatsDisplay refreshTrigger={refreshKey} />
          </div>
          <div className="admin-ratings-section">
            <AdminRecentRatings refreshTrigger={refreshKey} onDelete={handleRefresh} />
          </div>
        </div>
      </main>

      <footer className="admin-footer glass-panel">
        <p>
          Baymax IT Care - Admin Portal
          <span className="footer-divider">|</span>
          <Link to="/">Return to Public Form</Link>
        </p>
      </footer>
    </div>
  );
}

export default AdminDashboard;
