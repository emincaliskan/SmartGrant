'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { schemes, getScheme, getAction } = require('../schemes');
const risk = require('../risk');

const router = express.Router();

router.get('/dashboard', requireAuth('farmer'), (req, res) => {
  const applications = db.all(
    'SELECT * FROM applications WHERE user_id = ? ORDER BY submitted_at DESC',
    req.user.id
  );
  res.render('farmer/dashboard.njk', {
    title: 'Your grant applications',
    applications,
    notice: req.query.submitted ? 'Your application has been submitted.' : null
  });
});

router.get('/apply', requireAuth('farmer'), (req, res) => {
  const parcels = db.all('SELECT * FROM parcels ORDER BY parcel_ref');
  res.render('farmer/apply.njk', {
    title: 'Apply for a grant',
    schemes,
    parcels,
    values: {},
    errors: []
  });
});

router.post('/apply', requireAuth('farmer'), (req, res) => {
  const values = {
    scheme: (req.body.scheme || '').trim(),
    action: (req.body.action || '').trim(),
    parcel_ref: (req.body.parcel_ref || '').trim(),
    claimed_area: (req.body.claimed_area || '').trim(),
    notes: (req.body.notes || '').trim().slice(0, 2000)
  };
  const errors = [];

  const scheme = getScheme(values.scheme);
  if (!scheme) errors.push({ field: 'scheme', message: 'Select a scheme' });
  const action = scheme ? getAction(values.scheme, values.action) : null;
  if (scheme && !action) errors.push({ field: 'action', message: 'Select the action you are applying for' });
  if (!values.parcel_ref) errors.push({ field: 'parcel_ref', message: 'Enter or select a land parcel reference' });
  const area = Number(values.claimed_area);
  if (!values.claimed_area || Number.isNaN(area) || area <= 0 || area > 10000) {
    errors.push({ field: 'claimed_area', message: 'Enter the area you are claiming, in hectares, as a number greater than 0' });
  }

  if (errors.length) {
    const parcels = db.all('SELECT * FROM parcels ORDER BY parcel_ref');
    return res.status(400).render('farmer/apply.njk', {
      title: 'Apply for a grant', schemes, parcels, values, errors
    });
  }

  const amount = Math.round(action.ratePerHa * area * 100) / 100;
  const t = risk.triage({
    userId: req.user.id,
    parcelRef: values.parcel_ref,
    claimedArea: area,
    amount
  });
  const reference = db.nextReference();
  const result = db.run(
    `INSERT INTO applications
       (reference, user_id, scheme, action_code, action_title, parcel_ref, claimed_area,
        amount, notes, status, risk_score, risk_band, risk_flags, mapping_result)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?)`,
    reference, req.user.id, values.scheme, values.action, action.title, values.parcel_ref,
    area, amount, values.notes || null, t.score, t.band,
    JSON.stringify(t.flags), JSON.stringify(t.mapping)
  );
  db.audit(result.lastInsertRowid, req.user, 'submitted',
    `Application ${reference} submitted. Automated triage: ${t.band} priority (score ${t.score}). ` +
    'All automated checks are advisory — a case officer must make every decision.');

  res.redirect(`/applications/${result.lastInsertRowid}?submitted=1`);
});

router.get('/applications/:id', requireAuth('farmer'), (req, res, next) => {
  const application = db.get(
    'SELECT * FROM applications WHERE id = ? AND user_id = ?',
    Number(req.params.id) || 0, req.user.id
  );
  if (!application) return next();
  const events = db.all(
    'SELECT * FROM audit_log WHERE application_id = ? ORDER BY created_at ASC, id ASC',
    application.id
  );
  res.render('farmer/application.njk', {
    title: `Application ${application.reference}`,
    application,
    mapping: JSON.parse(application.mapping_result || '{}'),
    events,
    justSubmitted: Boolean(req.query.submitted)
  });
});

module.exports = router;
