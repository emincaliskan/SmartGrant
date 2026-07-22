'use strict';

const { createApp } = require('./src/app');
const { seed } = require('./src/seed');

// First-run convenience: make sure the demo accounts and parcel register exist.
seed({ quiet: true });

const port = process.env.PORT || 3000;
createApp().listen(port, () => {
  console.log(`SmartGrant prototype running at http://localhost:${port}`);
  console.log('Demo sign-ins — officer: officer@rpa.demo / OfficerDemo1 · farmer: farmer@farm.demo / FarmerDemo1');
});
