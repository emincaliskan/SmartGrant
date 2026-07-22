'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

const COOKIE = 'sg_session';
const SESSION_HOURS = 12;

// Officer registration requires an invite code, mirroring the reality that
// case-officer access would be provisioned, not self-service. Configurable
// for real deployments; a well-known default for the demo.
const OFFICER_INVITE_CODE = process.env.SMARTGRANT_OFFICER_CODE || 'RPA-DEMO-2026';

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const csrf = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  db.run(
    'INSERT INTO sessions (token, user_id, csrf, expires_at) VALUES (?, ?, ?, ?)',
    token, userId, csrf, expires.toISOString()
  );
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Expires=${expires.toUTCString()}`);
}

function destroySession(req, res) {
  const token = readToken(req);
  if (token) db.run('DELETE FROM sessions WHERE token = ?', token);
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function readToken(req) {
  const header = req.headers.cookie || '';
  const match = header.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  return match ? match.slice(COOKIE.length + 1) : null;
}

/** Middleware: attach req.user / req.csrf when a valid session cookie exists. */
function sessionMiddleware(req, res, next) {
  const token = readToken(req);
  if (token) {
    const session = db.get(
      "SELECT s.*, u.id AS uid, u.email, u.full_name, u.role, u.sbi, u.business_name " +
      "FROM sessions s JOIN users u ON u.id = s.user_id " +
      "WHERE s.token = ? AND s.expires_at > datetime('now')",
      token
    );
    if (session) {
      req.user = {
        id: session.uid,
        email: session.email,
        full_name: session.full_name,
        role: session.role,
        sbi: session.sbi,
        business_name: session.business_name
      };
      req.csrf = session.csrf;
    }
  }
  res.locals.currentUser = req.user || null;
  res.locals.csrf = req.csrf || '';
  next();
}

/** Middleware: reject POSTs whose CSRF token doesn't match the session. */
function csrfProtect(req, res, next) {
  if (req.method === 'POST' && req.user) {
    if (!req.body || req.body._csrf !== req.csrf) {
      return res.status(403).render('error.njk', {
        title: 'Form security check failed',
        message: 'The form could not be verified. Go back, reload the page and try again.'
      });
    }
  }
  next();
}

function requireAuth(role) {
  return (req, res, next) => {
    if (!req.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
    if (role && req.user.role !== role) {
      return res.status(403).render('error.njk', {
        title: 'You do not have access to this page',
        message: role === 'officer'
          ? 'This area is for RPA case officers only.'
          : 'This area is for grant applicants only.'
      });
    }
    next();
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  sessionMiddleware,
  csrfProtect,
  requireAuth,
  OFFICER_INVITE_CODE
};
