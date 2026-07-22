'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.SMARTGRANT_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = process.env.SMARTGRANT_DB_PATH || path.join(DATA_DIR, 'smartgrant.db');

let db;

function connect() {
  if (db) return db;
  if (DB_PATH !== ':memory:') {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name     TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('farmer', 'officer')),
      sbi           TEXT,
      business_name TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf       TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parcels (
      parcel_ref  TEXT PRIMARY KEY,
      area_ha     REAL NOT NULL,
      land_cover  TEXT NOT NULL,
      county      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS applications (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      reference      TEXT NOT NULL UNIQUE,
      user_id        INTEGER NOT NULL REFERENCES users(id),
      scheme         TEXT NOT NULL,
      action_code    TEXT NOT NULL,
      action_title   TEXT NOT NULL,
      parcel_ref     TEXT NOT NULL,
      claimed_area   REAL NOT NULL,
      amount         REAL NOT NULL,
      notes          TEXT,
      status         TEXT NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('submitted','in_review','info_requested','approved','rejected','paid')),
      risk_score     INTEGER NOT NULL DEFAULT 0,
      risk_band      TEXT NOT NULL DEFAULT 'Low',
      risk_flags     TEXT NOT NULL DEFAULT '[]',
      mapping_result TEXT NOT NULL DEFAULT '{}',
      submitted_at   TEXT NOT NULL DEFAULT (datetime('now')),
      decided_at     TEXT,
      decided_by     INTEGER REFERENCES users(id),
      decision_note  TEXT,
      paid_at        TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER REFERENCES applications(id),
      actor_id       INTEGER REFERENCES users(id),
      actor_name     TEXT NOT NULL,
      action         TEXT NOT NULL,
      detail         TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_applications_user   ON applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_audit_application   ON audit_log(application_id);
  `);
}

function get(sql, ...params) {
  return connect().prepare(sql).get(...params);
}

function all(sql, ...params) {
  return connect().prepare(sql).all(...params);
}

function run(sql, ...params) {
  return connect().prepare(sql).run(...params);
}

function audit(applicationId, actor, action, detail) {
  run(
    'INSERT INTO audit_log (application_id, actor_id, actor_name, action, detail) VALUES (?, ?, ?, ?, ?)',
    applicationId, actor ? actor.id : null, actor ? actor.full_name : 'System', action, detail || null
  );
}

function nextReference() {
  const row = get('SELECT COUNT(*) AS n FROM applications');
  const year = new Date().getFullYear();
  return `SG-${year}-${String(row.n + 1).padStart(4, '0')}`;
}

function close() {
  if (db) {
    db.close();
    db = undefined;
  }
}

module.exports = { connect, get, all, run, audit, nextReference, close, DB_PATH };
