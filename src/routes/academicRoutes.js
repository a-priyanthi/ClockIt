const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');
const { authenticateToken } = require('../middleware/auth');

// Apply optional/ambient token parser across all academic routes
router.use(authenticateToken);

// 1. Auth & Profile
router.post('/auth/register', academicController.register);
router.post('/auth/login', academicController.login);
router.post('/auth/verify-and-login', academicController.verifyAndLogin);
router.get('/official-students/verify', academicController.verifyOfficialStudent);
router.get('/official-students', academicController.getOfficialStudentsList);
router.get('/auth/me', academicController.getProfile);
router.put('/profile', academicController.updateProfile);
router.post('/profile/avatar', academicController.updateAvatar);

// 2. Calendar Items
router.get('/calendar', academicController.getCalendarItems);
router.post('/calendar', academicController.addCalendarItem);
router.delete('/calendar/:id', academicController.deleteCalendarItem);

// 3. Events & Registrations
router.get('/events', academicController.getEvents);
router.post('/events', academicController.addEvent);
router.post('/events/:id/register', academicController.toggleEventRegistration);

// 4. Attendance
router.get('/attendance', academicController.getAttendance);
router.post('/attendance', academicController.recordAttendance);

// 5. Subjects & Detailed Syllabus
router.get('/subjects', academicController.getSubjects);
router.get('/subjects/:code', academicController.getSubjectByCode);
router.get('/subject/:code', academicController.getSubjectByCode);
router.post('/subjects', academicController.addSubject);
router.put('/subjects/:code', academicController.updateSubject);

// 6. Marks & Assessments
router.get('/marks', academicController.getMarks);
router.post('/marks', academicController.addMark);
router.delete('/marks/:id', academicController.deleteMark);

// 7. Scrapbook Journal
router.get('/journal', academicController.getJournalEntries);
router.post('/journal', academicController.saveJournalEntry);

// 8. Gentle Plan Tasks
router.get('/tasks', academicController.getTasks);
router.put('/tasks/:id/toggle', academicController.toggleTask);

// 9. Admin Overview
router.get('/admin/stats', academicController.getAdminStats);

module.exports = router;
