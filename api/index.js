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
  return app(req, res);
};
