export type Permission =
  | 'view_dashboard'
  | 'manage_users'
  | 'create_users'
  | 'edit_users'
  | 'delete_users'
  | 'view_grades'
  | 'edit_grades'
  | 'view_attendance'
  | 'mark_attendance'
  | 'view_schedule'
  | 'edit_schedule'
  | 'view_assignments'
  | 'create_assignments'
  | 'grade_assignments'
  | 'submit_assignments'
  | 'view_payments'
  | 'create_invoices'
  | 'process_payments'
  | 'view_reports'
  | 'generate_reports'
  | 'manage_school_settings'
  | 'view_social_feed'
  | 'post_social'
  | 'moderate_posts'
  | 'send_announcements'
  | 'view_announcements'
  | 'manage_classes'
  | 'view_student_profiles'
  | 'edit_student_profiles'
  | 'view_parent_info'
  | 'manage_sub_roles'
  | 'view_analytics'
  | 'manage_resources'
  | 'upload_resources'
  | 'view_exams'
  | 'manage_exams'
  | 'view_expenses'
  | 'manage_expenses'
  | 'view_staff_attendance'
  | 'manage_staff_attendance'
  | 'promote_students'
  | 'manage_certificates';

export type SubRole = 'teacher' | 'principal' | 'bursar' | 'secretary' | 'librarian' | 'counselor';

export interface RolePermissions {
  role: string;
  subRole?: SubRole;
  permissions: Permission[];
}

export const MASTER_PERMISSIONS: { [key in Permission]: { label: string; description: string } } = {
  view_dashboard: { label: 'View Dashboard', description: 'Access to dashboard' },
  manage_users: { label: 'Manage Users', description: 'Full user management access' },
  create_users: { label: 'Create Users', description: 'Create new users' },
  edit_users: { label: 'Edit Users', description: 'Edit user information' },
  delete_users: { label: 'Delete Users', description: 'Delete users' },
  view_grades: { label: 'View Grades', description: 'View student grades' },
  edit_grades: { label: 'Edit Grades', description: 'Enter and modify grades' },
  view_attendance: { label: 'View Attendance', description: 'View attendance records' },
  mark_attendance: { label: 'Mark Attendance', description: 'Mark student attendance' },
  view_schedule: { label: 'View Schedule', description: 'View class schedules' },
  edit_schedule: { label: 'Edit Schedule', description: 'Modify class schedules' },
  view_assignments: { label: 'View Assignments', description: 'View assignments' },
  create_assignments: { label: 'Create Assignments', description: 'Create new assignments' },
  grade_assignments: { label: 'Grade Assignments', description: 'Grade student assignments' },
  submit_assignments: { label: 'Submit Assignments', description: 'Submit assignments' },
  view_payments: { label: 'View Payments', description: 'View payment records' },
  create_invoices: { label: 'Create Invoices', description: 'Create invoices' },
  process_payments: { label: 'Process Payments', description: 'Process payment transactions' },
  view_reports: { label: 'View Reports', description: 'View reports' },
  generate_reports: { label: 'Generate Reports', description: 'Generate new reports' },
  manage_school_settings: { label: 'Manage School Settings', description: 'Manage school-wide settings' },
  view_social_feed: { label: 'View Social Feed', description: 'View social media feed' },
  post_social: { label: 'Post on Social', description: 'Create social media posts' },
  moderate_posts: { label: 'Moderate Posts', description: 'Moderate social media posts' },
  send_announcements: { label: 'Send Announcements', description: 'Send school announcements' },
  view_announcements: { label: 'View Announcements', description: 'View announcements' },
  manage_classes: { label: 'Manage Classes', description: 'Manage class assignments' },
  view_student_profiles: { label: 'View Student Profiles', description: 'View student profiles' },
  edit_student_profiles: { label: 'Edit Student Profiles', description: 'Edit student profiles' },
  view_parent_info: { label: 'View Parent Info', description: 'View parent information' },
  manage_sub_roles: { label: 'Manage Sub-Roles', description: 'Create and manage employee sub-roles' },
  view_analytics: { label: 'View Analytics', description: 'View analytics and insights' },
  manage_resources: { label: 'Manage Resources', description: 'Manage educational resources' },
  upload_resources: { label: 'Upload Resources', description: 'Upload educational resources' },
  view_exams: { label: 'View Exams', description: 'View examination records' },
  manage_exams: { label: 'Manage Exams', description: 'Create and manage exams and marks' },
  view_expenses: { label: 'View Expenses', description: 'View school expenses' },
  manage_expenses: { label: 'Manage Expenses', description: 'Record and manage school expenses' },
  view_staff_attendance: { label: 'View Staff Attendance', description: 'View staff attendance records' },
  manage_staff_attendance: { label: 'Manage Staff Attendance', description: 'Mark and manage staff attendance' },
  promote_students: { label: 'Promote Students', description: 'Manage student promotions to next class' },
  manage_certificates: { label: 'Manage Certificates', description: 'Generate ID cards and certificates' }
};

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'view_dashboard',
    'manage_users',
    'create_users',
    'edit_users',
    'delete_users',
    'view_grades',
    'edit_grades',
    'view_attendance',
    'mark_attendance',
    'view_schedule',
    'edit_schedule',
    'view_assignments',
    'create_assignments',
    'grade_assignments',
    'view_payments',
    'create_invoices',
    'process_payments',
    'view_reports',
    'generate_reports',
    'manage_school_settings',
    'view_social_feed',
    'post_social',
    'moderate_posts',
    'send_announcements',
    'view_announcements',
    'manage_classes',
    'view_student_profiles',
    'edit_student_profiles',
    'view_parent_info',
    'manage_sub_roles',
    'view_analytics',
    'manage_resources',
    'upload_resources',
    'view_exams',
    'manage_exams',
    'view_expenses',
    'manage_expenses',
    'view_staff_attendance',
    'manage_staff_attendance',
    'promote_students',
    'manage_certificates'
  ],
  student: [
    'view_dashboard',
    'view_grades',
    'view_attendance',
    'view_schedule',
    'view_assignments',
    'submit_assignments',
    'view_social_feed',
    'post_social',
    'view_announcements',
    'view_exams'
  ],
  parent: [
    'view_dashboard',
    'view_grades',
    'view_attendance',
    'view_schedule',
    'view_assignments',
    'view_payments',
    'view_social_feed',
    'post_social',
    'view_announcements',
    'view_exams'
  ]
};

export const SUB_ROLE_PERMISSIONS: Record<SubRole, Permission[]> = {
  teacher: [
    'view_dashboard',
    'view_grades',
    'edit_grades',
    'view_attendance',
    'mark_attendance',
    'view_schedule',
    'view_assignments',
    'create_assignments',
    'grade_assignments',
    'view_social_feed',
    'post_social',
    'view_announcements',
    'send_announcements',
    'manage_classes',
    'view_student_profiles',
    'upload_resources',
    'view_exams',
    'manage_exams'
  ],
  principal: [
    'view_dashboard',
    'manage_users',
    'create_users',
    'edit_users',
    'view_grades',
    'edit_grades',
    'view_attendance',
    'mark_attendance',
    'view_schedule',
    'edit_schedule',
    'view_assignments',
    'create_assignments',
    'grade_assignments',
    'view_payments',
    'view_reports',
    'generate_reports',
    'manage_school_settings',
    'view_social_feed',
    'post_social',
    'moderate_posts',
    'send_announcements',
    'view_announcements',
    'manage_classes',
    'view_student_profiles',
    'edit_student_profiles',
    'view_parent_info',
    'view_analytics',
    'manage_resources',
    'upload_resources',
    'view_exams',
    'manage_exams',
    'view_expenses',
    'view_staff_attendance',
    'manage_staff_attendance',
    'promote_students',
    'manage_certificates'
  ],
  bursar: [
    'view_dashboard',
    'view_payments',
    'create_invoices',
    'process_payments',
    'view_reports',
    'generate_reports',
    'view_student_profiles',
    'view_parent_info',
    'view_announcements',
    'view_expenses',
    'manage_expenses'
  ],
  secretary: [
    'view_dashboard',
    'view_grades',
    'view_attendance',
    'view_schedule',
    'edit_schedule',
    'view_assignments',
    'view_payments',
    'view_reports',
    'view_social_feed',
    'post_social',
    'send_announcements',
    'view_announcements',
    'view_student_profiles',
    'edit_student_profiles',
    'view_parent_info'
  ],
  librarian: [
    'view_dashboard',
    'view_schedule',
    'view_social_feed',
    'post_social',
    'view_announcements',
    'manage_resources',
    'upload_resources',
    'view_student_profiles'
  ],
  counselor: [
    'view_dashboard',
    'view_grades',
    'view_attendance',
    'view_schedule',
    'view_social_feed',
    'post_social',
    'view_announcements',
    'send_announcements',
    'view_student_profiles',
    'edit_student_profiles',
    'view_parent_info'
  ]
};

export function getPermissionsForRole(role: string, subRole?: SubRole): Permission[] {
  if (role === 'admin') {
    return DEFAULT_ROLE_PERMISSIONS.admin ?? [];
  }
  
  if (role === 'employee' && subRole) {
    return SUB_ROLE_PERMISSIONS[subRole] ?? [];
  }
  
  if (role === 'employee' && !subRole) {
    return SUB_ROLE_PERMISSIONS.teacher ?? [];
  }
  
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(userPermissions: Permission[], permission: Permission): boolean {
  return userPermissions.includes(permission);
}

export function hasAnyPermission(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.some(p => userPermissions.includes(p));
}

export function hasAllPermissions(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.every(p => userPermissions.includes(p));
}