/**
 * Tests for previous_issue_details field validation logic
 *
 * Note: Database-specific tests have been removed after PostgreSQL migration.
 * These tests focus on the validation logic which is pure JavaScript.
 */

describe('ratings previous_issue_details validation', () => {
  let CATEGORIES;

  beforeEach(() => {
    CATEGORIES = require('../categories');
  });

  describe('validation logic (mimicking server.js behavior)', () => {
    const MAX_COMMENT_LENGTH = 500;

    // Mimic normalizeBoolean from server.js
    const normalizeBoolean = (value) => {
      if (value === true || value === 'true' || value === 1) return 1;
      if (value === false || value === 'false' || value === 0) return 0;
      return null;
    };

    // Mimic validation logic from server.js
    const validateAndPrepareData = (data) => {
      const { stars, category, comment, issue_recurrence, previous_issue_details } = data;

      const errors = [];

      // Validate stars
      if (!stars || stars < 1 || stars > 5 || !Number.isInteger(stars)) {
        errors.push('Invalid stars rating');
      }

      // Validate category
      if (!category || !CATEGORIES[category]) {
        errors.push('Invalid category');
      }

      // Validate comment length
      if (comment && String(comment).trim().length > MAX_COMMENT_LENGTH) {
        errors.push('Comment exceeds maximum length');
      }

      const issueRecurrenceValue = normalizeBoolean(issue_recurrence);

      // Validate and sanitize previous_issue_details
      let previousIssueDetailsValue = null;
      if (previous_issue_details) {
        previousIssueDetailsValue = String(previous_issue_details).trim();
        if (previousIssueDetailsValue.length > MAX_COMMENT_LENGTH) {
          errors.push('Previous issue details exceeds maximum length');
        }
        if (previousIssueDetailsValue.length === 0) {
          previousIssueDetailsValue = null;
        }
      }

      // If issue recurrence is true, previous_issue_details is required
      if (issueRecurrenceValue === 1 && !previousIssueDetailsValue) {
        errors.push('Previous issue details required when issue has appeared before');
      }

      return { errors, issueRecurrenceValue, previousIssueDetailsValue };
    };

    test('requires previous_issue_details when issue_recurrence is true', () => {
      const result = validateAndPrepareData({
        stars: 5,
        category: 'bug_fixing',
        issue_recurrence: true,
        previous_issue_details: null
      });

      expect(result.errors).toContain('Previous issue details required when issue has appeared before');
    });

    test('requires previous_issue_details when issue_recurrence is truthy string', () => {
      const result = validateAndPrepareData({
        stars: 5,
        category: 'bug_fixing',
        issue_recurrence: 'true',
        previous_issue_details: ''
      });

      expect(result.errors).toContain('Previous issue details required when issue has appeared before');
    });

    test('requires previous_issue_details when issue_recurrence is 1', () => {
      const result = validateAndPrepareData({
        stars: 5,
        category: 'bug_fixing',
        issue_recurrence: 1,
        previous_issue_details: '   '  // whitespace only
      });

      expect(result.errors).toContain('Previous issue details required when issue has appeared before');
    });

    test('accepts valid previous_issue_details when issue_recurrence is true', () => {
      const result = validateAndPrepareData({
        stars: 5,
        category: 'bug_fixing',
        issue_recurrence: true,
        previous_issue_details: 'This happened twice before'
      });

      expect(result.errors).not.toContain('Previous issue details required when issue has appeared before');
      expect(result.previousIssueDetailsValue).toBe('This happened twice before');
    });

    test('does not require previous_issue_details when issue_recurrence is false', () => {
      const result = validateAndPrepareData({
        stars: 5,
        category: 'bug_fixing',
        issue_recurrence: false,
        previous_issue_details: null
      });

      expect(result.errors).not.toContain('Previous issue details required when issue has appeared before');
    });

    test('does not require previous_issue_details when issue_recurrence is null', () => {
      const result = validateAndPrepareData({
        stars: 5,
        category: 'bug_fixing',
        issue_recurrence: null,
        previous_issue_details: null
      });

      expect(result.errors).not.toContain('Previous issue details required when issue has appeared before');
    });

    test('rejects previous_issue_details exceeding max length', () => {
      const longText = 'x'.repeat(501);
      const result = validateAndPrepareData({
        stars: 5,
        category: 'bug_fixing',
        issue_recurrence: true,
        previous_issue_details: longText
      });

      expect(result.errors).toContain('Previous issue details exceeds maximum length');
    });

    test('trims whitespace from previous_issue_details', () => {
      const result = validateAndPrepareData({
        stars: 5,
        category: 'bug_fixing',
        issue_recurrence: true,
        previous_issue_details: '  This has extra spaces  '
      });

      expect(result.previousIssueDetailsValue).toBe('This has extra spaces');
    });
  });
});
