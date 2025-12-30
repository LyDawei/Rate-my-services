import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import StarRating from './StarRating';
import CategoryPicker from './CategoryPicker';
import BaymaxFace from './BaymaxFace';
import Confetti from './Confetti';
import { API_URL } from '../config';

function RatingForm({ onRatingSubmitted }) {
  const [stars, setStars] = useState(0);
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [resolvesIssue, setResolvesIssue] = useState(null);
  const [issueRecurrence, setIssueRecurrence] = useState(null);
  const [previousIssueDetails, setPreviousIssueDetails] = useState('');
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const successRef = useRef(null);
  const formRef = useRef(null);

  // Fetch categories on mount
  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
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
    setSubmitSuccess(false);

    if (stars === 0) {
      setError("On a scale of 1 to 5, how would you rate your satisfaction?");
      return;
    }
    if (!category) {
      setError("Please select a care category so I can improve my services.");
      return;
    }
    if (issueRecurrence && !previousIssueDetails.trim()) {
      setError("Please describe the previous occurrence of this issue so I can better diagnose the pattern.");
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
          reviewer_name: reviewerName.trim() || null,
          resolves_issue: resolvesIssue,
          issue_recurrence: issueRecurrence,
          previous_issue_details: issueRecurrence ? previousIssueDetails.trim() : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Trigger celebration!
        setSubmitSuccess(true);
        setShowCelebration(true);
        setSubmitMessage(data.message);

        // Reset form after celebration starts
        setTimeout(() => {
          setStars(0);
          setCategory('');
          setComment('');
          setReviewerName('');
          setResolvesIssue(null);
          setIssueRecurrence(null);
          setPreviousIssueDetails('');
        }, 500);

        // Notify parent
        if (onRatingSubmitted) {
          onRatingSubmitted(data.rating);
        }

        // Move focus to success message for accessibility
        setTimeout(() => successRef.current?.focus(), 100);

        // Clear celebration after animation
        setTimeout(() => {
          setShowCelebration(false);
        }, 3000);

        // Clear success message after 6 seconds
        setTimeout(() => {
          setSubmitMessage(null);
          setSubmitSuccess(false);
        }, 6000);
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

  const getCharCountClass = () => {
    const ratio = comment.length / 500;
    if (ratio >= 1) return 'char-count at-limit';
    if (ratio >= 0.8) return 'char-count near-limit';
    return 'char-count';
  };

  return (
    <form className="rating-form" onSubmit={handleSubmit} ref={formRef}>
      <Confetti active={showCelebration} duration={3000} />

      <h2>Patient Satisfaction Survey</h2>
      <p className="form-subtitle">I cannot deactivate until you say you are satisfied with your care.</p>

      {submitMessage && (
        <div
          className={`message success ${submitSuccess ? 'celebration' : ''}`}
          ref={successRef}
          tabIndex="-1"
          role="status"
          aria-live="polite"
        >
          <div className="success-content">
            <BaymaxFace emotion="celebrating" size={48} className="success-baymax" />
            <div className="success-text">
              <span className="fist-bump-text">Ba-la-la-la-la!</span>
              <span className="success-message">{submitMessage}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="message error" role="alert">
          <BaymaxFace emotion="concerned" size={36} className="error-baymax" />
          <span>{error}</span>
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
        <span className={getCharCountClass()}>
          {comment.length}/500
          {comment.length >= 400 && comment.length < 500 && (
            <span className="char-warning"> - Feedback logged</span>
          )}
        </span>
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

      <div className="form-section follow-up-section">
        <label>Follow-up Questions (optional)</label>

        <div className="follow-up-question">
          <span className="question-text">Does this resolve your issue?</span>
          <div className="toggle-buttons" role="group" aria-label="Does this resolve your issue?">
            <button
              type="button"
              className={`toggle-btn ${resolvesIssue ? 'selected yes' : ''}`}
              onClick={() => setResolvesIssue(resolvesIssue ? null : true)}
              disabled={isSubmitting}
              aria-pressed={!!resolvesIssue}
            >
              Yes
            </button>
            <button
              type="button"
              className={`toggle-btn ${resolvesIssue === false ? 'selected no' : ''}`}
              onClick={() => setResolvesIssue(resolvesIssue === false ? null : false)}
              disabled={isSubmitting}
              aria-pressed={resolvesIssue === false}
            >
              No
            </button>
          </div>
        </div>

        <div className="follow-up-question">
          <span className="question-text">Has this issue appeared before?</span>
          <div className="toggle-buttons" role="group" aria-label="Has this issue appeared before?">
            <button
              type="button"
              className={`toggle-btn ${issueRecurrence ? 'selected yes' : ''}`}
              onClick={() => {
                const newValue = issueRecurrence ? null : true;
                setIssueRecurrence(newValue);
                if (!newValue) {
                  setPreviousIssueDetails('');
                }
              }}
              disabled={isSubmitting}
              aria-pressed={!!issueRecurrence}
            >
              Yes
            </button>
            <button
              type="button"
              className={`toggle-btn ${issueRecurrence === false ? 'selected no' : ''}`}
              onClick={() => {
                setIssueRecurrence(issueRecurrence === false ? null : false);
                setPreviousIssueDetails('');
              }}
              disabled={isSubmitting}
              aria-pressed={issueRecurrence === false}
            >
              No
            </button>
          </div>
        </div>

        {issueRecurrence && (
          <div className="follow-up-details">
            <label htmlFor="previousIssueDetails">
              Please describe the previous occurrence <span className="required-indicator">*</span>
            </label>
            <textarea
              id="previousIssueDetails"
              value={previousIssueDetails}
              onChange={(e) => setPreviousIssueDetails(e.target.value)}
              placeholder="When did it happen? What were the symptoms? Any relevant details..."
              rows={3}
              disabled={isSubmitting}
              maxLength={500}
              required
              aria-required="true"
            />
            <span className={`char-count ${previousIssueDetails.length >= 500 ? 'at-limit' : previousIssueDetails.length >= 400 ? 'near-limit' : ''}`}>
              {previousIssueDetails.length}/500
            </span>
          </div>
        )}
      </div>

      <button
        type="submit"
        className={`submit-btn ${isSubmitting ? 'submitting' : ''} ${submitSuccess ? 'success' : ''}`}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <BaymaxFace emotion="thinking" size={24} className="submit-baymax" />
            <span>Processing your feedback...</span>
          </>
        ) : submitSuccess ? (
          <>
            <span className="success-icon">✓</span>
            <span>Thank you!</span>
          </>
        ) : (
          <>
            <span className="fist-bump">👊</span>
            <span>Submit Feedback</span>
          </>
        )}
      </button>
    </form>
  );
}

RatingForm.propTypes = {
  onRatingSubmitted: PropTypes.func
};

export default RatingForm;
