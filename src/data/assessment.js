'use strict';

/**
 * Structured snapshot of the Stage 1 and Stage 2 assessment content that
 * relates to SmartGrant (Concept 1). Every figure, score and claim in this
 * module is transcribed VERBATIM from:
 *   - Defra_Stage1_Evidence_Base.md   (Stage 1 — Evidence, 22 July 2026)
 *   - Defra_Stage2_Options.md         (Stage 2 — Options)
 * Do not edit numbers here without re-checking them against those files.
 * The UI renders from this module only — no facts are hard-coded in views.
 */

const gapG1 = {
  id: 'G1',
  gap: 'Accurate, timely grant/payment delivery',
  userGroup: 'Farmers, land managers',
  currentService: 'RPA schemes (SFI, CS, delinked)',
  currentCapability: 'Legacy systems; error-prone mapping; manual checks',
  evidenceOfNeed: 'Decade of NAO/EFRA criticism; SFI trust damage',
  severity: 'High',
  strategicImportance: 'High (rural trust, productivity, growth)',
  horizon: 'Short–Medium',
  rank: 1,
  rankNote: 'G1 — Grant/payment delivery (acute, political, growth-linked, data-ready)'
};

const stage1Evidence = {
  asAt: '22 July 2026',
  keyFacts: [
    'The Spending Review ring-fenced roughly £300m for digital modernisation, explicitly including RPA systems, "with AI expected to streamline grant delivery".',
    'At least 5% efficiency savings by 2028–29 and a 15% cut in civil-service running costs by 2029 are mandated.',
    'The Sustainable Farming Incentive closed abruptly on 11 March 2025 ("a punch in the stomach" — farmer testimony) and had a troubled 2026 relaunch, damaging farmer trust.',
    '25% of SFI funding went to just 4% of farms — a distributional problem the reformed scheme is trying to fix.',
    'RPA has a decade-long record of payment delays, mapping errors and poor complaints handling; 3,000+ farmers were unpaid by March 2018.',
    'Applicants juggle SFI, Countryside Stewardship and capital grants across separate systems and spreadsheets.',
    'A four-year, ~£150m application-development contract (ADMS Plus, Kainos, 2026) was signed explicitly to accelerate AI-enabled delivery and retire legacy systems.',
    'The AI Opportunities Action Plan (13 January 2025) mandates a "Scan → Pilot → Scale" approach across government.'
  ]
};

const concept = {
  id: 'smartgrant',
  name: 'SmartGrant',
  strapline: 'AI-assisted grant administration and mapping',
  gapRef: 'Gap G1 · Farming',
  problemStatement:
    'RPA scheme delivery has a decade-long record of payment delays, mapping errors and poor ' +
    'complaints handling, and the 2025 SFI closure and troubled 2026 relaunch damaged farmer ' +
    'trust. Applicants juggle SFI, Countryside Stewardship and capital grants across separate ' +
    'systems, and eligibility/mapping checks are heavily manual and error-prone.',
  strategicObjective:
    'Cut payment delays and error rework, rebuild trust with farmers, and make scheme delivery ' +
    'resilient to future policy changes — delivering directly on the government’s stated intent ' +
    'to use AI to streamline grant delivery.',
  users: {
    primary: 'Farmers and land managers; RPA case officers and mapping teams.',
    secondary: 'Defra farming-policy teams; agents and advisers who submit on farmers’ behalf.'
  },
  technology:
    'Computer vision on EODS/aerial imagery to pre-validate land parcels and detect land-use ' +
    'change; predictive models to flag high-risk claims for review; a generative-AI assistant ' +
    'to guide applicants in plain English and draft officer responses; agentic reconciliation ' +
    'across scheme systems with human sign-off on every payment decision.',
  data: 'RPA scheme and payment data, the Land Parcel Identification System, EODS imagery.',
  benefits: [
    { area: 'Citizen/user', benefit: 'Faster, more predictable payments and less application burden.' },
    { area: 'Environmental', benefit: 'Better-targeted environmental schemes and change detection.' },
    { area: 'Productivity', benefit: 'Fewer manual checks and less rework in RPA.' },
    { area: 'Economic', benefit: 'Improved farm cash-flow stability.' }
  ],
  delivery: [
    { horizon: 'MVP', item: 'An AI mapping-validation and claim-risk-triage tool for one scheme, with an applicant guidance assistant.' },
    { horizon: '12 months', item: 'MVP live for the reformed SFI; measurable reduction in mapping queries.' },
    { horizon: '3 years', item: 'Extended across all major schemes with agentic cross-system reconciliation.' },
    { horizon: '5 years', item: 'A policy-agnostic grant platform that absorbs scheme changes without re-engineering.' }
  ],
  risks: [
    { type: 'Delivery', risk: 'RPA’s history of IT failure', mitigation: 'Narrow MVP scope, Scan-Pilot-Scale discipline, and reuse of the new ADMS delivery contract.' },
    { type: 'Data', risk: 'Mapping-data quality', mitigation: 'EO cross-checks and human review.' },
    { type: 'Ethical/security', risk: 'Automated decisions affecting livelihoods', mitigation: 'Mandatory human-in-the-loop and an audit trail.' },
    { type: 'Assurance', risk: 'AI assurance in a statutory context', mitigation: 'Apply the government’s data-ethics and Generative-AI frameworks.' }
  ],
  successMeasures: [
    '% payments on time',
    'Mapping-error and rework rates',
    'Complaint volumes',
    'Applicant-satisfaction scores',
    'Officer hours saved per claim'
  ]
};

// Phase 7 weighted scoring matrix — weights in percent, scores 1–10 (higher is better;
// Delivery Risk scored inversely as Delivery Confidence).
const criteria = [
  { key: 'strategicAlignment', label: 'Strategic Alignment', weight: 20 },
  { key: 'publicValue', label: 'Public Value', weight: 15 },
  { key: 'operationalEfficiency', label: 'Operational Efficiency', weight: 15 },
  { key: 'feasibility', label: 'Feasibility', weight: 15 },
  { key: 'innovation', label: 'Innovation & AI Potential', weight: 10 },
  { key: 'dataReadiness', label: 'Data Readiness', weight: 10 },
  { key: 'environmentalImpact', label: 'Environmental Impact', weight: 10 },
  { key: 'deliveryConfidence', label: 'Delivery Confidence', weight: 5 }
];

const projects = [
  {
    name: 'SmartGrant',
    scores: { strategicAlignment: 9, publicValue: 8, operationalEfficiency: 9, feasibility: 8, innovation: 7, dataReadiness: 8, environmentalImpact: 6, deliveryConfidence: 7 },
    publishedTotal: 8.0,
    publishedRank: 1
  },
  {
    name: 'FloodSight',
    scores: { strategicAlignment: 8, publicValue: 9, operationalEfficiency: 8, feasibility: 7, innovation: 8, dataReadiness: 7, environmentalImpact: 8, deliveryConfidence: 6 },
    publishedTotal: 7.8,
    publishedRank: 2
  },
  {
    name: 'TraceLink',
    scores: { strategicAlignment: 8, publicValue: 8, operationalEfficiency: 6, feasibility: 5, innovation: 8, dataReadiness: 5, environmentalImpact: 6, deliveryConfidence: 4 },
    publishedTotal: 6.55,
    publishedRank: 5
  },
  {
    name: 'OneData',
    scores: { strategicAlignment: 8, publicValue: 6, operationalEfficiency: 9, feasibility: 6, innovation: 7, dataReadiness: 6, environmentalImpact: 5, deliveryConfidence: 5 },
    publishedTotal: 6.8,
    publishedRank: 4
  },
  {
    name: 'ClearWater',
    scores: { strategicAlignment: 8, publicValue: 9, operationalEfficiency: 5, feasibility: 8, innovation: 6, dataReadiness: 9, environmentalImpact: 8, deliveryConfidence: 8 },
    publishedTotal: 7.6,
    publishedRank: 3
  }
];

// Phase 7 sensitivity analysis — published expected results, used by the
// data-integrity test to confirm recomputation matches the source exactly.
const sensitivityScenarios = [
  {
    name: 'Base case',
    weights: { strategicAlignment: 20, publicValue: 15, operationalEfficiency: 15, feasibility: 15, innovation: 10, dataReadiness: 10, environmentalImpact: 10, deliveryConfidence: 5 },
    expected: [
      { name: 'SmartGrant', total: 8.0 },
      { name: 'FloodSight', total: 7.8 },
      { name: 'ClearWater', total: 7.6 },
      { name: 'OneData', total: 6.8 },
      { name: 'TraceLink', total: 6.55 }
    ]
  },
  {
    name: 'Alignment-first (Strat 25%, OpEff 10%)',
    weights: { strategicAlignment: 25, publicValue: 15, operationalEfficiency: 10, feasibility: 15, innovation: 10, dataReadiness: 10, environmentalImpact: 10, deliveryConfidence: 5 },
    expected: [
      { name: 'SmartGrant', total: 8.0 },
      { name: 'FloodSight', total: 7.8 },
      { name: 'ClearWater', total: 7.75 },
      { name: 'OneData', total: 6.75 },
      { name: 'TraceLink', total: 6.65 }
    ]
  },
  {
    name: 'Citizen-value-first (PV 20%, OpEff 10%)',
    weights: { strategicAlignment: 20, publicValue: 20, operationalEfficiency: 10, feasibility: 15, innovation: 10, dataReadiness: 10, environmentalImpact: 10, deliveryConfidence: 5 },
    expected: [
      { name: 'SmartGrant', total: 7.95 },
      { name: 'FloodSight', total: 7.85 },
      { name: 'ClearWater', total: 7.8 },
      { name: 'TraceLink', total: 6.65 },
      { name: 'OneData', total: 6.65 }
    ]
  },
  {
    name: 'Efficiency-first (OpEff 20%, Strat 15%)',
    weights: { strategicAlignment: 15, publicValue: 15, operationalEfficiency: 20, feasibility: 15, innovation: 10, dataReadiness: 10, environmentalImpact: 10, deliveryConfidence: 5 },
    expected: [
      { name: 'SmartGrant', total: 8.0 },
      { name: 'FloodSight', total: 7.8 },
      { name: 'ClearWater', total: 7.45 },
      { name: 'OneData', total: 6.85 },
      { name: 'TraceLink', total: 6.45 }
    ]
  }
];

const recommendation = {
  flagship: 'SmartGrant',
  why:
    'SmartGrant ranks first under every sensitivity scenario, and the evidence behind it is the ' +
    'strongest in the assessment: the top-ranked gap (G1), a decade of documented failure ' +
    'creating clear need, data that already exists, a delivery contract already in place, and an ' +
    'explicit national steer to use AI for grant delivery.',
  caveat:
    'RPA’s IT track record is the single biggest delivery risk in the portfolio. That argues ' +
    'not against the choice but for how it’s run — a narrow, well-scoped MVP on one scheme, ' +
    'Scan-Pilot-Scale discipline, human-in-the-loop on every payment decision, and reuse of ' +
    'existing delivery vehicles rather than a big-bang build.'
};

const roadmapSmartGrant = [
  { horizon: '0–12 months', item: 'MVP on reformed SFI (mapping validation + risk triage + applicant assistant)' },
  { horizon: 'Year 2–3', item: 'Scale to all major schemes; agentic cross-system reconciliation' },
  { horizon: 'Year 4–5', item: 'Policy-agnostic grant platform' }
];

/**
 * Recompute a project's weighted total from raw scores and a weight set
 * (weights in percent). Rounded to 2 d.p. — the precision published in Stage 2.
 */
function weightedTotal(scores, weights) {
  let total = 0;
  for (const c of criteria) {
    total += (weights[c.key] / 100) * scores[c.key];
  }
  return Math.round(total * 100) / 100;
}

module.exports = {
  gapG1,
  stage1Evidence,
  concept,
  criteria,
  projects,
  sensitivityScenarios,
  recommendation,
  roadmapSmartGrant,
  weightedTotal
};
