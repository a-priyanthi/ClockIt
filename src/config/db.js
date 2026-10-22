const fs = require('fs');
const path = require('path');
const config = require('./index');
const { createFallbackDatabase } = require('./sqliteFallback');

let db = null;

// Attempt to use built-in node:sqlite if available and supported
try {
  const { DatabaseSync } = require('node:sqlite');
  const dbDir = path.dirname(config.DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new DatabaseSync(config.DB_PATH);
  console.log(`[Database] Initialized with native node:sqlite (${config.DB_PATH})`);
} catch (err) {
  console.warn(`[Database] Native node:sqlite not available (${err.message}). Activating resilient embedded database engine.`);
  const fallbackStoragePath = path.join(
    path.dirname(config.DB_PATH),
    'clockit_data.json'
  );
  db = createFallbackDatabase(fallbackStoragePath);
}

/**
 * Initialize all database tables and indexes
 */
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      lead_name TEXT NOT NULL,
      user_count INTEGER DEFAULT 4,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT,
      title TEXT,
      bio TEXT,
      skills TEXT,
      learning_style TEXT,
      status TEXT DEFAULT 'active',
      is_lead INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      member_count INTEGER DEFAULT 4,
      progress INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      sprint_num INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      member_name TEXT NOT NULL,
      member_role TEXT,
      start_time TEXT,
      deadline_time TEXT,
      deadline_day TEXT,
      done_when TEXT,
      completed_at TEXT,
      status TEXT DEFAULT 'pending',
      is_before_deadline INTEGER DEFAULT 0,
      est_hours REAL DEFAULT 1.5,
      act_hours REAL DEFAULT 1.5,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      user_name TEXT NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT,
      original_name TEXT,
      filesize TEXT,
      is_folder INTEGER DEFAULT 0,
      is_shared INTEGER DEFAULT 0,
      upload_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      from_name TEXT NOT NULL,
      to_name TEXT NOT NULL,
      item TEXT NOT NULL,
      reason TEXT,
      type TEXT DEFAULT 'work',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      sender_name TEXT NOT NULL,
      sender_type TEXT NOT NULL,
      message TEXT NOT NULL,
      mode TEXT DEFAULT 'all',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sprint_meta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      sprint_num INTEGER DEFAULT 1,
      status TEXT DEFAULT 'published',
      goal TEXT,
      total_est_hours REAL DEFAULT 57,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      replan_reason TEXT
    );

    /* =====================================================================
       ClockIt Database Schema (Full-Stack Student Workspace)
       ===================================================================== */
    CREATE TABLE IF NOT EXISTS academic_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      department TEXT DEFAULT 'Computer Technology',
      programme TEXT DEFAULT 'B.Tech Information Technology',
      semester TEXT DEFAULT '4',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academic_calendar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academic_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      place TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academic_event_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS academic_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      units INTEGER DEFAULT 5,
      lecture_hours INTEGER DEFAULT 45,
      practical_hours INTEGER DEFAULT 60,
      credits INTEGER DEFAULT 5,
      progress INTEGER DEFAULT 0,
      attended INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      syllabus_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academic_attendance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      subject_code TEXT NOT NULL,
      status TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academic_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      subject TEXT NOT NULL,
      assessment TEXT NOT NULL,
      score REAL NOT NULL,
      outof REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academic_journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      mood TEXT DEFAULT '🙂',
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academic_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      detail TEXT,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS official_mit_students (
      roll_no TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      semester INTEGER NOT NULL,
      degree TEXT NOT NULL,
      department TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS official_curriculum (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department TEXT NOT NULL,
      programme TEXT NOT NULL,
      semester INTEGER NOT NULL,
      course_code TEXT NOT NULL,
      course_name TEXT NOT NULL,
      course_type TEXT,
      lecture_hours INTEGER DEFAULT 45,
      practical_hours INTEGER DEFAULT 60,
      credits INTEGER DEFAULT 3,
      category TEXT,
      syllabus_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(department, semester, course_code)
    );
  `);

  // Safe schema migrations for existing databases
  try { db.exec("ALTER TABLE tasks ADD COLUMN done_when TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE tasks ADD COLUMN deadline_day TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE sprint_meta ADD COLUMN goal TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE sprint_meta ADD COLUMN total_est_hours REAL DEFAULT 57;"); } catch (e) {}
}

module.exports = {
  db,
  initDatabase
};
