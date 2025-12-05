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
        setError('I cannot connect to my care database. Is my server running?');
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitMessage(null);

    if (stars === 0) {
      setError("On a scale of 1 to 5, how would you rate your satisfaction?");
      return;
    }
    if (!category) {
      setError("Please select a care category so I can improve my services.");
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
        setError(data.error || 'I have encountered an unexpected error.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('I cannot reach my care database. Please check if my server is operational.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="rating-form" onSubmit={handleSubmit}>
      <h2>Patient Satisfaction Survey</h2>
      <p className="form-subtitle">I cannot deactivate until you say you are satisfied with your care.</p>

      {submitMessage && (
        <div className="message success">
          <span className="message-icon">👊</span>
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
        <label>On a scale of 1 to 5, how would you rate your care?</label>
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
        <label htmlFor="comment">Additional Symptoms or Feedback</label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe your experience... (optional)"
          rows={3}
          disabled={isSubmitting}
          maxLength={500}
        />
        <span className="char-count">{comment.length}/500</span>
      </div>

      <div className="form-section">
        <label htmlFor="name">Patient Name</label>
        <input
          type="text"
          id="name"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          placeholder="Anonymous Patient"
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
            Processing your feedback...
          </>
        ) : (
          <>👊 Submit Feedback</>
        )}
      </button>
    </form>
  );
}

export default RatingForm;
