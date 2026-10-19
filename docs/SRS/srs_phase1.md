# Software Requirements Specification (SRS) — Phase 1: Foundation

## 1. Introduction
ResolveX is an AI-powered intelligent college complaint management system designed to streamline grievances from students across multiple academic and residential departments (IT/Network, Hostel, Maintenance, CSE Labs).

## 2. Scope of Phase 1
- **Architectural Foundation**: Complete modular structure for frontend (React 19, Vite, Tailwind CSS, React Router, Axios) and backend (Python Flask, SQLAlchemy, Flask-JWT-Extended, Flask-CORS).
- **Authentication & RBAC**:
  - Roles: `STUDENT`, `STAFF`, `ADMIN`.
  - Secure registration, password hashing (scrypt / PBKDF2), JWT token generation, role verification middleware, and client-side route guards.
- **Data Models**:
  - Relational schema covering 11 entities: User, Department, Category, Complaint, ComplaintHistory, ComplaintAssignment, Notification, ComplaintMessage, DuplicateComplaint, Attachment, Feedback.
- **RESTful API Contracts**:
  - Standardized JSON responses `{ "success": boolean, "message": string, "data": object }` with appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500).
- **UI Design System**:
  - Professional SaaS aesthetic with reusable components (Button, Input, Select, Card, Badge, Modal, Table, Loading, Empty, Error states).

## 3. User Roles and Permissions Matrix
| Action / Route Group | Student | Staff | Admin |
| -------------------- | ------- | ----- | ----- |
| View Landing Page    | Yes     | Yes   | Yes   |
| Register / Login     | Yes     | Yes   | Yes   |
| Student Dashboard    | Yes     | No    | No    |
| Staff Dashboard      | No      | Yes   | Yes   |
| Admin Dashboard      | No      | No    | Yes   |
| Department Mgmt      | No      | No    | Yes   |
