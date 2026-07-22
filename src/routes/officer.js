'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { schemes } = require('../schemes');

const router = express.Router();

const LIVE_STATUSES = ['submitted', 'in_review', 'info_requested'];

router.get('/casework', requireAuth('officer'), (req, res) => {
  const filters = {
    status: (req.query.status || '').trim(),
    scheme: (req.query.scheme || '').trim(),
    band: (req.query.band || '').trim()
  };
  const clauses = [];
  const params = [];
  if (filters.status) { clauses.push('a.status = ?'); params.push(filters.status); }
  else { clauses.push(`a.status IN ('submitted','in_review','info_requested','approved','rejected','paid')`); }
  if (filters.scheme) { clauses.push('a.scheme = ?'); params.push(filters.scheme); }
  if (filters.band) { clauses.push('a.risk_band = ?'); params.push(filters.band); }

  const applications = db.all(
    `SELECT a.*, u.business_name, u.full_name AS applicant_name, u.sbi
     FROM applications a JOIN users u ON u.id = a.user_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY CASE a.risk_band WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
              a.submitted_at ASC`,
    ...params
  );
  const counts = {
    open: db.get(`SELECT COUNT(*) AS n FROM applications WHERE status IN ('submitted','in_review','info_requested')`).n,
    high: db.get(`SELECT COUNT(*) AS n FROM applications WHERE risk_band = 'High' AND status IN ('submitted','in_review','info_requested')`).n
  };
  res.render('officer/queue.njk', {
    title: 'Casework queue',
    applications,
    schemes,
    filters,
    counts
  });
});

router.get('/casework/:id', requireAuth('officer'), (req, res, next) => {
  const application = db.get(
    `SELECT a.*, u.business_name, u.full_name AS applicant_name, u.sbi, u.email AS applicant_email
     FROM applications a JOIN users u ON u.id = a.user_id WHERE a.id = ?`,
    Number(req.params.id) || 0
  );
  if (!application) return next();
  const events = db.all(
    'SELECT * FROM audit_log WHERE application_id = ? ORDER BY created_at ASC, id ASC',
    application.id
  );
  res.render('officer/case.njk', {
    title: `Case ${application.reference}`,
    application,
    flags: JSON.parse(application.risk_flags || '[]'),
    mapping: JSON.parse(application.mapping_result || '{}'),
    events,
    canDecide: LIVE_STATUSES.includes(application.status),
    canPay: application.status === 'approved',
    errors: []
  });
});

router.post('/casework/:id/decision', requireAuth('officer'), (req, res, next) => {
  const id = Number(req.params.id) || 0;
  const application = db.get('SELECT * FROM applications WHERE id = ?', id);
  if (!application) return next();

  const decision = req.body.decision;
  const note = (req.body.note || '').trim();
  const valid = ['start_review', 'approve', 'reject', 'request_info', 'record_payment'];

  if (!valid.includes(decision)) return res.redirect(`/casework/${id}`);

  // Human-in-the-loop guard: every substantive determination needs a written
  // officer rationale for the audit trail (Stage 2 ethical mitigation).
  const needsNote = ['approve', 'reject', 'request_info'].includes(decision);
  if (needsNote && note.length < 10) {
    const events = db.all('SELECT * FROM audit_log WHERE application_id = ? ORDER BY created_at ASC, id ASC', id);
    const full = db.get(
      `SELECT a.*, u.business_name, u.full_name AS applicant_name, u.sbi, u.email AS applicant_email
       FROM applications a JOIN users u ON u.id = a.user_id WHERE a.id = ?`, id);
    return res.status(400).render('officer/case.njk', {
      title: `Case ${full.reference}`,
      application: full,
      flags: JSON.parse(full.risk_flags || '[]'),
      mapping: JSON.parse(full.mapping_result || '{}'),
      events,
      canDecide: LIVE_STATUSES.includes(full.status),
      canPay: full.status === 'approved',
      errors: [{ field: 'note', message: 'Enter the reason for your decision (at least 10 characters) — every decision must carry a written officer rationale' }]
    });
  }

  if (decision === 'start_review' && application.status === 'submitted') {
    db.run("UPDATE applications SET status = 'in_review' WHERE id = ?", id);
    db.audit(id, req.user, 'review started', 'Case opened for review.');
  } else if (decision === 'request_info' && LIVE_STATUSES.includes(application.status)) {
    db.run("UPDATE applications SET status = 'info_requested' WHERE id = ?", id);
    db.audit(id, req.user, 'information requested', note);
  } else if (decision === 'approve' && LIVE_STATUSES.includes(application.status)) {
    db.run(
      "UPDATE applications SET status = 'approved', decided_at = datetime('now'), decided_by = ?, decision_note = ? WHERE id = ?",
      req.user.id, note, id
    );
    db.audit(id, req.user, 'approved', note);
  } else if (decision === 'reject' && LIVE_STATUSES.includes(application.status)) {
    db.run(
      "UPDATE applications SET status = 'rejected', decided_at = datetime('now'), decided_by = ?, decision_note = ? WHERE id = ?",
      req.user.id, note, id
    );
    db.audit(id, req.user, 'rejected', note);
  } else if (decision === 'record_payment' && application.status === 'approved') {
    db.run("UPDATE applications SET status = 'paid', paid_at = datetime('now') WHERE id = ?", id);
    db.audit(id, req.user, 'payment recorded', 'Payment issued to applicant.');
  }

  res.redirect(`/casework/${id}`);
});

router.get('/reports', requireAuth('officer'), (req, res) => {
  const total = db.get('SELECT COUNT(*) AS n FROM applications').n;
  const open = db.get(`SELECT COUNT(*) AS n FROM applications WHERE status IN ('submitted','in_review','info_requested')`).n;
  const decided = db.get(`SELECT COUNT(*) AS n FROM applications WHERE decided_at IS NOT NULL`).n;
  const paid = db.get(`SELECT COUNT(*) AS n FROM applications WHERE status = 'paid'`).n;
  const paidOnTime = db.get(
    `SELECT COUNT(*) AS n FROM applications
     WHERE status = 'paid' AND paid_at IS NOT NULL AND decided_at IS NOT NULL
       AND julianday(paid_at) - julianday(decided_at) <= 30`
  ).n;
  const mappingFlagged = db.get(
    `SELECT COUNT(*) AS n FROM applications
     WHERE json_extract(mapping_result, '$.verdict') IN ('over','minor_over','not_found')`
  ).n;
  const byBand = db.all(
    `SELECT risk_band, COUNT(*) AS n FROM applications GROUP BY risk_band`
  );
  const avgDecisionDays = db.get(
    `SELECT ROUND(AVG(julianday(decided_at) - julianday(submitted_at)), 1) AS d
     FROM applications WHERE decided_at IS NOT NULL`
  ).d;

  res.render('officer/reports.njk', {
    title: 'Delivery reports',
    metrics: {
      total,
      open,
      decided,
      paid,
      paidOnTimePct: paid ? Math.round((paidOnTime / paid) * 100) : null,
      mappingFlagged,
      mappingFlaggedPct: total ? Math.round((mappingFlagged / total) * 100) : null,
      avgDecisionDays,
      byBand
    }
  });
});

module.exports = router;
