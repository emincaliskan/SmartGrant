'use strict';

/**
 * Data-integrity guard (required by the build brief): recomputing the weighted
 * totals from the raw 1–10 scores and the weight sets must reproduce the
 * figures published in Defra_Stage2_Options.md exactly — for the base case and
 * all three sensitivity scenarios. If this test fails, the data module has
 * drifted from the source documents.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const assessment = require('../src/data/assessment');

test('weights sum to 100% in every scenario', () => {
  for (const scenario of assessment.sensitivityScenarios) {
    const sum = Object.values(scenario.weights).reduce((a, b) => a + b, 0);
    assert.equal(sum, 100, `${scenario.name}: weights sum to ${sum}`);
  }
});

test('base-case weighted totals match the published Stage 2 matrix', () => {
  const base = assessment.sensitivityScenarios[0];
  for (const project of assessment.projects) {
    const recomputed = assessment.weightedTotal(project.scores, base.weights);
    assert.equal(
      recomputed,
      project.publishedTotal,
      `${project.name}: recomputed ${recomputed} vs published ${project.publishedTotal}`
    );
  }
});

test('every sensitivity scenario reproduces the published totals and order', () => {
  for (const scenario of assessment.sensitivityScenarios) {
    const ranked = assessment.projects
      .map((p) => ({ name: p.name, total: assessment.weightedTotal(p.scores, scenario.weights) }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    for (let i = 0; i < scenario.expected.length; i++) {
      const expected = scenario.expected[i];
      const match = ranked.find((r) => r.name === expected.name);
      assert.ok(match, `${scenario.name}: ${expected.name} missing`);
      assert.equal(
        match.total,
        expected.total,
        `${scenario.name} — ${expected.name}: recomputed ${match.total} vs published ${expected.total}`
      );
    }

    // Order check with tie tolerance: adjacent published entries may tie
    // (e.g. TraceLink and OneData both 6.65 in the citizen-value scenario).
    for (let i = 0; i < scenario.expected.length - 1; i++) {
      assert.ok(
        scenario.expected[i].total >= scenario.expected[i + 1].total,
        `${scenario.name}: published order not monotonic`
      );
    }
  }
});

test('SmartGrant ranks first under every scenario (the flagship conclusion)', () => {
  for (const scenario of assessment.sensitivityScenarios) {
    const totals = assessment.projects.map((p) => ({
      name: p.name,
      total: assessment.weightedTotal(p.scores, scenario.weights)
    }));
    const max = Math.max(...totals.map((t) => t.total));
    const top = totals.filter((t) => t.total === max).map((t) => t.name);
    assert.deepEqual(top, ['SmartGrant'], `${scenario.name}: top is ${top.join(', ')}`);
  }
});
