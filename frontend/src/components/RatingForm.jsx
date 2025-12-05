import { useState, useEffect } from 'react';
import StarRating from './StarRating';
import CategoryPicker from './CategoryPicker';

const API_URL = 'http://localhost:3001/api';

function RatingForm({ onRatingSubmitted }) {
  const [stars, setStars] = useState(0);
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);
  const [error, setError] = useState(null);

  // Fetch categories on mount
  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCategories(data.categories);
        }
      })
      .catch(err => {
        console.error('Failed to fetch categories:', err);
        setError('Failed to load categories. Is the server running?');
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitMessage(null);

    if (stars === 0) {
      setError("Don't forget to rate with some stars!");
      return;
    }
    if (!category) {
      setError("Pick a category for the IT magic!");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stars,
          category,
          comment: comment.trim() || null,
          reviewer_name: reviewerName.trim() || null
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubmitMessage(data.message);
        // Reset form
        setStars(0);
        setCategory('');
        setComment('');
        setReviewerName('');
        // Notify parent
        if (onRatingSubmitted) {
          onRatingSubmitted(data.rating);
        }
        // Clear success message after 5 seconds
        setTimeout(() => setSubmitMessage(null), 5000);
      } else {
        setError(data.error || 'Something went wrong!');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit. Is the IT wizard server running?');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="rating-form" onSubmit={handleSubmit}>
      <h2>Rate Your IT Experience</h2>
      <p className="form-subtitle">Your feedback fuels the IT magic! ✨</p>

      {submitMessage && (
        <div className="message success">
          <span className="message-icon">🎉</span>
          {submitMessage}
        </div>
      )}

      {error && (
        <div className="message error">
          <span className="message-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="form-section">
        <label>How did we do?</label>
        <StarRating rating={stars} setRating={setStars} disabled={isSubmitting} />
      </div>

      <div className="form-section">
        <CategoryPicker
          categories={categories}
          selectedCategory={category}
          setSelectedCategory={setCategory}
          disabled={isSubmitting}
        />
      </div>

      <div className="form-section">
        <label htmlFor="comment">Words of Wisdom (or Roasting)</label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us how you really feel... (optional)"
          rows={3}
          disabled={isSubmitting}
          maxLength={500}
        />
        <span className="char-count">{comment.length}/500</span>
      </div>

      <div className="form-section">
        <label htmlFor="name">Your Hero Name</label>
        <input
          type="text"
          id="name"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          placeholder="Anonymous Hero"
          disabled={isSubmitting}
          maxLength={100}
        />
      </div>

      <button
        type="submit"
        className="submit-btn"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="spinner"></span>
            Sending to the IT Hall of Fame...
          </>
        ) : (
          <>🏆 Submit Rating</>
        )}
      </button>
    </form>
  );
}

export default RatingForm;
