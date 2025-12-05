import { useState } from 'react';

const STAR_LABELS = {
  1: "Meh...",
  2: "Could be better",
  3: "Solid work!",
  4: "Great job!",
  5: "LEGENDARY!"
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
        {hover > 0 ? STAR_LABELS[hover] : (rating > 0 ? STAR_LABELS[rating] : "Click to rate!")}
      </p>
    </div>
  );
}

export default StarRating;
