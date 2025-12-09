/**
 * Tests for auth-database.js session table initialization and migration
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('auth-database session table', () => {
  let testDbPath;
  let testDb;

  // Helper to create a fresh test database path
  const createTestDbPath = () => {
    return path.join(os.tmpdir(), `test-auth-db-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  };

  // Helper to load auth-database module with a fresh database
  const loadAuthDatabase = (dbPath) => {
    // Clear module cache to force re-initialization
    jest.resetModules();
    process.env.DATABASE_PATH = dbPath;
    return require('../auth-database');
  };

  // Cleanup helper
  const cleanup = () => {
    if (testDb) {
      try {
        testDb.close();
      } catch (e) {
        // Ignore close errors
      }
      testDb = null;
    }
    if (testDbPath && fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {
        // Ignore unlink errors
      }
    }
  };

  beforeEach(() => {
    testDbPath = createTestDbPath();
  });

  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    // Reset environment
    delete process.env.DATABASE_PATH;
    jest.resetModules();
  });

  describe('fresh database initialization', () => {
    test('creates sessions table with correct schema', () => {
      const authDb = loadAuthDatabase(testDbPath);

      const tableInfo = authDb.db.prepare("PRAGMA table_info(sessions)").all();
      const columnNames = tableInfo.map(col => col.name);

      expect(columnNames).toContain('sid');
      expect(columnNames).toContain('sess');
      expect(columnNames).toContain('expire');
      expect(columnNames).not.toContain('expired');
    });

    test('creates index on expire column', () => {
      const authDb = loadAuthDatabase(testDbPath);

      const indexInfo = authDb.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND tbl_name='sessions' AND name='idx_sessions_expire'
      `).get();

      expect(indexInfo).toBeDefined();
      expect(indexInfo.name).toBe('idx_sessions_expire');
    });

    test('creates admin_users table', () => {
      const authDb = loadAuthDatabase(testDbPath);

      const tableInfo = authDb.db.prepare("PRAGMA table_info(admin_users)").all();
      const columnNames = tableInfo.map(col => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('password_hash');
    });

    test('creates login_attempts table', () => {
      const authDb = loadAuthDatabase(testDbPath);

      const tableInfo = authDb.db.prepare("PRAGMA table_info(login_attempts)").all();
      const columnNames = tableInfo.map(col => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('ip_address');
    });
  });

  describe('migration from old schema', () => {
    test('migrates "expired" column to "expire"', () => {
      // Create database with old schema BEFORE loading auth-database
      testDb = new Database(testDbPath);
      testDb.exec(`
        CREATE TABLE sessions (
          sid TEXT PRIMARY KEY NOT NULL,
          sess TEXT NOT NULL,
          expired INTEGER NOT NULL
        )
      `);
      testDb.exec(`CREATE INDEX idx_sessions_expired ON sessions(expired)`);

      // Insert test data
      testDb.prepare(`
        INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?)
      `).run('test-session-1', '{"user":"test"}', '2025-12-10T00:00:00.000Z');

      testDb.close();
      testDb = null;

      // Now load auth-database - it should migrate
      const authDb = loadAuthDatabase(testDbPath);

      // Verify schema was migrated
      const tableInfo = authDb.db.prepare("PRAGMA table_info(sessions)").all();
      const columnNames = tableInfo.map(col => col.name);

      expect(columnNames).toContain('expire');
      expect(columnNames).not.toContain('expired');

      // Verify data was preserved
      const session = authDb.db.prepare('SELECT * FROM sessions WHERE sid = ?').get('test-session-1');
      expect(session).toBeDefined();
      expect(session.sess).toBe('{"user":"test"}');
      expect(session.expire).toBe('2025-12-10T00:00:00.000Z');

      // Verify old index was replaced
      const oldIndex = authDb.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND name='idx_sessions_expired'
      `).get();
      expect(oldIndex).toBeUndefined();

      const newIndex = authDb.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND name='idx_sessions_expire'
      `).get();
      expect(newIndex).toBeDefined();
    });

    test('preserves existing data during migration', () => {
      // Create database with old schema and multiple sessions
      testDb = new Database(testDbPath);
      testDb.exec(`
        CREATE TABLE sessions (
          sid TEXT PRIMARY KEY NOT NULL,
          sess TEXT NOT NULL,
          expired INTEGER NOT NULL
        )
      `);

      // Insert multiple test sessions
      const insert = testDb.prepare(`
        INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?)
      `);
      insert.run('session-a', '{"id":"a"}', '2025-12-10T01:00:00.000Z');
      insert.run('session-b', '{"id":"b"}', '2025-12-10T02:00:00.000Z');
      insert.run('session-c', '{"id":"c"}', '2025-12-10T03:00:00.000Z');

      testDb.close();
      testDb = null;

      // Load auth-database to trigger migration
      const authDb = loadAuthDatabase(testDbPath);

      // Verify all sessions were preserved
      const sessions = authDb.db.prepare('SELECT * FROM sessions ORDER BY sid').all();
      expect(sessions).toHaveLength(3);
      expect(sessions[0].sid).toBe('session-a');
      expect(sessions[1].sid).toBe('session-b');
      expect(sessions[2].sid).toBe('session-c');
    });
  });

  describe('correct schema detection', () => {
    test('does not modify table with correct schema', () => {
      // Create database with correct schema
      testDb = new Database(testDbPath);
      testDb.exec(`
        CREATE TABLE sessions (
          sid TEXT PRIMARY KEY NOT NULL,
          sess TEXT NOT NULL,
          expire TEXT NOT NULL
        )
      `);
      testDb.exec(`CREATE INDEX idx_sessions_expire ON sessions(expire)`);

      // Insert test data
      testDb.prepare(`
        INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, ?)
      `).run('existing-session', '{"existing":true}', '2025-12-10T00:00:00.000Z');

      testDb.close();
      testDb = null;

      // Load auth-database
      const authDb = loadAuthDatabase(testDbPath);

      // Verify schema is still correct
      const tableInfo = authDb.db.prepare("PRAGMA table_info(sessions)").all();
      const columnNames = tableInfo.map(col => col.name);
      expect(columnNames).toContain('expire');

      // Verify data is still there
      const session = authDb.db.prepare('SELECT * FROM sessions WHERE sid = ?').get('existing-session');
      expect(session).toBeDefined();
      expect(session.sess).toBe('{"existing":true}');
    });
  });

  describe('edge cases', () => {
    test('throws error for sessions table missing sid column', () => {
      // Create malformed table
      testDb = new Database(testDbPath);
      testDb.exec(`
        CREATE TABLE sessions (
          session_id TEXT PRIMARY KEY NOT NULL,
          sess TEXT NOT NULL,
          expire TEXT NOT NULL
        )
      `);
      testDb.close();
      testDb = null;

      expect(() => {
        loadAuthDatabase(testDbPath);
      }).toThrow(/missing required columns/);
    });

    test('throws error for sessions table missing sess column', () => {
      testDb = new Database(testDbPath);
      testDb.exec(`
        CREATE TABLE sessions (
          sid TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL,
          expire TEXT NOT NULL
        )
      `);
      testDb.close();
      testDb = null;

      expect(() => {
        loadAuthDatabase(testDbPath);
      }).toThrow(/missing required columns/);
    });

    test('throws error for sessions table missing expire/expired column', () => {
      testDb = new Database(testDbPath);
      testDb.exec(`
        CREATE TABLE sessions (
          sid TEXT PRIMARY KEY NOT NULL,
          sess TEXT NOT NULL,
          expiry TEXT NOT NULL
        )
      `);
      testDb.close();
      testDb = null;

      expect(() => {
        loadAuthDatabase(testDbPath);
      }).toThrow(/missing expire\/expired column/);
    });

    test('warns but continues when both expire and expired columns exist', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      testDb = new Database(testDbPath);
      testDb.exec(`
        CREATE TABLE sessions (
          sid TEXT PRIMARY KEY NOT NULL,
          sess TEXT NOT NULL,
          expire TEXT NOT NULL,
          expired TEXT
        )
      `);
      testDb.close();
      testDb = null;

      // Should not throw
      const authDb = loadAuthDatabase(testDbPath);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('both "expire" and "expired" columns')
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
