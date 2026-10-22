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
    } catch (err) {
      console.warn('Vercel serverless database initialization notice:', err.message);
    }
    isInitialized = true;
  }
}

function normalizeRequestUrl(req) {
  let targetPath = null;

  // 1. Check if rewrite added ?path=... or &path=...
  if (req.url && (req.url.includes('path=') || req.url.includes('?path='))) {
    try {
      const u = new URL(req.url, 'http://localhost');
      targetPath = u.searchParams.get('path');
      u.searchParams.delete('path');
      const cleanSearch = u.search ? u.search : '';
      if (targetPath) {
        req.url = '/api/' + targetPath.replace(/^\//, '') + cleanSearch;
        req.originalUrl = req.url;
        return;
      }
    } catch (e) {}
  }

  // 2. Check Vercel routing headers
  const orig = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-original-url'] || req.headers['x-vercel-matched-path'];
  if (orig && orig !== '/api' && orig !== '/api/' && orig !== '/api/index.js' && orig.startsWith('/api/')) {
    const qIdx = req.url.indexOf('?');
    const qPart = (qIdx !== -1 && !orig.includes('?')) ? req.url.slice(qIdx) : '';
    req.url = orig + qPart;
    req.originalUrl = req.url;
  }
}

// Export serverless handler for Vercel
module.exports = (req, res) => {
  ensureInitialized();
  normalizeRequestUrl(req);
  return app(req, res);
};
