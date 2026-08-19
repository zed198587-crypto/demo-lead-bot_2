const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function ensureDatabaseDirectory(dbPath) {
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT NOT NULL UNIQUE,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      language_code TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL DEFAULT 'IDLE',
      step TEXT,
      data_json TEXT,
      updated_at TEXT NOT NULL
    );
  `);
}

function initDatabase(dbPath) {
  ensureDatabaseDirectory(dbPath);

  const db = new Database(dbPath);
  createTables(db);

  return db;
}

module.exports = {
  initDatabase
};