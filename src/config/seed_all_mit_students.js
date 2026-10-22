const fs = require('fs');
const path = require('path');
const https = require('https');
const { db } = require('./db');

const DEPARTMENTS = [
  { name: 'Aerospace Engineering', url: 'https://departments.auegov.ac.in/aerospace/ugstudents' },
  { name: 'Automobile Engineering', url: 'https://departments.auegov.ac.in/auto/ugstudents' },
  { name: 'Electronics Engineering', url: 'https://departments.auegov.ac.in/elect/ugstudents' },
  { name: 'Instrumentation Engineering', url: 'https://departments.auegov.ac.in/instru/ugstudents' },
  { name: 'Production Technology', url: 'https://departments.auegov.ac.in/prod/ugstudents' },
  { name: 'Rubber and Plastics Technology', url: 'https://departments.auegov.ac.in/rpt/ugstudents' },
  { name: 'Information Technology', url: 'https://departments.auegov.ac.in/it/ugstudents' },
  { name: 'Computer Technology', url: 'https://departments.auegov.ac.in/ct/ugstudents' }
];

function fetchDepartmentHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false, timeout: 15000 }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function seedAllMitStudentsSync() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS official_mit_students (
      roll_no TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      semester INTEGER NOT NULL,
      degree TEXT NOT NULL,
      department TEXT NOT NULL
    );
  `);

  try {
    const existing = db.prepare('SELECT COUNT(*) as c FROM official_mit_students').get().c;
    if (existing > 0) return existing;
  } catch (e) {}

  const bundledPath = path.join(__dirname, '..', 'data', 'official_mit_students.json');
  if (fs.existsSync(bundledPath)) {
    try {
      console.log('[MIT Roster] Bundled roster found! Seeding official MIT students synchronously...');
      const list = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
      const insert = db.prepare(`
        INSERT OR REPLACE INTO official_mit_students (roll_no, name, year, semester, degree, department)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      db.exec('BEGIN');
      for (const s of list) {
        insert.run(s.roll_no, s.name, s.year, s.semester, s.degree, s.department);
      }
      db.exec('COMMIT');
      const loadedCount = db.prepare('SELECT COUNT(*) as c FROM official_mit_students').get().c;
      console.log(`[MIT Roster] ✓ Successfully seeded ${loadedCount} official MIT students synchronously from bundled dataset!`);
      return loadedCount;
    } catch (e) {
      console.error('[MIT Roster] Sync seed error:', e.message);
    }
  }
  return 0;
}

async function seedAllMitStudents() {
  console.log('[MIT Roster] Initializing official_mit_students database table...');
  const count = seedAllMitStudentsSync();
  if (count > 0) {
    return count;
  }

  // 2. ONLINE FALLBACK
  const insert = db.prepare(`
    INSERT OR REPLACE INTO official_mit_students (roll_no, name, year, semester, degree, department)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  let grandTotal = 0;
  for (const dept of DEPARTMENTS) {
    try {
      console.log(`[MIT Roster] Fetching ${dept.name} students from ${dept.url}...`);
      const html = await fetchDepartmentHtml(dept.url);
      const regex = /students-item\s+(filter-[a-z]+)[\s\S]*?<h5>(.*?)<\/h5>[\s\S]*?<h6>(\d+)<\/h6>[\s\S]*?<p>(.*?)<\/p>/g;
      let m;
      let count = 0;
      
      db.exec('BEGIN');
      while ((m = regex.exec(html)) !== null) {
        const filter = m[1];
        const name = m[2].trim();
        const rollNo = m[3].trim();
        const degree = m[4].trim();

        let year = 1;
        let semester = 1;
        if (filter === 'filter-four') { year = 4; semester = 7; }
        else if (filter === 'filter-three') { year = 3; semester = 5; }
        else if (filter === 'filter-two') { year = 2; semester = 3; }
        else if (filter === 'filter-one') { year = 1; semester = 1; }

        insert.run(rollNo, name, year, semester, degree, dept.name);
        count++;
      }
      db.exec('COMMIT');

      console.log(`[MIT Roster] ✓ ${dept.name}: ${count} official students ingested`);
      grandTotal += count;
    } catch (err) {
      console.error(`[MIT Roster] Error ingesting ${dept.name}:`, err.message);
    }
  }

  const verifiedCount = db.prepare('SELECT COUNT(*) as c FROM official_mit_students').get().c;
  console.log(`[MIT Roster] Complete! Total verified students in database: ${verifiedCount}`);
  return verifiedCount;
}

module.exports = { seedAllMitStudents, seedAllMitStudentsSync };

if (require.main === module) {
  seedAllMitStudents()
    .then(total => {
      console.log('Seeded total:', total);
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
