# ClockIt ✦

> **Academic Student Workspace & Verification Platform**  
> Designed for **Anna University — Madras Institute of Technology (MIT Campus)**  
> Official R2023 Academic System

---

##  Overview

**ClockIt** is an academic student workspace and official curriculum verification portal tailored for undergraduate engineering students at the Madras Institute of Technology (MIT Campus), Anna University.

The platform provides:
- **Identity Verification Gate**: Secure, roster-verified student sign-in strictly validating against official Anna University MIT Campus UG student rolls (3,790+ registered students across 8 engineering departments).
- **Official R2023 Curriculum & Syllabi**: Live semester-wise academic courses directly sourced from official Anna University Centre for Academic Courses (`cac.annauniv.edu`) syllabi PDFs for:
  - Aeronautical Engineering
  - Automobile Engineering
  - Computer Science & Engineering (Computer Technology)
  - Electronics & Communication Engineering
  - Electronics & Instrumentation Engineering
  - Information Technology
  - Production Engineering
  - Rubber & Plastics Technology
- **Interactive Academic Clock & Schedule Dial**: A 24-hour circular dial visualizing daily class routines, lab sessions, and study slots.
- **Academic Tasks & Semester Milestones**: Assessment calendars, semester end exams, paper submissions, and unit test tracking.
- **Grayscale Photo-to-Doodle Profile Engine**: Handcrafted grayscale illustration filter for student profile pictures.
- **Aesthetic Retro-Bubble Design System**: Vibrant coral-red (`#ff5454`) backdrop, cream typography, and 11 animated four-pointed starbursts (✦).

---

##  Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Custom Variables, Retro Typography, CSS Animations), Modern JavaScript (ES6+ Modules, Fetch API).
- **Backend**: Node.js & Express REST API with MVC Architecture.
- **Database**: Built-in `node:sqlite` (`DatabaseSync`) for zero external native compiler overhead and high reliability.
- **Security & Auth**: Bcryptjs password hashing, JWT authentication tokens, CORS configuration.
- **File Ingestion**: Multer for student profile photos and course materials.

---

##  Project Structure

```
ClockIt/
├── public/
│   └── index.html               # Frontend UI, ClockIt retro design & client controllers
├── src/
│   ├── app.js                   # Express application configuration
│   ├── config/
│   │   ├── index.js             # Environment variables
│   │   ├── db.js                # SQLite database setup & tables schema
│   │   ├── seed.js              # Initial database seeder
│   │   ├── seed_all_mit_curricula.js # Automated PDF parser for official R2023 syllabi
│   │   ├── seed_all_mit_students.js  # Scraper & seeder for official MIT student rolls
│   │   ├── seed_official_dates.js    # Anna University academic milestone dates
│   │   └── seed_official_students.js # Computer Technology student roster
│   ├── controllers/
│   │   ├── academicController.js     # Student verification, curriculum & dates logic
│   │   ├── authController.js         # User registration & session management
│   │   ├── sprintController.js       # Academic tasks & milestones
│   │   └── documentController.js     # Uploads & document handling
│   ├── middleware/
│   │   ├── auth.js              # JWT verification middleware
│   │   ├── upload.js            # Multer upload handler
│   │   └── errorHandler.js      # Global error handling
│   └── routes/
│       ├── academicRoutes.js    # /api/academic routes
│       ├── authRoutes.js        # /api/auth routes
│       └── index.js             # Root API router
├── uploads/                     # Student avatar & file storage
├── server.js                    # Application entry point
├── package.json                 # Dependencies & scripts
└── .env.example                 # Environment configuration template
```

---

##  Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (recommended `v22.x` with built-in SQLite support)
- **npm**: `v9.x` or higher

### Local Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/a-priyanthi/ClockIt.git
   cd ClockIt
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   *(Defaults in `.env.example` work out of the box for local development)*

4. **Start the application**:
   ```bash
   npm start
   ```

5. **Open in browser**:
   Visit [http://localhost:3000](http://localhost:3000)

---

##  Deployment

ClockIt is self-contained with no external database servers required:

### Deploying to Render
1. Create a **New Web Service** pointing to this repository.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (or leave default assigned by Render)
   - `JWT_SECRET`: *(A secure random string)*

### Deploying to Railway / Fly.io / Heroku
- The `Procfile` / `npm start` command will automatically initialize the database schema and serve the web application on `process.env.PORT`.

---

##  Campus Attribution

**Anna University — Madras Institute of Technology (MIT Campus)**  
Chromepet, Chennai, Tamil Nadu 600044  
*Autonomous Academic Student Platform*
