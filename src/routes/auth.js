'use strict';

const express = require('express');
const db = require('../db');
const auth = require('../auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SBI_RE = /^\d{9}$/;

function homeFor(user) {
  return user.role === 'officer' ? '/casework' : '/dashboard';
}

router.get('/register', (req, res) => {
  if (req.user) return res.redirect(homeFor(req.user));
  res.render('register.njk', { title: 'Create a SmartGrant account', values: {}, errors: [] });
});

router.post('/register', (req, res) => {
  const values = {
    full_name: (req.body.full_name || '').trim(),
    email: (req.body.email || '').trim().toLowerCase(),
    role: req.body.role === 'officer' ? 'officer' : req.body.role === 'farmer' ? 'farmer' : '',
    business_name: (req.body.business_name || '').trim(),
    sbi: (req.body.sbi || '').trim(),
    invite_code: (req.body.invite_code || '').trim()
  };
  const errors = [];

  if (!values.full_name) errors.push({ field: 'full_name', message: 'Enter your full name' });
  if (!EMAIL_RE.test(values.email)) errors.push({ field: 'email', message: 'Enter an email address in the correct format, like name@example.com' });
  if (!values.role) errors.push({ field: 'role', message: 'Select the type of account you need' });
  if (!req.body.password || req.body.password.length < 8) {
    errors.push({ field: 'password', message: 'Enter a password of at least 8 characters' });
  } else if (req.body.password !== req.body.password_confirm) {
    errors.push({ field: 'password_confirm', message: 'Passwords do not match' });
  }
  if (values.role === 'farmer') {
    if (!values.business_name) errors.push({ field: 'business_name', message: 'Enter your farm business name' });
    if (!SBI_RE.test(values.sbi)) errors.push({ field: 'sbi', message: 'Enter your 9-digit Single Business Identifier (SBI)' });
  }
  if (values.role === 'officer' && values.invite_code !== auth.OFFICER_INVITE_CODE) {
    errors.push({ field: 'invite_code', message: 'Enter a valid case-officer invite code' });
  }
  if (!errors.length && db.get('SELECT id FROM users WHERE email = ?', values.email)) {
    errors.push({ field: 'email', message: 'An account with this email address already exists — sign in instead' });
  }

  if (errors.length) {
    return res.status(400).render('register.njk', { title: 'Create a SmartGrant account', values, errors });
  }

  const result = db.run(
    'INSERT INTO users (email, password_hash, full_name, role, sbi, business_name) VALUES (?, ?, ?, ?, ?, ?)',
    values.email,
    auth.hashPassword(req.body.password),
    values.full_name,
    values.role,
    values.role === 'farmer' ? values.sbi : null,
    values.role === 'farmer' ? values.business_name : 'Rural Payments Agency'
  );
  auth.createSession(res, result.lastInsertRowid);
  res.redirect(values.role === 'officer' ? '/casework' : '/dashboard');
});

router.get('/login', (req, res) => {
  if (req.user) return res.redirect(homeFor(req.user));
  res.render('login.njk', { title: 'Sign in', values: {}, errors: [], next: req.query.next || '' });
});

router.post('/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const next = typeof req.body.next === 'string' && req.body.next.startsWith('/') ? req.body.next : '';
  const user = email ? db.get('SELECT * FROM users WHERE email = ?', email) : null;

  if (!user || !auth.verifyPassword(req.body.password || '', user.password_hash)) {
    return res.status(401).render('login.njk', {
      title: 'Sign in',
      values: { email },
      errors: [{ field: 'email', message: 'Email address or password is not correct' }],
      next
    });
  }
  auth.createSession(res, user.id);
  res.redirect(next || homeFor(user));
});

router.post('/logout', (req, res) => {
  auth.destroySession(req, res);
  res.redirect('/');
});

module.exports = router;
