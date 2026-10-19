-- =======================================================
-- ResolveX Database Seed Data (Development / Testing)
-- Default Departments, Categories, and Demo Accounts
-- =======================================================

USE resolvex_db;

-- 1. Seed Departments
INSERT INTO departments (id, name, code, description, is_active) VALUES
(1, 'IT / Network', 'IT_NET', 'Campus IT infrastructure, Wi-Fi networks, and software services', TRUE),
(2, 'Hostel Administration', 'HOSTEL', 'Hostel accommodations, room maintenance, water, and mess facilities', TRUE),
(3, 'Campus Maintenance', 'MAINT', 'Electrical, plumbing, civil infrastructure, and facility maintenance', TRUE),
(4, 'CSE Lab', 'CSE_LAB', 'Computer Science and Engineering laboratories, hardware, and equipment', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Seed Categories
INSERT INTO categories (id, name, department_id, description, is_active) VALUES
(1, 'Wi-Fi & Internet', 1, 'Connectivity, slow speed, login portal, and router issues', TRUE),
(2, 'Hostel & Living', 2, 'Room allocation, furniture, water supply, and cleanliness', TRUE),
(3, 'Campus Infrastructure', 3, 'Electrical points, air conditioning, doors, windows, and sanitation', TRUE),
(4, 'Lab & Equipment', 4, 'Lab computers, projectors, software installation, and peripherals', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 3. Seed Demo Users (Development Accounts)
-- Note: Default Demo Password for all accounts: Demo@1234
-- werkzeug scrypt generated hash:
-- 'scrypt:32768:8:1$KqJpLg9qZ9e4v4Yk$251e60472481ecff6dd74c8612cae066601b1b369ba0f4f9f604ec28203f19159d332616f9f30b91d5cb0d102e173e65eeae6365a6f0fbdeae091bbff17b6dc1'

INSERT INTO users (id, full_name, email, password_hash, role, department_id, phone, student_id_number, is_active) VALUES
(1, 'Demo Administrator', 'admin@resolvex.edu', 'scrypt:32768:8:1$KqJpLg9qZ9e4v4Yk$251e60472481ecff6dd74c8612cae066601b1b369ba0f4f9f604ec28203f19159d332616f9f30b91d5cb0d102e173e65eeae6365a6f0fbdeae091bbff17b6dc1', 'ADMIN', NULL, '+1-555-0100', NULL, TRUE),
(2, 'Demo Staff Member', 'staff@resolvex.edu', 'scrypt:32768:8:1$KqJpLg9qZ9e4v4Yk$251e60472481ecff6dd74c8612cae066601b1b369ba0f4f9f604ec28203f19159d332616f9f30b91d5cb0d102e173e65eeae6365a6f0fbdeae091bbff17b6dc1', 'STAFF', 1, '+1-555-0101', NULL, TRUE),
(3, 'Demo Student', 'student@resolvex.edu', 'scrypt:32768:8:1$KqJpLg9qZ9e4v4Yk$251e60472481ecff6dd74c8612cae066601b1b369ba0f4f9f604ec28203f19159d332616f9f30b91d5cb0d102e173e65eeae6365a6f0fbdeae091bbff17b6dc1', 'STUDENT', NULL, '+1-555-0102', 'STU-2024-8891', TRUE)
ON DUPLICATE KEY UPDATE email=VALUES(email);
