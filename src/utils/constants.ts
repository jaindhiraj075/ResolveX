export const ROLES = {
  STUDENT: 'STUDENT',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const COMPLAINT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  INFORMATION_REQUIRED: 'INFORMATION_REQUIRED',
  RESOLVED: 'RESOLVED',
  REOPENED: 'REOPENED',
  CLOSED: 'CLOSED',
  CLOSED_AS_DUPLICATE: 'CLOSED_AS_DUPLICATE',
} as const;

export const COMPLAINT_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export const DEMO_CREDENTIALS = [
  { role: 'Student', email: 'student@resolvex.edu', pass: 'Student@123', label: 'Student Portal' },
  { role: 'Staff', email: 'staff@resolvex.edu', pass: 'Staff@123', label: 'Department Staff (IT)' },
  { role: 'Admin', email: 'admin@resolvex.edu', pass: 'Admin@123', label: 'System Admin' },
];
