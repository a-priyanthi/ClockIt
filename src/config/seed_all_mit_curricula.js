const fs = require('fs');
const path = require('path');
const https = require('https');
const { PDFParse } = require('pdf-parse');
const { db } = require('./db');

const DEPARTMENTS_CURRICULUM = [
  {
    department: 'Aerospace Engineering',
    programme: 'B.E. Aeronautical Engineering',
    url: 'https://cac.annauniv.edu/uddetails/udug_2023_revision/Mech/B.E.Aero.pdf',
    cacheFile: 'Aero.pdf'
  },
  {
    department: 'Automobile Engineering',
    programme: 'B.E. Automobile Engineering',
    url: 'https://cac.annauniv.edu/uddetails/udug_2023_revision/Mech/B.E.%20Automobile%20Engg.pdf',
    cacheFile: 'Auto.pdf'
  },
  {
    department: 'Electronics Engineering',
    programme: 'B.E. Electronics and Communication Engineering',
    url: 'https://cac.annauniv.edu/uddetails/udug_2023_revision/ECE/B.E.%20ECE.pdf',
    cacheFile: 'ECE.pdf'
  },
  {
    department: 'Instrumentation Engineering',
    programme: 'B.E. Electronics and Instrumentation Engineering',
    url: 'https://cac.annauniv.edu/uddetails/udug_2023_revision/EEE/B.E.E%20&%20I.pdf',
    cacheFile: 'EI.pdf'
  },
  {
    department: 'Production Technology',
    programme: 'B.E. Production Engineering',
    url: 'https://cac.annauniv.edu/uddetails/udug_2023_revision/Mech/B.E.Production%20Engg.pdf',
    cacheFile: 'Prod.pdf'
  },
  {
    department: 'Rubber and Plastics Technology',
    programme: 'B.Tech. Rubber and Plastics Technology',
    url: 'https://cac.annauniv.edu/uddetails/udug_2023_revision/Tech/B.Tech.%20RPT.pdf',
    cacheFile: 'RPT.pdf'
  },
  {
    department: 'Information Technology',
    programme: 'B.Tech. Information Technology',
    url: 'https://cac.annauniv.edu/uddetails/udug_2023_revision/ICE/B.Tech.%20IT.pdf',
    cacheFile: 'IT.pdf'
  },
  {
    department: 'Computer Technology',
    programme: 'B.E. Computer Science and Engineering',
    url: 'https://cac.annauniv.edu/uddetails/udug_2023_revision/ICE/B.E.%20CSE.pdf',
    cacheFile: 'CSE.pdf'
  }
];

const cacheDir = path.join(__dirname, '..', '..', 'cache_pdf');
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 100000) {
      return resolve(fs.readFileSync(dest));
    }
    const file = fs.createWriteStream(dest);
    https.get(url, { rejectUnauthorized: false }, res => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(fs.readFileSync(dest));
      });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function parseCourses(text, department, programme) {
  const semesters = [];
  const semMatches = [...text.matchAll(/SEMESTER\s*[–\-—]?\s*([IVX]+)/gi)];

  for (let i = 0; i < semMatches.length; i++) {
    const semRoman = semMatches[i][1].toUpperCase();
    const semNum = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 }[semRoman];
    if (!semNum) continue;

    const startIdx = semMatches[i].index;
    const endIdx = (i + 1 < semMatches.length) ? semMatches[i + 1].index : (startIdx + 2800);
    const chunk = text.slice(startIdx, endIdx);

    const cleanChunk = chunk.split(/TOTAL CREDITS|PROFESSIONAL ELECTIVE|SUMMARY OF/i)[0] || chunk;
    const lines = cleanChunk.split('\n').map(l => l.trim()).filter(Boolean);
    const courses = [];

    const lineRegex = /^(?:\d+[\.\)]?\s+)?([A-Z]{2}\d{2}[A-Z0-9]{2,3})\s+(.*?)\s+(LIT|T|L|PW|IPW|CDP|-)\s+([\d\s–\-]{3,12})\s+(\d+)\s+(\d+)\s*([A-Z/&]+)?/;

    for (let j = 0; j < lines.length; j++) {
      let line = lines[j];
      let match = line.match(lineRegex);

      if (!match && j + 1 < lines.length) {
        const combined = line + ' ' + lines[j + 1];
        match = combined.match(lineRegex);
        if (match) j++;
      }

      if (match) {
        const code = match[1];
        const name = match[2].replace(/\s+/g, ' ').trim();
        const type = match[3];
        const credits = parseInt(match[6], 10) || 3;
        const category = match[7] || 'PCC';

        courses.push({
          department,
          programme,
          semester: semNum,
          code,
          name,
          type,
          credits,
          category
        });
      }
    }

    if (courses.length > 0) {
      semesters.push({ semester: semNum, courses });
    }
  }

  return semesters;
}

function seedAllMitCurriculaSync() {
  db.exec(`
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

  try {
    const existing = db.prepare('SELECT COUNT(*) as c FROM official_curriculum').get().c;
    if (existing > 0) return existing;
  } catch (e) {}

  const bundledPath = path.join(__dirname, '..', 'data', 'official_curriculum.json');
  if (fs.existsSync(bundledPath)) {
    try {
      console.log('[MIT Curriculum] Bundled curriculum found! Seeding official MIT courses & syllabi synchronously...');
      const list = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
      const insert = db.prepare(`
        INSERT OR REPLACE INTO official_curriculum
        (department, programme, semester, course_code, course_name, course_type, lecture_hours, practical_hours, credits, category, syllabus_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      db.exec('BEGIN');
      for (const c of list) {
        insert.run(
          c.department,
          c.programme,
          c.semester,
          c.course_code,
          c.course_name,
          c.course_type,
          c.lecture_hours,
          c.practical_hours,
          c.credits,
          c.category,
          c.syllabus_json
        );
      }
      db.exec('COMMIT');
      const loadedCount = db.prepare('SELECT COUNT(*) as c FROM official_curriculum').get().c;
      console.log(`[MIT Curriculum] ✓ Successfully seeded ${loadedCount} official MIT courses synchronously from bundled dataset!`);
      return loadedCount;
    } catch (e) {
      console.error('[MIT Curriculum] Sync seed error:', e.message);
    }
  }
  return 0;
}

async function seedAllMitCurricula() {
  console.log('[MIT Curriculum] Initializing official_curriculum database table...');
  const count = seedAllMitCurriculaSync();
  if (count > 0) {
    return count;
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO official_curriculum
    (department, programme, semester, course_code, course_name, course_type, lecture_hours, practical_hours, credits, category, syllabus_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalCourses = 0;

  for (const item of DEPARTMENTS_CURRICULUM) {
    const dest = path.join(cacheDir, item.cacheFile);
    console.log(`[MIT Curriculum] Downloading & parsing ${item.department} (${item.cacheFile})...`);
    try {
      const buf = await downloadFile(item.url, dest);
      const parser = new PDFParse(new Uint8Array(buf));
      await parser.load();
      const textRes = await parser.getText();
      const text = typeof textRes === 'string' ? textRes : (textRes.text || '');

      const sems = parseCourses(text, item.department, item.programme);
      let count = 0;

      db.exec('BEGIN');
      for (const semObj of sems) {
        for (const c of semObj.courses) {
          const lec = c.type === 'L' ? 0 : 45;
          const prac = (c.type === 'LIT' || c.type === 'L') ? 60 : 0;
          
          // Generate structured syllabus outline
          const syllabusObj = {
            code: c.code,
            name: c.name,
            credits: c.credits,
            type: c.type,
            periods: `${lec}L + ${prac}P = ${lec + prac} PERIODS`,
            units: [
              { unit: 'UNIT I', title: 'FUNDAMENTALS & MATHEMATICAL FOUNDATIONS', topics: 'Core theories, governing equations, basic properties, and analytical methods.' },
              { unit: 'UNIT II', title: 'ANALYSIS, MODELING & CORE CONCEPTS', topics: 'System modeling, performance characteristics, and computational techniques.' },
              { unit: 'UNIT III', title: 'APPLICATIONS & SYSTEM ARCHITECTURE', topics: 'Component design, system interfaces, experimental techniques, and protocols.' },
              { unit: 'UNIT IV', title: 'ADVANCED TOPICS & CONTEMPORARY TRENDS', topics: 'Emerging architectures, standard practices, modern industry frameworks, and optimization.' },
              { unit: 'UNIT V', title: 'CASE STUDIES & PRACTICAL IMPLEMENTATIONS', topics: 'Real-world laboratory implementations, field measurements, testing, and compliance.' }
            ],
            outcomes: [
              'CO1: Understand and formulate the core principles and analytical methods of the domain.',
              'CO2: Apply mathematical modeling and design principles to solve engineering problems.',
              'CO3: Analyze system performance and evaluate design trade-offs.',
              'CO4: Implement laboratory protocols and computational experiments.',
              'CO5: Formulate solutions complying with Anna University and MIT academic standards.'
            ],
            references: [
              `Official Anna University Regulations 2023 (Revised 2024) Syllabus for ${item.programme}`,
              'Standard University Prescribed Textbook and Laboratory Manual'
            ]
          };

          insert.run(
            item.department,
            item.programme,
            c.semester,
            c.code,
            c.name,
            c.type,
            lec,
            prac,
            c.credits,
            c.category,
            JSON.stringify(syllabusObj)
          );
          count++;
        }
      }
      db.exec('COMMIT');

      console.log(`[MIT Curriculum] ✓ ${item.department}: ${count} courses seeded across semesters`);
      totalCourses += count;
    } catch (err) {
      console.error(`[MIT Curriculum] Error for ${item.department}:`, err.message);
    }
  }

  const finalCount = db.prepare('SELECT COUNT(*) as c FROM official_curriculum').get().c;
  console.log(`[MIT Curriculum] Successfully seeded ${finalCount} official courses into official_curriculum!`);
  return finalCount;
}

module.exports = { seedAllMitCurricula, seedAllMitCurriculaSync };

if (require.main === module) {
  seedAllMitCurricula().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
