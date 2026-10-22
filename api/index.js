const app = require('../src/app');
const { initDatabase } = require('../src/config/db');
const { seedDatabase, seedAcademicClock } = require('../src/config/seed');
const { seedAllMitStudentsSync } = require('../src/config/seed_all_mit_students');
const { seedAllMitCurriculaSync } = require('../src/config/seed_all_mit_curricula');

let isInitialized = false;

function ensureInitialized() {
  if (!isInitialized) {
    try {
      initDatabase();
      seedDatabase();
      seedAcademicClock();
      seedAllMitStudentsSync();
      seedAllMitCurriculaSync();
      isInitialized = true;
    } catch (err) {
      console.error('Vercel serverless database initialization error:', err);
      throw err;
    }
  }
}

// Export serverless handler for Vercel
module.exports = (req, res) => {
  ensureInitialized();

  // Restore original request path if modified by Vercel internal rewrites
  const orig = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-original-url'];
  if (orig && (req.url === '/api' || req.url === '/api/index.js' || req.url === '/' || req.url === '/api/index' || req.url.startsWith('/api/index.js?') || req.url.startsWith('/api?'))) {
    const qIdx = req.url.indexOf('?');
    req.url = (qIdx !== -1 && !orig.includes('?')) ? orig + req.url.slice(qIdx) : orig;
  }

  return app(req, res);
};
