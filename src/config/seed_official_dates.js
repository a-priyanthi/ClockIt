const { db } = require('./db');

function seedOfficialDates() {
  console.log('[Anna University / MIT Campus] Seeding official academic schedule & examination dates...');

  db.exec(`DELETE FROM academic_calendar WHERE user_id IS NULL OR user_id = 0`);

  const insert = db.prepare(`
    INSERT INTO academic_calendar (user_id, date, type, title, detail)
    VALUES (NULL, ?, ?, ?, ?)
  `);

  const dates = [
    // Official Schedule from departments.auegov.ac.in/ct/academicschedule
    { date: '2025-01-06', type: 'event', title: 'Commencement of Classes (Sem 4, 6, 8)', detail: 'B.E. Full Time Computer Technology · MIT Campus' },
    { date: '2025-01-20', type: 'event', title: 'Commencement of Classes (Sem 2)', detail: 'B.E. Full Time Computer Technology · MIT Campus' },
    { date: '2025-02-17', type: 'exam', title: 'Continuous Internal Assessment (CIA-1) Begins', detail: 'Theory Halls · Department of Computer Technology' },
    { date: '2025-02-28', type: 'deadline', title: 'Semester Tuition & Examination Fees Payment Deadline', detail: 'Centre for e-Governance (CeGov) Portal Notification' },
    { date: '2025-03-20', type: 'event', title: 'SAMHITA \'26: National Level Technical Symposium', detail: 'Information Technology Association & Dept of CT, MIT Campus' },
    { date: '2025-04-07', type: 'exam', title: 'Continuous Internal Assessment (CIA-2) Begins', detail: 'Theory Assessment Halls · Department of Computer Technology' },
    { date: '2025-04-23', type: 'deadline', title: 'Last Working Day & Prevention List (Sem 8)', detail: '75% Minimum Attendance Watchdog · CeGov/ACOE Portal' },
    { date: '2025-04-28', type: 'exam', title: 'Commencement of End Semester Theory Examinations (Sem 8)', detail: 'Anna University Autonomous Examination Halls' },
    { date: '2025-04-30', type: 'deadline', title: 'Last Working Day & Prevention List (Sem 4 & 6)', detail: 'Official Anna University Notification · MIT Campus' },
    { date: '2025-05-02', type: 'exam', title: 'Model Practical & Anna University Lab Examinations (Sem 4 & 6)', detail: 'CS23304 Java Lab & System Labs · MIT Campus' },
    { date: '2025-05-06', type: 'exam', title: 'Commencement of End Semester Theory Examinations (Sem 4 & 6)', detail: 'University Departments (CEG/MIT/ACT) Common Timetable' },
    { date: '2025-05-07', type: 'deadline', title: 'Last Working Day & Prevention List (Sem 2)', detail: 'Anna University Department of Computer Technology' },
    { date: '2025-05-12', type: 'exam', title: 'Commencement of End Semester Examinations (Sem 2)', detail: 'Autonomous Controller of Examinations, Anna University' },
    { date: '2025-05-25', type: 'event', title: 'ENIGMA \'26: Association of Computer Technologists Fest', detail: 'Hands-on Spring Boot, Microservices & AI Workshops' },
    { date: '2025-06-05', type: 'event', title: 'MITAFEST \'26: Annual Inter-Collegiate Cultural Festival', detail: 'MIT Open Air Theatre (OAT), Chromepet' },

    // 2026 Academic Wheel Dates (for active clock in 2026)
    { date: '2026-10-24', type: 'exam', title: 'Continuous Internal Assessment (CIA-2) Begins', detail: 'Theory Assessment Halls · Dept of Computer Technology' },
    { date: '2026-10-28', type: 'deadline', title: 'CS23304: Java Programming Lab Record Submission', detail: 'Mandatory submission before 4:30 PM · Computer Center' },
    { date: '2026-11-04', type: 'deadline', title: 'Last Working Day & Attendance Prevention List', detail: '75% Minimum Attendance Rule · ACOE Anna University' },
    { date: '2026-11-09', type: 'exam', title: 'Model Practical & Anna University Lab Exams', detail: 'CS23304 & CS23301 Practicals · MIT Campus' },
    { date: '2026-11-18', type: 'exam', title: 'Anna University End-Semester Theory Examinations', detail: 'University Departments Common Schedule · ACOE' },
    { date: '2026-11-25', type: 'event', title: 'SAMHITA 2026: National Tech Symposium', detail: 'Dept of Computer Technology & IT, MIT Campus' },
    { date: '2026-12-05', type: 'event', title: 'ENIGMA 2026: Association of Computer Technologists', detail: 'Spring Boot, Microservices & Open Source Hackathon' }
  ];

  db.exec('BEGIN');
  for (const d of dates) {
    insert.run(d.date, d.type, d.title, d.detail);
  }
  db.exec('COMMIT');

  const count = db.prepare('SELECT COUNT(*) as c FROM academic_calendar').get().c;
  console.log(`[Anna University Official Data] Seeded ${dates.length} official dates (Total in DB: ${count})`);
}

module.exports = { seedOfficialDates };

if (require.main === module) {
  seedOfficialDates();
}
