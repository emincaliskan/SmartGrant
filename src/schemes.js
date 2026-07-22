'use strict';

/**
 * Scheme and action catalogue used by the prototype application journey.
 * The three scheme families come from the Stage 1 evidence base — applicants
 * "juggle SFI, Countryside Stewardship and capital grants across separate
 * systems". The individual actions and payment rates below are DEMONSTRATION
 * DATA ONLY [ILLUSTRATIVE] — they are not real scheme rates and must not be
 * relied on. Real deployment would source these from RPA scheme data.
 */

const schemes = [
  {
    code: 'SFI2026',
    name: 'Sustainable Farming Incentive (reformed, 2026)',
    description: 'Pays farmers to take up or maintain sustainable farming and land management practices.',
    actions: [
      { code: 'SOIL1', title: 'Assess soil and produce a soil management plan', ratePerHa: 6.15 },
      { code: 'HERB1', title: 'Establish and maintain herbal leys', ratePerHa: 382 },
      { code: 'BIRD1', title: 'Provide winter bird food on arable land', ratePerHa: 732 },
      { code: 'BUFF1', title: 'Maintain grass buffer strips next to watercourses', ratePerHa: 515 }
    ]
  },
  {
    code: 'CS',
    name: 'Countryside Stewardship',
    description: 'Funds environmental land management, habitat creation and woodland support.',
    actions: [
      { code: 'HEDG1', title: 'Manage and restore hedgerows', ratePerHa: 13 },
      { code: 'WOOD1', title: 'Woodland edges on arable land', ratePerHa: 428 },
      { code: 'POND1', title: 'Maintain ponds of wildlife value', ratePerHa: 257 }
    ]
  },
  {
    code: 'CAPITAL',
    name: 'Capital Grants',
    description: 'One-off capital items supporting environmental outcomes, such as fencing and water infrastructure.',
    actions: [
      { code: 'FENC1', title: 'Stock fencing to protect habitat', ratePerHa: 1240 },
      { code: 'WATR1', title: 'Livestock drinking water infrastructure', ratePerHa: 890 }
    ]
  }
];

function getScheme(code) {
  return schemes.find((s) => s.code === code) || null;
}

function getAction(schemeCode, actionCode) {
  const scheme = getScheme(schemeCode);
  if (!scheme) return null;
  return scheme.actions.find((a) => a.code === actionCode) || null;
}

module.exports = { schemes, getScheme, getAction };
