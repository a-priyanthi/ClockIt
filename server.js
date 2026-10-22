const app = require('./src/app');
const config = require('./src/config');
const { initDatabase } = require('./src/config/db');
const { seedDatabase, seedAcademicClock } = require('./src/config/seed');
const { seedAllMitStudents } = require('./src/config/seed_all_mit_students');
const { seedAllMitCurricula } = require('./src/config/seed_all_mit_curricula');

// Initialize database schema and seed defaults
initDatabase();
seedDatabase();
seedAcademicClock();
seedAllMitStudents().catch(e => console.error('[MIT Roster Init Error]:', e.message));
seedAllMitCurricula().catch(e => console.error('[MIT Curricula Init Error]:', e.message));

// Start Express Server
const server = app.listen(config.PORT, () => {
  console.log(`=================================================`);
  console.log(`⚡ Thryve Full-Stack Backend Server`);
  console.log(`⚡ URL: http://localhost:${config.PORT}`);
  console.log(`⚡ Environment: ${config.NODE_ENV}`);
  console.log(`⚡ Database: ${config.DB_PATH}`);
  console.log(`⚡ Uploads: ${config.UPLOAD_DIR}`);
  console.log(`=================================================`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
