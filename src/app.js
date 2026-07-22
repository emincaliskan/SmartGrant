'use strict';

const path = require('node:path');
const express = require('express');
const nunjucks = require('nunjucks');

const db = require('./db');
const auth = require('./auth');
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const farmerRoutes = require('./routes/farmer');
const officerRoutes = require('./routes/officer');

function createApp() {
  db.connect();

  const app = express();
  app.disable('x-powered-by');

  const env = nunjucks.configure(path.join(__dirname, 'views'), {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV !== 'production'
  });
  env.addFilter('date', (iso) => {
    if (!iso) return '—';
    const d = new Date(iso.includes('T') || iso.includes(' ') ? iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z') : iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  });
  env.addFilter('money', (n) => {
    const v = Number(n) || 0;
    return '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });
  env.addFilter('fixed2', (n) => (Number(n) || 0).toFixed(2));
  env.addFilter('fromjson', (s) => {
    try { return JSON.parse(s); } catch { return null; }
  });
  app.set('view engine', 'njk');

  app.use(express.urlencoded({ extended: false }));
  app.use('/assets', express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
  app.use(auth.sessionMiddleware);
  app.use(auth.csrfProtect);

  app.use(publicRoutes);
  app.use(authRoutes);
  app.use(farmerRoutes);
  app.use(officerRoutes);

  app.use((req, res) => {
    res.status(404).render('error.njk', {
      title: 'Page not found',
      message: 'If you typed the web address, check it is correct. If you pasted it, check you copied the entire address.'
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error.njk', {
      title: 'Sorry, there is a problem with the service',
      message: 'Try again later.'
    });
  });

  return app;
}

module.exports = { createApp };
