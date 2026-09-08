const express = require('express');
const db = require('../db');

const router = express.Router();

// Liveness: process is up and can respond.
router.get('/live', (req, res) => {
  res.json({ status: 'ok' });
});

// Readiness: process is up AND its dependencies (database) are reachable.
router.get('/ready', async (req, res) => {
  try {
    await db.healthCheck();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unreachable', detail: err.message });
  }
});

module.exports = router;
