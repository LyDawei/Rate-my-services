import { useState, useEffect } from 'react';
import { API_URL } from '../config';

function StatsDisplay({ refreshTrigger }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="stats-display loading">
        <h3>🏥 Care Statistics</h3>
        <p className="loading-text" aria-live="polite">Scanning healthcare database...</p>
      </div>
    );
  }

  if (!stats || stats.total_ratings === 0) {
    return (
      <div className="stats-display empty">
        <h3>🏥 Care Statistics</h3>
        <p>No patient data recorded. I am ready to provide care.</p>
      </div>
    );
  }

  const renderStarBar = (stars, count, total) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="star-bar" key={stars}>
        <span className="star-label">{stars}★</span>
        <div className="bar-container" role="progressbar" aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100">
          <div className="bar-fill" style={{ width: `${percentage}%` }}></div>
        </div>
        <span className="bar-count">{count}</span>
      </div>
    );
  };

  // Create star distribution array (ensure all 5 stars are represented)
  // Use slice() to avoid mutating the original array with reverse()
  const starDist = [1, 2, 3, 4, 5].map(star => {
    const found = stats.star_distribution.find(s => s.stars === star);
    return { stars: star, count: found ? found.count : 0 };
  });

  return (
    <div className="stats-display">
      <h3>🏥 Care Statistics</h3>

      <div className="hero-title-section">
        <span className="hero-title">{stats.hero_title}</span>
        <div className="avg-rating">
          <span className="avg-number">{(stats.average_stars || 0).toFixed(1)}</span>
          <span className="avg-stars">★</span>
          <span className="avg-label">satisfaction</span>
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
          <span className="stat-number">{stats.fun_facts.printers_rehabilitated || 0}</span>
          <span className="stat-label">🖨️ Printers Healed</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.fun_facts.emergencies_handled || 0}</span>
          <span className="stat-label">🚨 Emergencies</span>
        </div>
      </div>

      <div className="distribution-section">
        <h4>Satisfaction Distribution</h4>
        <div className="star-distribution">
          {[...starDist].reverse().map(({ stars, count }) =>
            renderStarBar(stars, count, stats.total_ratings)
          )}
        </div>
      </div>

      {stats.category_breakdown.length > 0 && (
        <div className="category-stats">
          <h4>Treatment Types</h4>
          <div className="category-list">
            {stats.category_breakdown.slice(0, 5).map((cat) => (
              <div className="category-stat" key={cat.category}>
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

export default StatsDisplay;
