import { useState } from 'react';

// Baymax satisfaction scale labels
const SATISFACTION_LABELS = {
  1: "I detect significant discomfort",
  2: "Some discomfort detected",
  3: "Moderate satisfaction",
  4: "High satisfaction detected",
  5: "I am satisfied with my care!"
};

function StarRating({ rating, setRating, disabled = false }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="star-rating">
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= (hover || rating) ? 'active' : ''}`}
            onClick={() => !disabled && setRating(star)}
            onMouseEnter={() => !disabled && setHover(star)}
            onMouseLeave={() => setHover(0)}
            disabled={disabled}
            aria-label={`Rate ${star} stars`}
          >
            <span className="star">
              {star <= (hover || rating) ? '★' : '☆'}
            </span>
          </button>
        ))}
      </div>
      <p className="star-label">
        {hover > 0 ? SATISFACTION_LABELS[hover] : (rating > 0 ? SATISFACTION_LABELS[rating] : "On a scale of 1 to 5...")}
      </p>
    </div>
  );
}

export default StarRating;
