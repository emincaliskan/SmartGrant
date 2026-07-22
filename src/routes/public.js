'use strict';

const express = require('express');
const assessment = require('../data/assessment');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('index.njk', {
    title: 'Apply for and manage farming grants',
    concept: assessment.concept,
    gap: assessment.gapG1
  });
});

router.get('/about', (req, res) => {
  const rows = assessment.projects
    .map((p) => ({
      name: p.name,
      scores: p.scores,
      total: assessment.weightedTotal(p.scores, assessment.sensitivityScenarios[0].weights),
      publishedTotal: p.publishedTotal,
      rank: p.publishedRank
    }))
    .sort((a, b) => a.rank - b.rank);

  res.render('about.njk', {
    title: 'The evidence behind SmartGrant',
    concept: assessment.concept,
    gap: assessment.gapG1,
    stage1: assessment.stage1Evidence,
    criteria: assessment.criteria,
    scoreRows: rows,
    scenarios: assessment.sensitivityScenarios,
    recommendation: assessment.recommendation,
    roadmap: assessment.roadmapSmartGrant
  });
});

router.get('/accessibility', (req, res) => {
  res.render('accessibility.njk', { title: 'Accessibility statement' });
});

module.exports = router;
