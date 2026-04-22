// Database helper utilities (CommonJS)

async function executeQuery(pool, query, params = []) {
  try {
    return await pool.query(query, params);
  } catch (error) {
    console.error('[DB Error]', error.message, '| Query:', query.substring(0, 100));
    throw error;
  }
}

module.exports = { executeQuery };
