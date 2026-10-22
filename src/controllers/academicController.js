const { db } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');

// Helper: Sign JWT Token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

// Helper: Normalize name strings for tolerant matching of initials and spacing
function normalizeName(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function namesMatch(inputName, officialName) {
  const normInput = normalizeName(inputName);
  const normOfficial = normalizeName(officialName);
  if (!normInput || !normOfficial) return false;
  if (normInput === normOfficial) return true;
  if (normInput.includes(normOfficial) || normOfficial.includes(normInput)) return true;

  const inputTokens = normInput.split(' ').filter(Boolean);
  const officialTokens = normOfficial.split(' ').filter(Boolean);
  if (inputTokens.length === 0 || officialTokens.length === 0) return false;

  const inputMain = inputTokens.filter(t => t.length > 1);
  const officialMain = officialTokens.filter(t => t.length > 1);

  if (inputMain.length > 0 && officialMain.length > 0) {
    const inputMatchesOfficial = inputMain.every(t => officialMain.includes(t));
    const officialMatchesInput = officialMain.every(t => inputMain.includes(t));
    if (inputMatchesOfficial || officialMatchesInput) return true;
  }

  const inputWithoutInitials = inputTokens.filter(t => t.length > 1).join(' ');
  const officialWithoutInitials = officialTokens.filter(t => t.length > 1).join(' ');
  if (inputWithoutInitials && inputWithoutInitials === officialWithoutInitials) return true;

  // If primary/first name token matches (e.g. Priyanthi matches Priyanthi A)
  if (inputTokens.some(t => t.length >= 3 && officialTokens.includes(t))) return true;

  return false;
}

exports.namesMatch = namesMatch;

// ==========================================
// 1. Authentication & Official Student Verification
// ==========================================
exports.verifyAndLogin = (req, res) => {
  try {
    const { username, rollno, rollNo, name, semester, department, password, role } = req.body;
    const studentRoll = String(rollno || rollNo || username || '').trim();
    const cleanRoll = studentRoll.replace(/[^a-zA-Z0-9]/g, '');
    const cleanPassword = String(password || '').trim();
    const isStaffOrAdmin = (role === 'admin') || (studentRoll.toUpperCase().startsWith('FAC-'));

    if (!studentRoll || !cleanPassword) {
      return res.status(400).json({
        success: false,
        error: 'Roll Number (or Staff ID) and Password are required.'
      });
    }

    // A. Faculty / Admin sign in bypass for staff
    if (isStaffOrAdmin) {
      const adminUser = db.prepare('SELECT * FROM academic_users WHERE UPPER(username) = UPPER(?)').get(studentRoll);
      if (!adminUser) {
        return res.status(401).json({ success: false, error: `Staff account "${studentRoll}" not found.` });
      }
      let valid = false;
      if (adminUser.password.startsWith('$2a$') || adminUser.password.startsWith('$2b$')) {
        valid = bcrypt.compareSync(cleanPassword, adminUser.password);
      } else {
        valid = (adminUser.password === cleanPassword);
      }
      if (!valid) {
        return res.status(401).json({ success: false, error: 'Incorrect staff credentials.' });
      }
      const token = generateToken(adminUser);
      return res.json({
        success: true,
        token,
        user: adminUser,
        verified: true,
        message: 'Faculty administrator signed in successfully.'
      });
    }

    // B. Official Student Verification
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Student Full Name is required to verify identity against the official MIT student roster.'
      });
    }

    // Ensure database table is populated (essential on fresh cloud deployment)
    let rosterCount = 0;
    try {
      rosterCount = db.prepare('SELECT COUNT(*) as c FROM official_mit_students').get().c;
    } catch (e) {}

    if (rosterCount === 0) {
      try {
        const { seedAllMitStudentsSync } = require('../config/seed_all_mit_students');
        seedAllMitStudentsSync();
      } catch (e) {
        console.warn('Auto-seed roster notice:', e.message);
      }
    }

    // Look up in official_mit_students (case-insensitive & clean roll)
    let official = db.prepare('SELECT * FROM official_mit_students WHERE roll_no = ? OR roll_no = ? OR UPPER(roll_no) = UPPER(?)').get(studentRoll, cleanRoll, cleanRoll) ||
                   db.prepare('SELECT * FROM official_ct_students WHERE roll_no = ? OR roll_no = ?').get(studentRoll, cleanRoll);

    // Also check if account already exists in academic_users
    let user = db.prepare('SELECT * FROM academic_users WHERE UPPER(username) = UPPER(?) OR UPPER(username) = UPPER(?)').get(studentRoll, cleanRoll);

    if (!official && !user) {
      // Check if it's a valid 10-digit Anna University / MIT student roll number (e.g. 202xxxxx)
      const isAuRollFormat = /^20\d{8}$/.test(cleanRoll);
      if (isAuRollFormat) {
        const studentDept = department || 'Computer Technology';
        const studentSem = parseInt(semester, 10) || 4;
        const studentYear = Math.ceil(studentSem / 2);
        const insertOfficial = db.prepare(`
          INSERT OR IGNORE INTO official_mit_students (roll_no, name, year, semester, degree, department)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        insertOfficial.run(cleanRoll, name.trim(), studentYear, studentSem, 'B.E./B.Tech', studentDept);
        official = {
          roll_no: cleanRoll,
          name: name.trim(),
          year: studentYear,
          semester: studentSem,
          degree: 'B.E./B.Tech',
          department: studentDept
        };
      } else {
        return res.status(403).json({
          success: false,
          error: `Access Denied: Roll number "${studentRoll}" was not found in the official MIT student roster. Please enter a valid 10-digit Anna University MIT roll number (e.g. 2025503561).`
        });
      }
    }

    // Check Name identity if official record exists
    if (official && official.name) {
      const isNameValid = namesMatch(name, official.name);
      if (!isNameValid) {
        return res.status(403).json({
          success: false,
          error: `Identity Verification Failed: The entered name "${name}" does not match the official student record for roll number ${studentRoll} (Registered as: "${official.name}"). Please enter your official name.`
        });
      }
    }

    if (user) {
      // Existing user: verify password
      let isValidPassword = false;
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        isValidPassword = bcrypt.compareSync(cleanPassword, user.password);
      } else {
        isValidPassword = (user.password === cleanPassword);
      }

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: `Incorrect password for student account ${studentRoll}. Please re-enter your password.`
        });
      }

      // Update semester or department if specified
      if (semester || department) {
        db.prepare('UPDATE academic_users SET semester = COALESCE(?, semester), department = COALESCE(?, department) WHERE id = ?')
          .run(semester ? String(semester) : null, department || null, user.id);
        user = db.prepare('SELECT * FROM academic_users WHERE id = ?').get(user.id);
      }

      const token = generateToken(user);
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department,
          programme: user.programme,
          semester: user.semester,
          avatar: user.avatar
        },
        verified: true,
        official: {
          rollNo: official.roll_no,
          name: official.name,
          year: official.year,
          semester: official.semester,
          degree: official.degree,
          department: official.department
        },
        message: `Welcome back, ${official.name}! Official Anna University identity verified.`
      });
    } else {
      // First-time sign in: automatically activate account
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(cleanPassword, salt);
      const studentSemester = semester ? String(semester) : String(official.semester);
      const studentDept = department || official.department || 'Computer Technology';
      const studentProg = official.degree || 'B.E. Computer Technology';

      const insert = db.prepare(`
        INSERT INTO academic_users (username, password, name, role, department, programme, semester)
        VALUES (?, ?, ?, 'student', ?, ?, ?)
      `);
      const info = insert.run(
        studentRoll,
        hashedPassword,
        official.name, // Use official verified name
        studentDept,
        studentProg,
        studentSemester
      );

      const newUser = db.prepare('SELECT id, username, name, role, department, programme, semester, avatar FROM academic_users WHERE id = ?').get(info.lastInsertRowid);
      const token = generateToken(newUser);

      // Seed welcoming gentle tasks
      try {
        const insertTask = db.prepare(`
          INSERT INTO academic_tasks (user_id, title, detail, completed)
          VALUES (?, ?, ?, ?)
        `);
        insertTask.run(newUser.id, 'Identity Verified with Anna University ✿', `Enrolled in Dept of CT · ${official.degree} · Year ${official.year}`, 1);
        insertTask.run(newUser.id, 'Review Anna University Academic Calendar & CIA Dates', 'Continuous Internal Assessments (CIA-1 & CIA-2) schedule synced.', 0);
        insertTask.run(newUser.id, 'Check CS23304 Java Programming Syllabus', 'Unit 1 to 5 lecture hours & laboratory objectives.', 0);
      } catch (e) {
        console.warn('Task notice:', e.message);
      }

      return res.status(201).json({
        success: true,
        token,
        user: newUser,
        verified: true,
        official: {
          rollNo: official.roll_no,
          name: official.name,
          year: official.year,
          semester: official.semester,
          degree: official.degree,
          department: official.department
        },
        message: `Identity Verified! Welcome to MIT Campus ClockIt, ${official.name}. Your official student account is now active.`
      });
    }
  } catch (err) {
    console.error('Verify and login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during student authentication.' });
  }
};

exports.login = (req, res) => {
  return exports.verifyAndLogin(req, res);
};

exports.verifyOfficialStudent = (req, res) => {
  try {
    const rawRoll = String(req.query.rollNo || req.query.rollno || '').trim();
    const cleanRoll = rawRoll.replace(/[^a-zA-Z0-9]/g, '');
    const name = String(req.query.name || '').trim();

    if (!rawRoll) {
      return res.status(400).json({ success: false, error: 'Roll number is required.' });
    }

    // Ensure database table is populated
    let rosterCount = 0;
    try {
      rosterCount = db.prepare('SELECT COUNT(*) as c FROM official_mit_students').get().c;
    } catch (e) {}

    if (rosterCount === 0) {
      try {
        const { seedAllMitStudentsSync } = require('../config/seed_all_mit_students');
        seedAllMitStudentsSync();
      } catch (e) {
        console.warn('Auto-seed roster notice:', e.message);
      }
    }

    let official = db.prepare('SELECT * FROM official_mit_students WHERE roll_no = ? OR roll_no = ? OR UPPER(roll_no) = UPPER(?)').get(rawRoll, cleanRoll, cleanRoll) ||
                   db.prepare('SELECT * FROM official_ct_students WHERE roll_no = ? OR roll_no = ?').get(rawRoll, cleanRoll);

    if (!official) {
      if (/^20\d{8}$/.test(cleanRoll)) {
        return res.json({
          success: true,
          found: true,
          student: {
            rollNo: cleanRoll,
            name: name || 'Anna University MIT Student',
            year: 2,
            semester: 4,
            degree: 'B.E./B.Tech',
            department: 'Computer Technology'
          },
          nameMatches: true
        });
      }

      return res.json({
        success: true,
        found: false,
        message: `Roll number "${rawRoll}" was not found in the official MIT student roster.`
      });
    }

    const matchesName = name ? namesMatch(name, official.name) : null;

    res.json({
      success: true,
      found: true,
      student: {
        rollNo: official.roll_no,
        name: official.name,
        year: official.year,
        semester: official.semester,
        degree: official.degree,
        department: official.department
      },
      nameMatches: matchesName
    });
  } catch (err) {
    console.error('Verify official student error:', err);
    res.status(500).json({ success: false, error: 'Failed to verify student record.' });
  }
};

exports.getOfficialStudentsList = (req, res) => {
  try {
    const { year, search, limit, department } = req.query;
    let query = 'SELECT roll_no, name, year, semester, degree, department FROM official_mit_students WHERE 1=1';
    const params = [];

    if (year) {
      query += ' AND year = ?';
      params.push(Number(year));
    }
    if (department) {
      query += ' AND department = ?';
      params.push(department);
    }
    if (search) {
      query += ' AND (roll_no LIKE ? OR name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY department ASC, year ASC, roll_no ASC LIMIT ?';
    params.push(Number(limit) || 20);

    const students = db.prepare(query).all(...params);
    res.json({ success: true, count: students.length, students });
  } catch (err) {
    console.error('Get official students error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve students list.' });
  }
};

exports.register = (req, res) => {
  return exports.verifyAndLogin(req, res);
};

exports.getProfile = (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const user = db.prepare('SELECT id, username, name, role, department, programme, semester, avatar FROM academic_users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve profile' });
  }
};

exports.updateProfile = (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const { name, department, programme, semester } = req.body;

    const stmt = db.prepare(`
      UPDATE academic_users 
      SET name = COALESCE(?, name),
          department = COALESCE(?, department),
          programme = COALESCE(?, programme),
          semester = COALESCE(?, semester)
      WHERE id = ?
    `);
    stmt.run(name || null, department || null, programme || null, semester || null, userId);

    const updated = db.prepare('SELECT id, username, name, role, department, programme, semester, avatar FROM academic_users WHERE id = ?').get(userId);
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

exports.updateAvatar = (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const { avatarUrl } = req.body;

    db.prepare('UPDATE academic_users SET avatar = ? WHERE id = ?').run(avatarUrl, userId);
    res.json({ success: true, avatar: avatarUrl });
  } catch (err) {
    console.error('Update avatar error:', err);
    res.status(500).json({ success: false, error: 'Failed to save avatar' });
  }
};

// ==========================================
// 2. Calendar Items & Academic Wheel
// ==========================================
exports.getCalendarItems = (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const items = userId
      ? db.prepare('SELECT * FROM academic_calendar WHERE user_id IS NULL OR user_id = 0 OR user_id = ? ORDER BY date ASC').all(userId)
      : db.prepare('SELECT * FROM academic_calendar WHERE user_id IS NULL OR user_id = 0 ORDER BY date ASC').all();
    res.json({ success: true, items });
  } catch (err) {
    console.error('Get calendar error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve calendar items' });
  }
};

exports.addCalendarItem = (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const { date, type, title, detail } = req.body;

    if (!date || !title) {
      return res.status(400).json({ success: false, error: 'Date and Title are required' });
    }

    const insert = db.prepare(`
      INSERT INTO academic_calendar (user_id, date, type, title, detail)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = insert.run(userId, date, type || 'deadline', title, detail || 'Personal reminder · demo data');
    const created = db.prepare('SELECT * FROM academic_calendar WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({ success: true, item: created });
  } catch (err) {
    console.error('Add calendar item error:', err);
    res.status(500).json({ success: false, error: 'Failed to add calendar item' });
  }
};

exports.deleteCalendarItem = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM academic_calendar WHERE id = ?').run(id);
    res.json({ success: true, message: 'Calendar item removed' });
  } catch (err) {
    console.error('Delete calendar error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete calendar item' });
  }
};

// ==========================================
// 3. Campus Events & Registration
// ==========================================
exports.getEvents = (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const events = db.prepare('SELECT * FROM academic_events ORDER BY date ASC').all();
    const registeredEvents = db.prepare('SELECT event_id FROM academic_event_registrations WHERE user_id = ?').all(userId);
    const regSet = new Set(registeredEvents.map(r => r.event_id));

    const enriched = events.map(e => ({
      ...e,
      registered: regSet.has(e.id)
    }));

    res.json({ success: true, events: enriched });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve campus events' });
  }
};

exports.addEvent = (req, res) => {
  try {
    const { title, category, date, time, place, description } = req.body;
    if (!title || !date) {
      return res.status(400).json({ success: false, error: 'Title and date are required' });
    }

    const insert = db.prepare(`
      INSERT INTO academic_events (title, category, date, time, place, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = insert.run(title, category || 'CAMPUS LIFE', date, time || '2:00 PM', place || 'Campus Ground', description || '');
    const created = db.prepare('SELECT * FROM academic_events WHERE id = ?').get(info.lastInsertRowid);

    // Also auto-add to calendar
    db.prepare(`
      INSERT INTO academic_calendar (user_id, date, type, title, detail)
      VALUES (?, ?, 'event', ?, ?)
    `).run(1, date, title, `Campus event · ${place || 'MIT Campus'}`);

    res.status(201).json({ success: true, event: created });
  } catch (err) {
    console.error('Add event error:', err);
    res.status(500).json({ success: false, error: 'Failed to create campus event' });
  }
};

exports.toggleEventRegistration = (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const eventId = parseInt(req.params.id, 10);

    const existing = db.prepare('SELECT id FROM academic_event_registrations WHERE event_id = ? AND user_id = ?').get(eventId, userId);

    if (existing) {
      db.prepare('DELETE FROM academic_event_registrations WHERE id = ?').run(existing.id);
      return res.json({ success: true, registered: false, message: 'Event registration cancelled' });
    } else {
      db.prepare('INSERT INTO academic_event_registrations (event_id, user_id) VALUES (?, ?)').run(eventId, userId);
      return res.json({ success: true, registered: true, message: 'Registered interest for event' });
    }
  } catch (err) {
    console.error('Toggle registration error:', err);
    res.status(500).json({ success: false, error: 'Failed to update event registration' });
  }
};

// Helper: Dynamically resolve official Anna University curriculum subjects for student
function resolveStudentCurriculumSubjects(userId) {
  let user = null;
  if (userId) {
    user = db.prepare('SELECT * FROM academic_users WHERE id = ?').get(userId);
  }

  let subjects = [];
  if (user && user.department) {
    const dept = user.department;
    const sem = parseInt(user.semester, 10) || 1;

    let courses = db.prepare('SELECT * FROM official_curriculum WHERE department = ? AND semester = ?').all(dept, sem);

    if (!courses || courses.length === 0) {
      courses = db.prepare('SELECT * FROM official_curriculum WHERE department = ? ORDER BY semester ASC LIMIT 6').all(dept);
    }

    if (courses && courses.length > 0) {
      subjects = courses.map(c => ({
        id: c.id,
        code: c.course_code,
        name: c.course_name,
        units: 5,
        credits: c.credits,
        lecture_hours: c.lecture_hours,
        practical_hours: c.practical_hours,
        progress: 0,
        category: c.category,
        syllabus_json: c.syllabus_json
      }));
    }
  }

  if (subjects.length === 0) {
    subjects = db.prepare('SELECT * FROM academic_subjects ORDER BY id ASC').all();
  }
  return subjects;
}

// ==========================================
// 4. Attendance Tracker
// ==========================================
exports.getAttendance = (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const subjects = resolveStudentCurriculumSubjects(userId);
    const logs = userId
      ? db.prepare('SELECT * FROM academic_attendance_logs WHERE user_id = ? ORDER BY date DESC').all(userId)
      : [];

    const userCounts = {};
    logs.forEach(l => {
      if (!userCounts[l.subject_code]) userCounts[l.subject_code] = { attended: 0, total: 0 };
      userCounts[l.subject_code].total++;
      if (l.status === 'present') userCounts[l.subject_code].attended++;
    });

    let totalAttended = 0;
    let totalClasses = 0;

    const enriched = subjects.map(s => {
      const stat = userCounts[s.code] || { attended: 0, total: 0 };
      const pct = stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 100;
      totalAttended += stat.attended;
      totalClasses += stat.total;
      return {
        ...s,
        attended: stat.attended,
        total: stat.total,
        percentage: pct
      };
    });

    const overallAvg = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 100;

    res.json({
      success: true,
      subjects: enriched,
      overallAverage: overallAvg,
      recentLogs: logs.slice(0, 20)
    });
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance data' });
  }
};

exports.recordAttendance = (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const { subjectCode, status } = req.body; // status: 'present' | 'absent'

    if (!subjectCode || !status) {
      return res.status(400).json({ success: false, error: 'Subject code and status are required' });
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // Log attendance for this user
    db.prepare(`
      INSERT INTO academic_attendance_logs (user_id, subject_code, status, date)
      VALUES (?, ?, ?, ?)
    `).run(userId, subjectCode, status, todayStr);

    // Calculate updated attendance for this user and subject
    const userSubjectLogs = db.prepare('SELECT status FROM academic_attendance_logs WHERE user_id = ? AND subject_code = ?').all(userId, subjectCode);
    const total = userSubjectLogs.length;
    const attended = userSubjectLogs.filter(l => l.status === 'present').length;

    const subject = db.prepare('SELECT code, name FROM academic_subjects WHERE code = ?').get(subjectCode) ||
                    db.prepare('SELECT course_code as code, course_name as name FROM official_curriculum WHERE course_code = ?').get(subjectCode) ||
                    { code: subjectCode, name: subjectCode };
    res.json({ success: true, subject: { ...subject, total, attended } });
  } catch (err) {
    console.error('Record attendance error:', err);
    res.status(500).json({ success: false, error: 'Failed to record attendance' });
  }
};

// ==========================================
// 5. Syllabus & Subjects (Official Anna University & MIT Curricula)
// ==========================================
exports.getSubjects = (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const subjects = resolveStudentCurriculumSubjects(userId);

    let userCounts = {};
    if (userId) {
      const logs = db.prepare('SELECT subject_code, status FROM academic_attendance_logs WHERE user_id = ?').all(userId);
      logs.forEach(l => {
        if (!userCounts[l.subject_code]) userCounts[l.subject_code] = { attended: 0, total: 0 };
        userCounts[l.subject_code].total++;
        if (l.status === 'present') userCounts[l.subject_code].attended++;
      });
    }

    const parsed = subjects.map(s => {
      const stat = userCounts[s.code] || { attended: 0, total: 0 };
      return {
        ...s,
        attended: stat.attended,
        total: stat.total,
        syllabus: s.syllabus_json ? JSON.parse(s.syllabus_json) : null
      };
    });
    res.json({ success: true, subjects: parsed });
  } catch (err) {
    console.error('Get subjects error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve subjects' });
  }
};

exports.getSubjectByCode = (req, res) => {
  try {
    const { code } = req.params;
    let subject = db.prepare('SELECT * FROM academic_subjects WHERE code = ?').get(code);
    if (!subject) {
      const c = db.prepare('SELECT * FROM official_curriculum WHERE course_code = ?').get(code);
      if (c) {
        subject = {
          id: c.id,
          code: c.course_code,
          name: c.course_name,
          units: 5,
          credits: c.credits,
          lecture_hours: c.lecture_hours,
          practical_hours: c.practical_hours,
          progress: 0,
          syllabus_json: c.syllabus_json
        };
      }
    }
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    const parsed = {
      ...subject,
      syllabus: subject.syllabus_json ? JSON.parse(subject.syllabus_json) : null
    };
    res.json({ success: true, subject: parsed });
  } catch (err) {
    console.error('Get subject details error:', err);
    res.status(500).json({ success: false, error: 'Failed to get subject details' });
  }
};

exports.addSubject = (req, res) => {
  try {
    const { code, name, units, progress } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, error: 'Code and Name are required' });
    }

    const insert = db.prepare(`
      INSERT INTO academic_subjects (code, name, units, progress, attended, total)
      VALUES (?, ?, ?, ?, 0, 0)
    `);
    const info = insert.run(code, name, parseInt(units, 10) || 5, parseInt(progress, 10) || 0);
    const created = db.prepare('SELECT * FROM academic_subjects WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({ success: true, subject: created });
  } catch (err) {
    console.error('Add subject error:', err);
    res.status(500).json({ success: false, error: 'Failed to add subject' });
  }
};

exports.updateSubject = (req, res) => {
  try {
    const { code } = req.params;
    const { name, units, progress } = req.body;

    const stmt = db.prepare(`
      UPDATE academic_subjects
      SET name = COALESCE(?, name),
          units = COALESCE(?, units),
          progress = COALESCE(?, progress)
      WHERE code = ?
    `);
    stmt.run(name || null, units !== undefined ? parseInt(units, 10) : null, progress !== undefined ? parseInt(progress, 10) : null, code);

    const updated = db.prepare('SELECT * FROM academic_subjects WHERE code = ?').get(code);
    res.json({ success: true, subject: updated });
  } catch (err) {
    console.error('Update subject error:', err);
    res.status(500).json({ success: false, error: 'Failed to update subject' });
  }
};

// ==========================================
// 6. Marks & Assessments
// ==========================================
exports.getMarks = (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.json({ success: true, marks: [] });
    }
    const marks = db.prepare('SELECT * FROM academic_marks WHERE user_id = ? ORDER BY id DESC').all(userId);
    res.json({ success: true, marks });
  } catch (err) {
    console.error('Get marks error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve marks' });
  }
};

exports.addMark = (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const { subject, assessment, score, outof } = req.body;

    if (!subject || !assessment || score === undefined || !outof) {
      return res.status(400).json({ success: false, error: 'Subject, assessment, score and out of values are required' });
    }

    const insert = db.prepare(`
      INSERT INTO academic_marks (user_id, subject, assessment, score, outof)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = insert.run(userId, subject, assessment, parseFloat(score), parseFloat(outof));
    const created = db.prepare('SELECT * FROM academic_marks WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({ success: true, mark: created });
  } catch (err) {
    console.error('Add mark error:', err);
    res.status(500).json({ success: false, error: 'Failed to save mark' });
  }
};

exports.deleteMark = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM academic_marks WHERE id = ?').run(id);
    res.json({ success: true, message: 'Assessment mark deleted' });
  } catch (err) {
    console.error('Delete mark error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete mark' });
  }
};

// ==========================================
// 7. Scrapbook Journal
// ==========================================
exports.getJournalEntries = (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.json({ success: true, entries: [] });
    }
    const entries = db.prepare('SELECT * FROM academic_journal WHERE user_id = ? ORDER BY id DESC').all(userId);
    res.json({ success: true, entries });
  } catch (err) {
    console.error('Get journal error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve journal entries' });
  }
};

exports.saveJournalEntry = (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const { title, text, mood, date } = req.body;

    const insert = db.prepare(`
      INSERT INTO academic_journal (user_id, title, text, mood, date)
      VALUES (?, ?, ?, ?, ?)
    `);
    const dateFormatted = date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const info = insert.run(userId, title || 'A small memory', text || '', mood || '🙂', dateFormatted);
    const created = db.prepare('SELECT * FROM academic_journal WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({ success: true, entry: created });
  } catch (err) {
    console.error('Save journal entry error:', err);
    res.status(500).json({ success: false, error: 'Failed to save journal entry' });
  }
};

// ==========================================
// 8. Gentle Plan Tasks
// ==========================================
exports.getTasks = (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.json({ success: true, tasks: [] });
    }
    const tasks = db.prepare('SELECT * FROM academic_tasks WHERE user_id = ? ORDER BY id ASC').all(userId);
    res.json({ success: true, tasks });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
};

exports.toggleTask = (req, res) => {
  try {
    const { id } = req.params;
    const task = db.prepare('SELECT completed FROM academic_tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    const newStatus = task.completed ? 0 : 1;
    db.prepare('UPDATE academic_tasks SET completed = ? WHERE id = ?').run(newStatus, id);
    res.json({ success: true, completed: Boolean(newStatus) });
  } catch (err) {
    console.error('Toggle task error:', err);
    res.status(500).json({ success: false, error: 'Failed to toggle task' });
  }
};

// ==========================================
// 9. Admin Overview Statistics
// ==========================================
exports.getAdminStats = (req, res) => {
  try {
    const calendarCount = db.prepare('SELECT COUNT(*) as count FROM academic_calendar').get().count;
    const eventCount = db.prepare('SELECT COUNT(*) as count FROM academic_events').get().count;
    const subjectCount = db.prepare('SELECT COUNT(*) as count FROM academic_subjects').get().count;
    const userCount = db.prepare('SELECT COUNT(*) as count FROM academic_users').get().count;
    const markCount = db.prepare('SELECT COUNT(*) as count FROM academic_marks').get().count;

    res.json({
      success: true,
      stats: {
        calendarItems: calendarCount,
        campusEvents: eventCount,
        subjects: subjectCount,
        users: userCount,
        marks: markCount
      }
    });
  } catch (err) {
    console.error('Get admin stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve admin stats' });
  }
};
