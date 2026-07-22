'use strict';

process.env.SMARTGRANT_DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { seed } = require('../src/seed');

let server;
let base;

function cookieFrom(res) {
  const raw = res.headers.get('set-cookie') || '';
  return raw.split(';')[0];
}

test.before(async () => {
  seed({ quiet: true });
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server && server.close());

test('start page renders with GOV.UK-style content and no auth', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('Apply for and manage farming grants'));
  assert.ok(html.includes('Skip to main content'));
});

test('evidence page renders the published weighted totals', async () => {
  const res = await fetch(base + '/about');
  const html = await res.text();
  assert.ok(html.includes('8.00'));
  assert.ok(html.includes('7.80'));
  assert.ok(html.includes('6.55'));
  assert.ok(html.includes('Sensitivity analysis'));
});

test('protected pages redirect anonymous users to sign in', async () => {
  const res = await fetch(base + '/dashboard', { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.ok(res.headers.get('location').startsWith('/login'));
});

test('registration validation rejects bad input with an error summary', async () => {
  const res = await fetch(base + '/register', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'full_name=&email=bad&role=farmer&password=short&password_confirm=short'
  });
  assert.equal(res.status, 400);
  const html = await res.text();
  assert.ok(html.includes('There is a problem'));
});

test('full journey: register farmer → apply → officer reviews and approves', async () => {
  // Register a new farmer
  const reg = await fetch(base + '/register', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      full_name: 'Jess Field',
      email: 'jess@example.com',
      role: 'farmer',
      business_name: 'Field Farm',
      sbi: '987654321',
      password: 'Password1!',
      password_confirm: 'Password1!'
    }).toString()
  });
  assert.equal(reg.status, 302);
  const farmerCookie = cookieFrom(reg);
  assert.ok(farmerCookie.startsWith('sg_session='));

  // Fetch apply page to obtain CSRF token
  const applyPage = await fetch(base + '/apply', { headers: { cookie: farmerCookie } });
  const applyHtml = await applyPage.text();
  const csrf = applyHtml.match(/name="_csrf" value="([^"]+)"/)[1];

  // Submit an application that over-claims (12.4 ha parcel, claim 20 ha)
  const submit = await fetch(base + '/apply', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: farmerCookie },
    body: new URLSearchParams({
      _csrf: csrf,
      scheme: 'SFI2026',
      action: 'HERB1',
      parcel_ref: 'SK1234 5678',
      claimed_area: '20',
      notes: 'Test claim'
    }).toString()
  });
  assert.equal(submit.status, 302);
  const appUrl = submit.headers.get('location');
  assert.ok(/^\/applications\/\d+/.test(appUrl));
  const appId = appUrl.match(/\/applications\/(\d+)/)[1];

  // Farmer sees mapping validation failure explained
  const detail = await fetch(base + appUrl, { headers: { cookie: farmerCookie } });
  const detailHtml = await detail.text();
  assert.ok(detailHtml.includes('exceeds the registered area'));

  // Officer signs in
  const login = await fetch(base + '/login', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'officer@rpa.demo', password: 'OfficerDemo1' }).toString()
  });
  assert.equal(login.status, 302);
  const officerCookie = cookieFrom(login);

  // Officer sees the case in the queue with a High priority triage
  const queue = await fetch(base + '/casework?band=High', { headers: { cookie: officerCookie } });
  const queueHtml = await queue.text();
  assert.ok(queueHtml.includes('Field Farm'));

  // Officer cannot approve without a written rationale
  const casePage = await fetch(base + `/casework/${appId}`, { headers: { cookie: officerCookie } });
  const officerCsrf = (await casePage.text()).match(/name="_csrf" value="([^"]+)"/)[1];
  const noNote = await fetch(base + `/casework/${appId}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: officerCookie },
    body: new URLSearchParams({ _csrf: officerCsrf, decision: 'approve', note: '' }).toString()
  });
  assert.equal(noNote.status, 400);

  // Approve with a rationale
  const approve = await fetch(base + `/casework/${appId}/decision`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: officerCookie },
    body: new URLSearchParams({
      _csrf: officerCsrf,
      decision: 'approve',
      note: 'Boundary evidence provided by applicant resolves the area query.'
    }).toString()
  });
  assert.equal(approve.status, 302);

  // Farmer sees the approval and the officer's written reason
  const after = await fetch(base + appUrl, { headers: { cookie: farmerCookie } });
  const afterHtml = await after.text();
  assert.ok(afterHtml.includes('Approved'));
  assert.ok(afterHtml.includes('Boundary evidence provided'));

  // Officer role separation: farmer cannot open casework
  const forbidden = await fetch(base + '/casework', { headers: { cookie: farmerCookie } });
  assert.equal(forbidden.status, 403);
});
