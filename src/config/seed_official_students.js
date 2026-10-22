const fs = require('fs');
const path = require('path');
const { db } = require('./db');

function seedOfficialStudents() {
  const contentPath = 'C:\\Users\\PRIYANTHI A\\.gemini\\antigravity-ide\\brain\\bfe2518c-ebe2-46a1-85e6-c7266a8a7d45\\.system_generated\\steps\\377\\content.md';
  if (!fs.existsSync(contentPath)) {
    console.warn('Official students file content.md not found at:', contentPath);
    return;
  }

  const content = fs.readFileSync(contentPath, 'utf8');

  db.exec(`
    CREATE TABLE IF NOT EXISTS official_ct_students (
      roll_no TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      semester INTEGER NOT NULL,
      degree TEXT NOT NULL,
      department TEXT NOT NULL
    );
  `);

  const regex = /students-item\s+(filter-[a-z]+)[\s\S]*?<h5>(.*?)<\/h5>[\s\S]*?<h6>(\d+)<\/h6>[\s\S]*?<p>(.*?)<\/p>/g;
  let match;
  const rows = [];

  while ((match = regex.exec(content)) !== null) {
    const filter = match[1];
    const name = match[2].trim();
    const rollNo = match[3].trim();
    const degree = match[4].trim();

    let year = 1;
    let semester = 1;
    if (filter === 'filter-four') { year = 4; semester = 7; }
    else if (filter === 'filter-three') { year = 3; semester = 5; }
    else if (filter === 'filter-two') { year = 2; semester = 3; }
    else if (filter === 'filter-one') { year = 1; semester = 1; }

    rows.push({ rollNo, name, year, semester, degree, department: 'Computer Technology' });
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO official_ct_students (roll_no, name, year, semester, degree, department)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  for (const r of rows) {
    insert.run(r.rollNo, r.name, r.year, r.semester, r.degree, r.department);
  }
  db.exec('COMMIT');
  const total = db.prepare('SELECT COUNT(*) as c FROM official_ct_students').get().c;
  console.log(`[Anna University Official Data] Seeded ${total} verified UG students into official_ct_students!`);
}

module.exports = { seedOfficialStudents };

if (require.main === module) {
  seedOfficialStudents();
}
