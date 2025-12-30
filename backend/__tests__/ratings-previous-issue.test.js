/**
 * Tests for previous_issue_details field in ratings endpoint
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('ratings previous_issue_details validation', () => {
  let testDbPath;
  let testDb;
  let CATEGORIES;

  // Helper to create a fresh test database path
  const createTestDbPath = () => {
    return path.join(os.tmpdir(), `test-ratings-db-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  };

  // Create mock database with ratings table
  const createMockDatabase = (dbPath) => {
    const db = new Database(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
        category TEXT NOT NULL,
        comment TEXT,
        reviewer_name TEXT DEFAULT 'Anonymous Patient',
        resolves_issue INTEGER DEFAULT NULL,
        issue_recurrence INTEGER DEFAULT NULL,
        previous_issue_details TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    return db;
  };

  beforeEach(() => {
    testDbPath = createTestDbPath();
    testDb = createMockDatabase(testDbPath);

    // Load categories
    CATEGORIES = require('../categories');
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
    if (testDbPath && fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('previous_issue_details field storage', () => {
    test('stores previous_issue_details when issue_recurrence is true', () => {
      const stmt = testDb.prepare(`
        INSERT INTO ratings (stars, category, comment, reviewer_name, resolves_issue, issue_recurrence, previous_issue_details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        5,
        'bug_fixing',
        'Great service',
        'Test User',
        1,
        1,
        'This issue happened last month'
      );

      const rating = testDb.prepare('SELECT * FROM ratings WHERE id = ?').get(result.lastInsertRowid);

      expect(rating.issue_recurrence).toBe(1);
      expect(rating.previous_issue_details).toBe('This issue happened last month');
    });

    test('allows null previous_issue_details when issue_recurrence is false', () => {
      const stmt = testDb.prepare(`
        INSERT INTO ratings (stars, category, comment, reviewer_name, resolves_issue, issue_recurrence, previous_issue_details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        4,
        'feature_building',
        'Good work',
        'Another User',
        1,
        0,
        null
      );

      const rating = testDb.prepare('SELECT * FROM ratings WHERE id = ?').get(result.lastInsertRowid);

      expect(rating.issue_recurrence).toBe(0);
      expect(rating.previous_issue_details).toBeNull();
    });

    test('allows null previous_issue_details when issue_recurrence is null', () => {
      const stmt = testDb.prepare(`
        INSERT INTO ratings (stars, category, comment, reviewer_name, resolves_issue, issue_recurrence, previous_issue_details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        3,
        'consultation',
        null,
        'Anonymous Patient',
        null,
        null,
        null
      );

      const rating = testDb.prepare('SELECT * FROM ratings WHERE id = ?').get(result.lastInsertRowid);

      expect(rating.issue_recurrence).toBeNull();
      expect(rating.previous_issue_details).toBeNull();
    });
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
      const { stars, category, comment, reviewer_name, resolves_issue, issue_recurrence, previous_issue_details } = data;

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

  describe('database column migration', () => {
    test('previous_issue_details column exists in schema', () => {
      const tableInfo = testDb.prepare("PRAGMA table_info(ratings)").all();
      const columnNames = tableInfo.map(col => col.name);

      expect(columnNames).toContain('previous_issue_details');
    });

    test('previous_issue_details column allows TEXT type', () => {
      const tableInfo = testDb.prepare("PRAGMA table_info(ratings)").all();
      const column = tableInfo.find(col => col.name === 'previous_issue_details');

      expect(column.type).toBe('TEXT');
    });

    test('previous_issue_details column has NULL default', () => {
      const tableInfo = testDb.prepare("PRAGMA table_info(ratings)").all();
      const column = tableInfo.find(col => col.name === 'previous_issue_details');

      expect(column.dflt_value).toBe('NULL');
    });
  });
});
