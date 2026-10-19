# ResolveX — AI-Powered Intelligent College Complaint Management System

**ResolveX** is a modern, web-based college complaint management platform engineered to replace disorganized paper registers and ad-hoc email threads with an intelligent, auditable grievance resolution pipeline.

> **"Raise it. Track it. Resolve it."**

The platform is designed to serve three core collegiate roles:
1. **Students:** Submit grievances with automated categorization, monitor progress in real-time, view SLA targets, and inspect full timeline audits.
2. **Department Staff:** Review assignments routed directly to their department (IT/Network, Hostel, Maintenance, CSE Lab), update operational statuses, request clarification, and record resolution notes.
3. **Administrators:** Centralized visibility across all campus departments, user directory governance, SLA breach tracking, and institutional reporting.

---

## Features (Roadmap & Modules)

- **AI-Powered Categorization (NLP):** Automatically analyzes grievance descriptions using TF-IDF and supervised classification to tag categories and suggest departments.
- **Smart Department Routing:** Instantly dispatches complaints to relevant campus units without bureaucratic lag.
- **Duplicate Detection:** Employs Cosine Similarity to group repetitive complaints (e.g., campus-wide Wi-Fi down in a hostel block), preventing duplicate tickets.
- **Role-Based Access Control (RBAC):** Strict isolation between Student, Staff, and Admin interfaces with backend JWT verification.
- **SLA & Timeline Auditing:** Granular status transitions (`PENDING`, `PROCESSING`, `ASSIGNED`, `IN_PROGRESS`, `INFORMATION_REQUIRED`, `RESOLVED`, `CLOSED`) with immutable history logs.

---

## Tech Stack

### Frontend
- **Framework:** React 19 (Vite SPA)
- **Routing:** React Router v7 (`react-router-dom`)
- **Styling:** Tailwind CSS v4
- **State & Context:** React AuthContext + Custom Hooks (`useAuth`)
- **HTTP Client:** Axios with JWT request & response interceptors
- **Icons:** Lucide React
- **Analytics (Future):** Recharts

### Backend
- **Framework:** Python 3.10+ / 3.11+, Flask 3.1
- **CORS:** Flask-CORS
- **ORM:** SQLAlchemy 2.0 / Flask-SQLAlchemy 3.1
- **Authentication:** Flask-JWT-Extended (JSON Web Tokens)
- **Password Security:** Werkzeug Secure Hashing (scrypt / PBKDF2)
- **Environment Management:** python-dotenv

### Database
- **Primary:** MySQL 8.0+ / MariaDB (production)
- **Development/Fallback:** SQLite (instant local zero-config testing)
- **Driver:** PyMySQL + Cryptography

### AI Module (Staged for Phase 4)
- Python Scikit-learn, Pandas, NumPy, TF-IDF Vectorizer, Cosine Similarity, Naive Bayes / Logistic Regression classifier.

---

## Project Structure

```
ResolveX/
├── backend/
│   ├── app/
│   │   ├── config/              # Flask environment configs
│   │   ├── middleware/          # JWT and role-based access decorators
│   │   ├── models/              # SQLAlchemy relational models (11 entities)
│   │   ├── routes/              # Modular blueprints (auth, complaints, staff, admin, notifications)
│   │   ├── services/            # Decoupled business logic (AuthService, ComplaintService, etc.)
│   │   ├── utils/               # Response formatters & sequential ID generator (RX-1001)
│   │   ├── extensions.py        # SQLAlchemy, JWT, CORS singletons
│   │   └── __init__.py          # Flask application factory (create_app)
│   ├── ai/                      # Stubs for Phase 4 ML pipelines
│   │   ├── preprocessing/
│   │   ├── classification/
│   │   ├── duplicate_detection/
│   │   └── models/
│   ├── uploads/                 # Storage for attachment proofs
│   ├── tests/                   # Backend unit tests (test_auth.py)
│   ├── run.py                   # Flask server entry point (Port 5000)
│   ├── requirements.txt         # Python dependencies
│   └── .env.example
├── database/
│   ├── schema.sql               # Production MySQL 8.0 DDL (11 tables, constraints, indexes)
│   └── seed.sql                 # Initial departments, categories, and demo accounts
├── docs/
│   ├── diagrams/                # System architecture diagrams
│   ├── SRS/                     # Software requirements specification
│   └── reports/                 # Phase milestones & delivery reports
├── src/                         # React Frontend Application
│   ├── components/
│   │   ├── auth/                # ProtectedRoute with RBAC guards
│   │   └── common/              # Reusable SaaS UI components (Button, Input, Card, Modal, Table, etc.)
│   ├── context/                 # AuthContext (user, token, session lifecycle)
│   ├── hooks/                   # useAuth custom hook
│   ├── layouts/                 # PublicLayout & DashboardLayout with responsive sidebar
│   ├── pages/
│   │   ├── auth/                # Login & Registration pages with demo autofill
│   │   ├── public/              # Modern SaaS Landing Page
│   │   ├── student/             # Student portal pages (Dashboard, Complaints, Submit, Details, etc.)
│   │   ├── staff/               # Staff portal pages (Dashboard, Queue, Action modals)
│   │   └── admin/               # Admin console (Overview, Directory, Departments, Categories)
│   ├── services/                # Axios API layer (authService, complaintService)
│   ├── utils/                   # Role and Status constants
│   ├── App.tsx                  # Client router declaration
│   └── main.tsx                 # React DOM mount point
├── package.json
├── vite.config.ts               # Vite bundler with Flask proxy (/api -> 5000)
└── README.md
```

---

## Installation & Setup

### 1. Prerequisites
- Node.js 18+ and npm
- Python 3.10+ and pip
- MySQL 8.0+ (optional; SQLite works out-of-the-box for development)

### 2. Backend Setup
```bash
# Navigate to project root
pip install -r backend/requirements.txt

# Configure environment
cp backend/.env.example backend/.env

# Run database tests
python3 backend/tests/test_auth.py
```

### 3. Frontend Setup
```bash
# Install Node dependencies
npm install

# Start development server
npm run dev
```

---

## Running the Complete System

In development, the system runs with two complementary services:

1. **Flask API Backend (Port 5000):**
```bash
python3 backend/run.py
```

2. **React + Vite Frontend (Port 3000):**
```bash
npm run dev
```

All requests from the React application to `/api/*` are automatically proxied by Vite to the Python Flask backend.

---

## Demo Accounts (Development Environment)

| Role | Email | Password | Assigned Scope |
| ---- | ----- | -------- | -------------- |
| **Student** | `student@resolvex.edu` | `Student@123` | Student Dashboard & Complaint Filing |
| **Department Staff** | `staff@resolvex.edu` | `Staff@123` | IT / Network Department Queue |
| **Administrator** | `admin@resolvex.edu` | `Admin@123` | System Administration & Cross-Department |

*Tip: On the Login page or Landing page, one-click demo credentials allow instant sign-in.*

---

## Development Roadmap

- [x] **Phase 1: Project Foundation & Architecture**
  - Modular frontend and backend structure.
  - Relational schema (11 tables) and seed data.
  - JWT authentication with secure password hashing.
  - Role-based routing (Student, Staff, Admin) and protected routes.
  - Reusable SaaS design system and landing page.
- [x] **Phase 2: Authentication, Authorization & Role-Based Dashboards**
  - Complete JWT auth flow (register, login, logout, me, refresh, profile update).
  - Role-based layouts (StudentLayout, StaffLayout, AdminLayout) with responsive sidebars and headers.
  - Centralized AuthContext with automatic session expiration handling.
  - Server-enforced RBAC decorators (@role_required) and 403 Access Denied experience.
  - Role-specific dashboard foundations with summary cards and authentic zero states.
- [x] **Phase 3: Student Complaint Submission & Core Complaint Workflow**
  - Robust Complaint Submission with validation, attachment handling, and human-readable IDs (`RX-YYYY-000001`).
  - Complaint timeline audit trail tracking lifecycle milestones (Submission, Assignment, In Progress, Info Requested, Student Responded, Resolved).
  - Student "My Complaints" and "Complaint Details" with interactive information response.
  - Staff "Assigned Complaints" with "Start Work", "Request Information", and "Resolve Complaint" workflows.
  - Admin "All Complaints" directory with staff assignment and re-assignment capabilities.
  - In-app notification triggers across core lifecycle events.
- [x] **Phase 4: AI Complaint Intelligence Layer**
  - Real NLP Preprocessing (`ComplaintPreprocessor`) and TF-IDF feature vectorization.
  - Machine Learning Category and Priority classification trained on real campus grievance dataset.
  - Dynamic Department Mapping and probability-based confidence calculations.
  - Cosine similarity duplicate detection with configurable threshold (`DUPLICATE_THRESHOLD = 0.65`).
  - Automatic `CLOSED_AS_DUPLICATE` workflow linking duplicate tickets to active original complaints.
  - Staff & Administrator human override system preserving original AI predictions with audit reasoning.
  - Interactive AI Analysis UI Card with low-confidence flagging and real-time processing telemetry.
- [x] **Phase 5: SLA, Escalation, Advanced Notifications, Feedback & Reopen Workflow**
  - Backend-driven SLA calculation based on priority tiers (`HIGH` = 24h, `MEDIUM` = 48h, `LOW` = 72h).
  - SLA status monitoring: `ON_TRACK`, `DUE_SOON` (≤25% remaining), `OVERDUE`, and `RESOLVED`.
  - Multi-tiered escalation engine: Level 1 (Overdue) and Level 2 (Critical overdue >2x SLA cycle).
  - Idempotent SLA background processing preventing duplicate notifications.
  - Student resolution feedback workflow (1–5 star rating and optional remarks) on resolved complaints.
  - Complaint reopening workflow requiring justification, resetting SLA cycle, and notifying department staff.
  - Extended grievance audit timeline tracking SLA milestones, feedback, and reopen events.
  - Real-time in-app notification bell with unread badge, quick actions, and direct ticket navigation.
  - Department and Admin SLA monitoring tables and filters (`All`, `On Track`, `Due Soon`, `Overdue`).
- [x] **Phase 6: Admin Analytics, Reports & Management Intelligence**
  - Enterprise Analytics Service (`AnalyticsService`) with SQL aggregations, date grouping, and zero client-side bulk calculation overhead.
  - Consolidated KPI metrics: Total volume, Pending, In Progress, Resolved, Overdue, Average Resolution Hours, SLA Compliance %, and Average Student Rating.
  - Previous-period comparative analysis (% change calculation against equal preceding timeframe).
  - Deterministic, data-driven operational insights generated from live database records.
  - Recharts visual telemetry: Complaints Over Time (Area Chart with Day/Week/Month selector), Status Distribution (Donut Chart), and Priority Breakdown (Bar Chart).
  - Department and Category intelligence: Horizontal Category Volume Bar Chart and Department Operational Performance Matrix.
  - Staff operational workload table tracking active caseload, completed volume, overdue tickets, SLA met rate, and average student rating per officer.
  - Dedicated Staff Member Performance Detail page (`/admin/staff/:id`) with officer audit timeline and student reviews.
  - Student resolution survey telemetry (1–5 star rating distribution and feedback response rate %).
  - Responsible AI operations telemetry tracking total inferences, low-confidence flags (&lt;50%), duplicate detections, and human overrides.
  - Institutional Reports Audit Center (`/admin/reports`) with selectable report types, live data table preview, and printable layout.
  - Tabular CSV export (`/api/admin/analytics/export`) with dynamic date range and department filtering.
- [ ] **Phase 7: Production Hardening & Final Verification**
- [ ] **Phase 8: Production Polish, Security Hardening & Full Deployment**
