const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.post('/', async (req, res) => {
  const { incidentId, audioUrl } = req.body;

  if (!incidentId || !audioUrl) {
    return res.status(400).json({ error: 'incidentId and audioUrl are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO voice_logs (incident_id, audio_url) VALUES ($1, $2) RETURNING *`,
      [incidentId, audioUrl]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[VoiceLogs] Error saving voice log:', error);
    res.status(500).json({ error: 'Failed to save voice log' });
  }
});

module.exports = router;
