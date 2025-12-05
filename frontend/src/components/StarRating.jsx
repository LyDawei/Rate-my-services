import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import BaymaxFace from './BaymaxFace';

// Baymax satisfaction scale labels
const SATISFACTION_LABELS = {
  1: "I detect significant discomfort",
  2: "Some discomfort detected",
  3: "Moderate satisfaction",
  4: "High satisfaction detected",
  5: "I am satisfied with my care!"
};

// Map star rating to Baymax emotion
const STAR_EMOTIONS = {
  0: 'neutral',
  1: 'concerned',
  2: 'concerned',
  3: 'thinking',
  4: 'happy',
  5: 'celebrating'
};

// Star colors that progress from red (concern) to green (healthy)
const STAR_COLORS = {
  1: '#FF5252',
  2: '#FF7043',
  3: '#FFB74D',
  4: '#81C784',
  5: '#66BB6A'
};

function StarRating({ rating, setRating, disabled = false }) {
  const [hover, setHover] = useState(0);
  const [animatingStars, setAnimatingStars] = useState([]);
  const [justSelected, setJustSelected] = useState(null);
  const timeoutRefs = useRef([]);

  const currentValue = hover || rating;
  const emotion = STAR_EMOTIONS[currentValue] || 'neutral';

  // Cleanup timeouts on unmount or rating change
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, []);

  // Handle star click with animation
  const handleStarClick = (star) => {
    if (disabled) return;

    // Clear any existing timeouts
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    // Trigger sequential fill animation
    setAnimatingStars([]);
    setJustSelected(star);

    // Animate stars sequentially
    for (let i = 1; i <= star; i++) {
      const timeoutId = setTimeout(() => {
        setAnimatingStars(prev => [...prev, i]);
      }, (i - 1) * 60);
      timeoutRefs.current.push(timeoutId);
    }

    // Clear animation state after completion
    const clearTimeoutId = setTimeout(() => {
      setAnimatingStars([]);
      setJustSelected(null);
    }, star * 60 + 400);
    timeoutRefs.current.push(clearTimeoutId);

    setRating(star);
  };

  // Get the color for a star based on current rating
  const getStarColor = (star, isActive) => {
    if (!isActive) return 'var(--baymax-gray)';
    const ratingValue = hover || rating;
    return STAR_COLORS[ratingValue] || 'var(--baymax-red)';
  };

  return (
    <div className="star-rating">
      <div className="star-rating-content">
        <div className="baymax-reaction">
          <BaymaxFace
            emotion={emotion}
            size={60}
            animate={!disabled}
            className="star-rating-baymax"
          />
        </div>

        <div className="stars-container">
          {[1, 2, 3, 4, 5].map((star) => {
            const isActive = star <= currentValue;
            const isAnimating = animatingStars.includes(star);
            const isJustSelected = justSelected === star;

            return (
              <button
                key={star}
                type="button"
                className={`star-btn ${isActive ? 'active' : ''} ${isAnimating ? 'animating' : ''} ${isJustSelected ? 'selected-pop' : ''}`}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => !disabled && setHover(star)}
                onMouseLeave={() => setHover(0)}
                disabled={disabled}
                aria-label={`Rate ${star} stars - ${SATISFACTION_LABELS[star]}`}
                style={{
                  '--star-color': getStarColor(star, isActive),
                  '--animation-delay': `${(star - 1) * 60}ms`
                }}
              >
                <span className="star" aria-hidden="true">
                  {isActive ? '★' : '☆'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="star-label" role="status" aria-live="polite">
        {currentValue > 0 ? SATISFACTION_LABELS[currentValue] : "On a scale of 1 to 5..."}
      </p>
    </div>
  );
}

StarRating.propTypes = {
  rating: PropTypes.number.isRequired,
  setRating: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default StarRating;
