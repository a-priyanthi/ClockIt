const { db } = require('./db');

/**
 * Reset database: clears all tables so a new user/team starts completely fresh
 */
function resetDatabase() {
  db.exec(`
    DELETE FROM tasks;
    DELETE FROM documents;
    DELETE FROM requests;
    DELETE FROM chats;
    DELETE FROM sprint_meta;
    DELETE FROM projects;
    DELETE FROM users;
    DELETE FROM teams;
  `);
  console.log('All pre-written and existing records cleared. Database is 100% clean.');
}

/**
 * Seed database: Populates the full StudySync 57-hour sprint demo scenario
 * @param {boolean} force - If true, bypasses existing team checks
 */
function seedDatabase(force = false) {
  if (!force && process.env.DEMO_SEED !== 'true') {
    // Leave database 100% clean for real first-time usage
    return;
  }

  if (!force) {
    const teamCheck = db.prepare('SELECT COUNT(*) as count FROM teams').get();
    if (teamCheck && teamCheck.count > 0) {
      return;
    }
  }

  console.log('Seeding StudySync 57-hour sprint demo scenario...');

  // 1. Team
  const insertTeam = db.prepare(`
    INSERT INTO teams (name, email, password, lead_name, user_count)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertTeam.run('StudySync', 'studysync@team.demo', 'demo1234', 'Priya', 4);

  // 2. Users
  const insertUser = db.prepare(`
    INSERT INTO users (team_id, name, email, password, role, title, bio, skills, learning_style, status, is_lead, progress)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(1, 'Priya', 'lead@team.demo', 'demo1234', 'AI / Backend Lead', 'TEAM LEAD', 'Backend builder who enjoys AI workflows and leading student projects.', 'Python, AI, Backend, Leadership', 'Hands-on / examples', 'active', 1, 84);
  insertUser.run(1, 'Arun', 'arun@team.demo', 'demo1234', 'Frontend / UX', 'FRONTEND', 'Likes UI and building clean web interfaces; comfortable explaining frontend concepts.', 'Frontend, React, UI, JavaScript', 'Visual', 'active', 0, 68);
  insertUser.run(1, 'Meena', 'meena@team.demo', 'demo1234', 'Data / Analytics', 'DATA + ANALYTICS', 'Enjoys data and wants to learn how APIs connect to analytics dashboards.', 'Database, SQL, Analytics, Python', 'Hands-on / examples', 'active', 0, 55);
  insertUser.run(1, 'Vishal', 'vishal@team.demo', 'demo1234', 'QA / DevOps', 'QA / DEVOPS', 'Likes testing, deployment and writing clear technical documentation.', 'Testing, DevOps, Documentation, Git', 'Independent', 'active', 0, 91);
  insertUser.run(1, 'Kavya', 'kavya@team.demo', 'tempPass123', 'Data / AI', 'MEMBER', 'Interested in Python, machine learning and data analysis. Comfortable with SQL.', 'Python, ML, SQL, Data Analysis', 'Hands-on / examples', 'pending_approval', 0, 0);

  // 3. Projects
  const insertProject = db.prepare(`
    INSERT INTO projects (team_id, name, description, member_count, progress)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertProject.run(1, 'StudySync', 'An AI platform that analyzes authorized team discussions, documents and task contributions to identify knowledge exchange patterns, summarize collective insights and recommend meaningful collaboration activities.', 4, 72);
  insertProject.run(1, 'CampusCart', 'Student marketplace with smart matching.', 3, 41);

  // 4. Sprint Meta (57 Hours Total)
  const insertMeta = db.prepare(`
    INSERT INTO sprint_meta (project_id, sprint_num, status, goal, total_est_hours)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertMeta.run(1, 1, 'published', 'Deliver a working StudySync AI workspace with project tasks, document sharing, AI role assignment, and team/member reports.', 57);

  // 5. Tasks (Sprint 01 - 17 Detailed Tasks / 57 Hours Total)
  seedSprintTasks();

  // 6. Documents
  const insertDoc = db.prepare(`
    INSERT INTO documents (project_id, user_name, filename, filepath, original_name, filesize, is_folder, is_shared)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertDoc.run(1, 'Priya', 'API_Spec_v2.pdf', null, 'API_Spec_v2.pdf', '2.1 MB', 0, 1);
  insertDoc.run(1, 'Arun', 'frontend-build/', null, 'frontend-build/', '18 files', 1, 1);
  insertDoc.run(1, 'Priya', 'analyzer.py', null, 'analyzer.py', '14.2 KB', 0, 0);

  // 7. Requests
  const insertReq = db.prepare(`
    INSERT INTO requests (project_id, from_name, to_name, item, reason, type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertReq.run(1, 'Priya', 'Arun', 'frontend-build / API integration code', 'I need the completed API integration module to connect it with the analytics dashboard.', 'work', 'pending');
  insertReq.run(1, 'Meena', 'Priya', 'API_Spec_v2.pdf', 'Need API specs to finish knowledge metrics.', 'share', 'pending');
  insertReq.run(1, 'Vishal', 'Team', 'Testing checklist', 'Testing checklist is completed and ready for the integration team.', 'work', 'approved');
  insertReq.run(1, 'Kavya', 'Lead', 'Kavya Raman (kavya@team.demo)', 'New user signup approval', 'user_add', 'pending');
  insertReq.run(1, 'Team', 'Lead', 'Vishal (vishal@team.demo)', 'User deletion request confirmation', 'user_delete', 'pending');

  // 8. Chats
  const insertChat = db.prepare(`
    INSERT INTO chats (project_id, sender_name, sender_type, message, mode)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertChat.run(1, 'Thryve', 'ai', '✦ Thryve: I noticed Meena and Arun are discussing the same API topic. I can suggest a peer-learning activity.', 'all');
  insertChat.run(1, 'Arun', 'team', 'I can explain the frontend → API contract.', 'all');
  insertChat.run(1, 'Priya', 'me', 'Yes, schedule 15 minutes before the next sprint.', 'all');

  console.log('StudySync demo seed complete (57 hours total).');
}

function seedSprintTasks() {
  const insertTask = db.prepare(`
    INSERT INTO tasks (project_id, sprint_num, title, member_name, member_role, start_time, deadline_time, deadline_day, done_when, completed_at, status, is_before_deadline, est_hours, act_hours, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Priya tasks — Reports, integration, QA, demo (Total: 17 hours)
  insertTask.run(1, 1, 'Confirm integration branch and teammate branch names', 'Priya', 'Reports, integration, QA, demo', '09:00', '18:00', 'Day 1', 'Team agrees on merge order and branch ownership', '17:30', 'done', 1, 1.0, 1.0, 'Completed on time');
  insertTask.run(1, 1, 'Build Team Report with work, task, and risk summaries', 'Priya', 'Reports, integration, QA, demo', '09:00', '18:00', 'Day 4', 'Report shows real project data and selected reporting period', '16:45', 'done', 1, 4.0, 3.8, 'Completed on time');
  insertTask.run(1, 1, 'Build Member Report', 'Priya', 'Reports, integration, QA, demo', '09:00', '18:00', 'Day 6', 'Selecting Priya, Meena, Arun, or Vishal shows only that member’s tasks', '17:15', 'done', 1, 4.0, 4.0, 'Completed on time');
  insertTask.run(1, 1, 'Add deadline status and print-to-PDF styling', 'Priya', 'Reports, integration, QA, demo', '09:00', '18:00', 'Day 7', 'Completed tasks are labeled on time/late from timestamps; print hides controls', '15:20', 'done', 1, 3.0, 2.7, 'Completed on time');
  insertTask.run(1, 1, 'Integrate, QA, and prepare demo', 'Priya', 'Reports, integration, QA, demo', '09:00', '18:00', 'Day 10', 'Branches are integrated, key user journeys are checked, and demo flow is ready', null, 'pending', 0, 5.0, 0.0, 'Scheduled for Day 10');

  // Arun tasks — Backend, Supabase, authentication (Total: 14 hours)
  insertTask.run(1, 1, 'Confirm project, member, sprint, and task data fields', 'Arun', 'Backend, Supabase, authentication', '09:00', '18:00', 'Day 1', 'Required database fields and relationships are documented', '16:00', 'done', 1, 2.0, 1.8, 'Completed on time');
  insertTask.run(1, 1, 'Connect workspace project data to Supabase', 'Arun', 'Backend, Supabase, authentication', '09:00', '18:00', 'Day 3', 'Workspace loads records for the selected project', '17:40', 'done', 1, 4.0, 3.9, 'Completed on time');
  insertTask.run(1, 1, 'Add team signup and login validation', 'Arun', 'Backend, Supabase, authentication', '09:00', '18:00', 'Day 4', 'Missing fields and duplicate email are handled clearly', '16:50', 'done', 1, 4.0, 4.2, 'Completed on time');
  insertTask.run(1, 1, 'Enforce project and member access rules', 'Arun', 'Backend, Supabase, authentication', '09:00', '18:00', 'Day 6', 'Members cannot access another project’s private data', null, 'pending', 0, 4.0, 1.5, 'In progress');

  // Meena tasks — Frontend, workspace, task checklist (Total: 13 hours)
  insertTask.run(1, 1, 'Build workspace layout and navigation', 'Meena', 'Frontend, workspace, task checklist', '09:00', '18:00', 'Day 2', 'Dashboard, workspace, and Reports links work', '17:05', 'done', 1, 3.0, 2.8, 'Completed on time');
  insertTask.run(1, 1, 'Build sprint overview and task checklist', 'Meena', 'Frontend, workspace, task checklist', '09:00', '18:00', 'Day 4', 'Tasks display owner, estimate, deadline, and status', '16:30', 'done', 1, 4.0, 4.0, 'Completed on time');
  insertTask.run(1, 1, 'Add task status update controls', 'Meena', 'Frontend, workspace, task checklist', '09:00', '18:00', 'Day 5', 'Members can update task status and see the saved result', null, 'pending', 0, 3.0, 1.2, 'Awaiting API clarification');
  insertTask.run(1, 1, 'Add loading, empty, and error states', 'Meena', 'Frontend, workspace, task checklist', '09:00', '18:00', 'Day 7', 'Screens explain when data is loading, missing, or unavailable', null, 'pending', 0, 3.0, 0.0, 'AT RISK: Pending contract alignment');

  // Vishal tasks — AI features, documents (Total: 13 hours)
  insertTask.run(1, 1, 'Implement AI role assignment', 'Vishal', 'AI features, documents', '09:00', '18:00', 'Day 4', 'Team members receive role suggestions when AI is available', '15:10', 'done', 1, 4.0, 3.6, 'Completed on time');
  insertTask.run(1, 1, 'Handle AI service failures', 'Vishal', 'AI features, documents', '09:00', '18:00', 'Day 5', 'The app gives a helpful fallback when AI is unavailable', '14:40', 'done', 1, 2.0, 1.7, 'Completed on time');
  insertTask.run(1, 1, 'Implement document upload and sharing', 'Vishal', 'AI features, documents', '09:00', '18:00', 'Day 7', 'Authorized project members can upload and view documents', '19:15', 'late', 0, 4.0, 4.8, 'Completed late after Day 7 deadline');
  insertTask.run(1, 1, 'Add document access checks', 'Vishal', 'AI features, documents', '09:00', '18:00', 'Day 8', 'Users cannot view documents belonging to another project', null, 'pending', 0, 3.0, 0.0, 'Scheduled for Day 8');
}

/**
 * Seed ClockIt: Initializes student accounts, CS23304 Java syllabus,
 * calendar dates, campus events, marks, attendance, and scrapbook journal entries.
 */
function seedAcademicClock() {
  console.log('Checking and seeding ClockIt official Anna University accounts...');

  // 1. Users (Student and Admin) with hashed passwords
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO academic_users (username, password, name, role, department, programme, semester, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // Authentic Anna University MIT Campus roll numbers and accounts
  insertUser.run('2024503001', 'annauniv123', 'Priyavadhana S', 'student', 'Computer Technology', 'B.Tech Information Technology', '4', null);
  insertUser.run('DEMO-ROLL-001', 'demo1234', 'Student', 'student', 'Computer Technology', 'B.Tech Information Technology', '4', null);
  insertUser.run('FAC-MIT-101', 'annauniv123', 'Dr. P. Anandhakumar (HOD)', 'admin', 'Dept of Computer Technology, MIT Campus', 'Administration', 'N/A', null);
  insertUser.run('admin.demo', 'demo1234', 'Prof. R. Ramanathan (Dean)', 'admin', 'Academic Council / MIT Campus', 'Administration', 'N/A', null);

  const calCheck = db.prepare('SELECT COUNT(*) as count FROM academic_calendar').get();
  if (calCheck && calCheck.count > 0) {
    return;
  }


  // 2. Calendar Items (Anna University Academic Schedule / Odd Semester 2026 R2023)
  const insertCal = db.prepare(`
    INSERT INTO academic_calendar (user_id, date, type, title, detail)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertCal.run(1, '2026-10-24', 'exam', 'Continuous Internal Assessment (CIA-2) Begins', 'Anna University Autonomous Schedule · Theory Halls');
  insertCal.run(1, '2026-10-28', 'deadline', 'CS23304: Java Programming Lab Record Submission', 'Mandatory submission before 4:30 PM · Computer Center');
  insertCal.run(1, '2026-11-04', 'deadline', 'Last Working Day for Odd Semester (R2023)', 'Official Anna University Notification · ACOE Portal');
  insertCal.run(1, '2026-11-09', 'exam', 'Model Practical & Anna University Lab Exams', 'CS23304 & CS23301 Practicals · MIT Campus');
  insertCal.run(1, '2026-11-18', 'exam', 'Anna University End-Semester Theory Examinations', 'University Departments (CEG/MIT/ACT) Common Schedule');
  insertCal.run(1, '2026-11-25', 'event', 'SAMHITA 2026: National Tech Symposium', 'Dept of Information Technology, MIT Campus');
  insertCal.run(1, '2026-12-05', 'event', 'ENIGMA 2026: Annual Technical Fest', 'Association of Computer Technologists (ACT), MIT');

  // 3. Official Campus Events
  const insertEvent = db.prepare(`
    INSERT INTO academic_events (title, category, date, time, place, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertEvent.run('SAMHITA \'26 — National Technical Symposium', 'TECH TALK', '2026-11-25', '09:30 AM', 'Rajam Hall / IT Dept, MIT Campus', 'Annual inter-collegiate technical festival hosted by Information Technology Association (ITA). Events in Coding, Web Dev, AI/ML, and Paper Presentation.');
  insertEvent.run('ENIGMA \'26 — Association of Computer Technologists', 'WORKSHOP', '2026-12-05', '10:00 AM', 'Computer Center Lab 2, MIT', 'Hands-on practical workshop exploring Spring Boot Microservices, Java Servlets, and Cloud Native development.');
  insertEvent.run('MITAFEST \'26 — Annual Cultural Extravaganza', 'CAMPUS LIFE', '2026-12-18', '05:00 PM', 'MIT Open Air Theatre (OAT)', 'The premier cultural festival of MIT Campus, Anna University. Dance, music, literature, and art competitions across southern universities.');
  insertEvent.run('AU CODE-SPRINT: Anna University Hackathon', 'CLUB EVENT', '2026-11-14', '08:00 AM', 'Dr. APJ Abdul Kalam Block', '24-hour inter-campus hackathon solving real-world challenges for student workflows, smart campuses, and sustainability.');

  // 4. Subjects (Including full CS23304: Java Programming from the official syllabus screenshot)
  const javaSyllabusData = {
    courseCode: 'CS23304',
    courseTitle: 'JAVA PROGRAMMING',
    ltpc: '3 0 4 5',
    totalPeriods: '45L + 60P = 105 PERIODS',
    units: [
      {
        unit: 'UNIT - I',
        title: 'INTRODUCTION TO JAVA',
        periods: '9L, 12P',
        topics: 'Introduction to Java – JVM – Data Types, Variables, Operators, Expressions – Control flow Statements – Methods – Arrays – Classes and Objects – Constructors – Access Specifiers – Static Members – this keyword – constants – String Class – Working with Date and Time API.',
        practicals: [
          'Develop programs using Java basic constructs and arrays using any standard IDE like NETBEANS / ECLIPSE',
          'Develop programs to illustrate concept of class and static classes and methods',
          'Develop programs using String class, Date and Time API'
        ]
      },
      {
        unit: 'UNIT - II',
        title: 'POLYMORPHISM AND INHERITANCE',
        periods: '9L, 12P',
        topics: 'Overloading Methods – Static, Nested and Inner Classes. Inheritance – Superclasses and Subclasses – Method Overriding – Downcasting – instanceof Operator – Abstract and Final Classes – Packages – Interfaces.',
        practicals: [
          'Develop programs using abstract classes, method overloading and overriding',
          'Develop programs using Interfaces'
        ]
      },
      {
        unit: 'UNIT - III',
        title: 'EXCEPTION HANDLING AND MULTITHREADING',
        periods: '8L, 12P',
        topics: 'Exception Handling – Java’s Built-in Exceptions – User defined Exception – Assertions. Multithreading – Priorities – Synchronization – Avoiding Deadlocks – Wrappers – Autoboxing and Unboxing.',
        practicals: [
          'Develop programs using Exception handling',
          'Develop programs using Multithreading and synchronization'
        ]
      },
      {
        unit: 'UNIT - IV',
        title: 'FILE STREAMS AND DATABASE',
        periods: '9L, 12P',
        topics: 'Java I/O– Reading and Writing Files – Regular Expressions – Streams API – Object Serialization – Generic collections – Generic Classes – Generic Methods – List, Set, Map – Lambda expressions – Databases with JDBC.',
        practicals: [
          'Develop programs using Streams API and File I/O for reading and writing the contents in sequential and random order.',
          'Develop programs using Generics classes and methods',
          'Develop applications with Database Connectivity'
        ]
      },
      {
        unit: 'UNIT - V',
        title: 'WEB DEVELOPMENT AND FRAMEWORKS',
        periods: '10L, 12P',
        topics: 'Event handling: Events, Listeners and Adapter classes, Anonymous Inner classes. Abstract Windowing Toolkit (AWT): Button, Label, Checkbox, Checkbox Group, Text Field, Text Area, Choice, List, Menu, Panel, Scrollbar and Swing components, Layout managers, Complex Components – Java Servlets – Apache Tomcat – Java Web Framework – Spring Boot',
        practicals: [
          'Develop Event-driven programs for GUI applications',
          'Develop servlet based applications',
          'Design a Java Web application using Spring Boot'
        ]
      }
    ],
    courseOutcomes: [
      '1. Construct programs using Object Oriented Design principles like encapsulation, abstraction, polymorphism, inheritance and types.',
      '2. Develop applications with handlers for user-defined exceptions, according to the given requirements.',
      '3. Construct efficient multithreaded programs with synchronization constructs.',
      '4. Develop interactive GUI applications with event handling that provide rich user experience.',
      '5. Construct programs using the suitable Collection classes and interfaces for efficient modelling of the objects and entities of the program and develop Web Applications that use file input and output using any framework.'
    ],
    references: [
      'Y. Daniel Liang, "Introduction to Java Programming and Data Structures, Comprehensive Version", 12th Edition, Pearson Education, 2021.',
      'Paul Dietel and Harvey Deitel, "Java – How to Program Early Objects", 11th Edition, Pearson Education, 2018.',
      'Craig Walls, "Spring in Action", 3rd edition, Manning Publications, 2011.',
      'Herbert Schildt, "Java: The Complete Reference", 11th Edition, McGraw-Hill Education, 2018.',
      'Sachin Malhotra, Saurabh Choudhary, "Programming in Java", Revised 2nd Edition, Oxford University Press, 2018.',
      'Cay S. Horstmann, "Core Java – Vol. 1, Fundamentals", 11th Edition, Pearson Education, 2018.',
      'https://spring.io/projects/spring-boot'
    ]
  };

  const insertSub = db.prepare(`
    INSERT INTO academic_subjects (code, name, units, lecture_hours, practical_hours, credits, progress, attended, total, syllabus_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSub.run('CS23304', 'Java Programming', 5, 45, 60, 5, 65, 19, 21, JSON.stringify(javaSyllabusData));
  insertSub.run('CS23301', 'Data Structures & Algorithms', 5, 45, 30, 4, 60, 18, 20, null);
  insertSub.run('MA23201', 'Discrete Mathematics', 4, 60, 0, 4, 75, 17, 20, null);
  insertSub.run('EC23302', 'Digital Systems & Microprocessors', 5, 45, 30, 4, 35, 15, 20, null);
  insertSub.run('HS23101', 'Communication Skills & Ethics', 3, 30, 15, 3, 80, 18, 20, null);

  // 5. Marks
  const insertMark = db.prepare(`
    INSERT INTO academic_marks (user_id, subject, assessment, score, outof)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertMark.run(1, 'Java Programming', 'Unit 1 Assignment (Classes & Objects)', 19, 20);
  insertMark.run(1, 'Java Programming', 'Unit 2 Lab: Polymorphism & Interfaces', 18, 20);
  insertMark.run(1, 'Data Structures & Algorithms', 'Assignment 1', 18, 20);
  insertMark.run(1, 'Discrete Mathematics', 'Quiz 1', 17, 20);
  insertMark.run(1, 'Digital Systems & Microprocessors', 'Class Test 1', 15, 20);

  // 6. Scrapbook Journal
  const insertJournal = db.prepare(`
    INSERT INTO academic_journal (user_id, title, text, mood, date)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertJournal.run(1, 'A good day, in little ways', 'Today I showed up for myself. Finished the Java multithreading chapter and had a wonderful discussion about Spring Boot controllers. I can take one step at a time, and that still counts. ✿', '🙂', '20 Oct 2026');

  // 7. Daily Gentle Plan Tasks
  const insertTask = db.prepare(`
    INSERT INTO academic_tasks (user_id, title, detail, completed)
    VALUES (?, ?, ?, ?)
  `);
  insertTask.run(1, 'Review one lecture topic', 'Keep it to 25 focused minutes with the Pomodoro timer.', 1);
  insertTask.run(1, 'Check tomorrow’s deadlines', 'Make a small plan before you log off.', 0);
  insertTask.run(1, 'Take a real break', 'Stretch, hydrate, breathe, and step outside.', 0);

  console.log('ClockIt database successfully initialized with full CS23304 syllabus!');
}

module.exports = {
  resetDatabase,
  seedDatabase,
  seedAcademicClock
};
