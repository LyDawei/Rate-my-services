import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import BaymaxFace from './BaymaxFace';
import { API_URL } from '../config';

// Animated number counter hook - DISABLED for performance
// Simply returns the target value immediately instead of animating
function useCountUp(target, _duration = 1000, _enabled = true) {
  // Performance: Skip animation entirely, just return the target value
  return target;
}

// Care level configuration
const CARE_LEVELS = [
  { min: 0, max: 2, title: 'Healthcare Companion in Training', emotion: 'concerned' },
  { min: 2, max: 3, title: 'IT Care Provider', emotion: 'thinking' },
  { min: 3, max: 3.5, title: 'Certified IT Healthcare Companion', emotion: 'neutral' },
  { min: 3.5, max: 4, title: 'Advanced Care Provider', emotion: 'happy' },
  { min: 4, max: 4.5, title: 'Superior Healthcare Companion', emotion: 'happy' },
  { min: 4.5, max: 5.1, title: 'Legendary Baymax Status', emotion: 'celebrating' },
];

function StatsDisplay({ refreshTrigger }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animateStats, setAnimateStats] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        // Trigger animation after data loads
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

  // Animated counters
  const totalCount = useCountUp(stats?.total_ratings || 0, 800, animateStats);
  const weekCount = useCountUp(stats?.ratings_this_week || 0, 600, animateStats);
  const featuresCount = useCountUp(stats?.fun_facts?.features_built || 0, 700, animateStats);
  const bugsCount = useCountUp(stats?.fun_facts?.bugs_fixed || 0, 700, animateStats);

  // Get care level based on average rating
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
          <p className="loading-text" aria-live="polite">Scanning healthcare database...</p>
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
            I am scanning for patient feedback. Be the first to help me improve!
          </p>
        </div>
      </div>
    );
  }

  const avgRating = stats.average_stars || 0;
  const careLevel = getCareLevel(avgRating);

  // Create star distribution array
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
          <span className="avg-stars">★</span>
          <span className="avg-label">satisfaction</span>
        </div>
        <div className="care-level-bar">
          <div
            className="care-level-fill"
            style={{ width: `${(avgRating / 5) * 100}%` }}
            role="progressbar"
            aria-valuenow={avgRating}
            aria-valuemin="0"
            aria-valuemax="5"
          />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{totalCount}</span>
          <span className="stat-label">Patients Served</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{weekCount}</span>
          <span className="stat-label">This Week</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{featuresCount}</span>
          <span className="stat-label">Features Built</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{bugsCount}</span>
          <span className="stat-label">Bugs Fixed</span>
        </div>
      </div>

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
                <span className="star-label">{stars}★</span>
                <div
                  className="bar-container"
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label={`${stars} star ratings: ${count} (${percentage.toFixed(0)}%)`}
                >
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
                <span className="cat-avg">{cat.avg_stars}★</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

StatsDisplay.propTypes = {
  refreshTrigger: PropTypes.number.isRequired
};

export default StatsDisplay;
