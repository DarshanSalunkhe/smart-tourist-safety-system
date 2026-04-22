// Analytics controller (CommonJS)
const { pool } = require('../db.js');
const { asyncHandler } = require('../middleware/errorHandler');

const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const { state, city } = req.query;
  const params = [];
  let whereClause = '';
  let i = 1;
  if (state && state !== 'all') { whereClause += ` AND state = $${i++}`; params.push(state); }
  if (city  && city  !== 'all') { whereClause += ` AND city = $${i++}`;  params.push(city);  }

  const [incidentStats, userStats] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) as total_incidents,
        COUNT(*) FILTER (WHERE status = 'resolved')    as resolved,
        COUNT(*) FILTER (WHERE status = 'new')         as new_incidents,
        COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress,
        COUNT(*) FILTER (WHERE type = 'sos')           as sos_count,
        COUNT(*) FILTER (WHERE severity = 'critical')  as critical_count,
        COUNT(*) FILTER (WHERE severity = 'high')      as high_count,
        COUNT(*) FILTER (WHERE severity = 'medium')    as medium_count,
        COUNT(*) FILTER (WHERE severity = 'low')       as low_count
      FROM incidents WHERE 1=1 ${whereClause}`, params),
    pool.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'tourist')   as tourists,
        COUNT(*) FILTER (WHERE role = 'authority') as authorities,
        COUNT(*) FILTER (WHERE role = 'admin')     as admins
      FROM users`)
  ]);

  res.json({ success: true, data: { incidents: incidentStats.rows[0], users: userStats.rows[0] } });
});

const getSeverityDistribution = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT severity, COUNT(*) as count FROM incidents
    GROUP BY severity
    ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END`);
  res.json({ success: true, data: result.rows });
});

const getMonthlyTrend = asyncHandler(async (req, res) => {
  const { months = 6 } = req.query;
  const result = await pool.query(`
    SELECT DATE_TRUNC('month', created_at) as month,
           COUNT(*) as incident_count,
           COUNT(*) FILTER (WHERE severity = 'critical') as critical_count
    FROM incidents
    WHERE created_at >= NOW() - INTERVAL '1 month' * $1
    GROUP BY month ORDER BY month DESC`, [months]);
  res.json({ success: true, data: result.rows });
});

const getTopRiskCities = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const result = await pool.query(`
    SELECT city, state, COUNT(*) as incident_count,
           COUNT(*) FILTER (WHERE severity = 'critical') as critical_count
    FROM incidents WHERE city IS NOT NULL
    GROUP BY city, state ORDER BY incident_count DESC LIMIT $1`, [limit]);
  res.json({ success: true, data: result.rows });
});

module.exports = { getAnalyticsOverview, getSeverityDistribution, getMonthlyTrend, getTopRiskCities };
