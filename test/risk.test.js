'use strict';

process.env.SMARTGRANT_DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const risk = require('../src/risk');
const { hashPassword } = require('../src/auth');

function setup() {
  db.connect();
  db.run("INSERT OR IGNORE INTO parcels (parcel_ref, area_ha, land_cover, county) VALUES ('AB1234 5678', 10.0, 'Arable', 'Testshire')");
  const existing = db.get("SELECT id FROM users WHERE email = 'risk-test@example.com'");
  if (existing) return existing.id;
  const r = db.run(
    "INSERT INTO users (email, password_hash, full_name, role, sbi, business_name) VALUES ('risk-test@example.com', ?, 'Test Farmer', 'farmer', '123456789', 'Test Farm')",
    hashPassword('password123')
  );
  return r.lastInsertRowid;
}

test('claim within registered area on a fresh account scores Low band', () => {
  const userId = setup();
  const t = risk.triage({ userId, parcelRef: 'AB1234 5678', claimedArea: 8, amount: 3000 });
  assert.equal(t.mapping.verdict, 'match');
  // Only the "first application" flag applies (+10)
  assert.equal(t.score, 10);
  assert.equal(t.band, 'Low');
});

test('over-claimed area beyond 10% raises a High-weight mapping flag', () => {
  const userId = setup();
  const t = risk.triage({ userId, parcelRef: 'AB1234 5678', claimedArea: 12, amount: 3000 });
  assert.equal(t.mapping.verdict, 'over');
  assert.ok(t.flags.some((f) => f.points === 40));
});

test('unknown parcel is flagged for manual mapping check', () => {
  const userId = setup();
  const t = risk.triage({ userId, parcelRef: 'ZZ0000 0000', claimedArea: 5, amount: 1000 });
  assert.equal(t.mapping.verdict, 'not_found');
  assert.ok(t.flags.some((f) => f.reason.includes('not found')));
});

test('high-value claims add value flags and can reach High band', () => {
  const userId = setup();
  const t = risk.triage({ userId, parcelRef: 'ZZ0000 0000', claimedArea: 5, amount: 150000 });
  assert.ok(t.score >= 60);
  assert.equal(t.band, 'High');
});

test('triage is deterministic for identical inputs', () => {
  const userId = setup();
  const a = risk.triage({ userId, parcelRef: 'AB1234 5678', claimedArea: 8, amount: 3000 });
  const b = risk.triage({ userId, parcelRef: 'AB1234 5678', claimedArea: 8, amount: 3000 });
  assert.deepEqual(a, b);
});
