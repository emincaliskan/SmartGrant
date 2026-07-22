'use strict';

/**
 * Seed the SmartGrant database with demonstration data:
 *   - a land-parcel register (prototype proxy for LPIS)
 *   - one demo case-officer and one demo farmer account
 *   - a handful of sample applications in different states
 * All of it is fictional demo data. Run with: npm run seed
 * Safe to run repeatedly — it only seeds what is missing.
 */

const db = require('./db');
const { hashPassword } = require('./auth');
const { getAction } = require('./schemes');
const risk = require('./risk');

const PARCELS = [
  { ref: 'SK1234 5678', area: 12.4, cover: 'Arable', county: 'Derbyshire' },
  { ref: 'SK1234 9012', area: 8.7, cover: 'Permanent grassland', county: 'Derbyshire' },
  { ref: 'TL4567 8901', area: 24.1, cover: 'Arable', county: 'Cambridgeshire' },
  { ref: 'TL4567 2345', area: 5.3, cover: 'Woodland', county: 'Cambridgeshire' },
  { ref: 'SO8901 2345', area: 17.9, cover: 'Permanent grassland', county: 'Herefordshire' },
  { ref: 'SO8901 6789', area: 3.2, cover: 'Ponds and water', county: 'Herefordshire' },
  { ref: 'NY2345 6789', area: 41.6, cover: 'Upland grazing', county: 'Cumbria' },
  { ref: 'NY2345 0123', area: 9.8, cover: 'Hay meadow', county: 'Cumbria' },
  { ref: 'TQ6789 0123', area: 14.2, cover: 'Arable', county: 'Kent' },
  { ref: 'TQ6789 4567', area: 6.5, cover: 'Orchard', county: 'Kent' }
];

function seed({ quiet = false } = {}) {
  db.connect();
  const log = quiet ? () => {} : console.log;

  for (const p of PARCELS) {
    db.run(
      'INSERT OR IGNORE INTO parcels (parcel_ref, area_ha, land_cover, county) VALUES (?, ?, ?, ?)',
      p.ref, p.area, p.cover, p.county
    );
  }
  log(`Parcels in register: ${db.get('SELECT COUNT(*) AS n FROM parcels').n}`);

  const demoUsers = [
    {
      email: 'officer@rpa.demo',
      password: 'OfficerDemo1',
      name: 'Priya Sharma',
      role: 'officer',
      sbi: null,
      business: 'Rural Payments Agency (demo)'
    },
    {
      email: 'farmer@farm.demo',
      password: 'FarmerDemo1',
      name: 'Tom Ashworth',
      role: 'farmer',
      sbi: '106512347',
      business: 'Ashworth Farm Partnership (demo)'
    }
  ];

  for (const u of demoUsers) {
    const existing = db.get('SELECT id FROM users WHERE email = ?', u.email);
    if (!existing) {
      db.run(
        'INSERT INTO users (email, password_hash, full_name, role, sbi, business_name) VALUES (?, ?, ?, ?, ?, ?)',
        u.email, hashPassword(u.password), u.name, u.role, u.sbi, u.business
      );
      log(`Created ${u.role} account: ${u.email} / ${u.password}`);
    }
  }

  const farmer = db.get("SELECT * FROM users WHERE email = 'farmer@farm.demo'");
  const anyApps = db.get('SELECT COUNT(*) AS n FROM applications').n;
  if (farmer && anyApps === 0) {
    const samples = [
      { scheme: 'SFI2026', action: 'HERB1', parcel: 'SK1234 5678', area: 10.0, status: 'paid', decidedDaysAgo: 40, paidDaysAgo: 25 },
      { scheme: 'CS', action: 'HEDG1', parcel: 'SK1234 9012', area: 8.7, status: 'approved', decidedDaysAgo: 6 },
      { scheme: 'SFI2026', action: 'BIRD1', parcel: 'TL4567 8901', area: 26.0, status: 'submitted' }
    ];
    for (const s of samples) {
      const action = getAction(s.scheme, s.action);
      const amount = Math.round(action.ratePerHa * s.area * 100) / 100;
      const t = risk.triage({ userId: farmer.id, parcelRef: s.parcel, claimedArea: s.area, amount });
      const ref = db.nextReference();
      const result = db.run(
        `INSERT INTO applications
           (reference, user_id, scheme, action_code, action_title, parcel_ref, claimed_area,
            amount, status, risk_score, risk_band, risk_flags, mapping_result,
            submitted_at, decided_at, decision_note, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 datetime('now', ?), ?, ?, ?)`,
        ref, farmer.id, s.scheme, s.action, action.title, s.parcel, s.area,
        amount, s.status, t.score, t.band, JSON.stringify(t.flags), JSON.stringify(t.mapping),
        `-${(s.decidedDaysAgo || 0) + 10} days`,
        s.decidedDaysAgo ? new Date(Date.now() - s.decidedDaysAgo * 86400000).toISOString() : null,
        s.decidedDaysAgo ? 'Checks complete; parcel and claim verified. (Seeded demo decision.)' : null,
        s.paidDaysAgo ? new Date(Date.now() - s.paidDaysAgo * 86400000).toISOString() : null
      );
      db.audit(result.lastInsertRowid, null, 'seed', `Demo application ${ref} created with status "${s.status}".`);
    }
    log('Created 3 sample applications for the demo farmer.');
  }

  log('Seed complete.');
}

if (require.main === module) {
  seed();
  db.close();
}

module.exports = { seed };
