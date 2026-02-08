import { SubRole } from '@/lib/permissions';
import { extendedPosts, mockCommunities, mockChats, mockNotifications } from './socialMockData';

export type UserRole = 'admin' | 'student' | 'parent' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  profileCompletion: number;
  points?: number;
  badges?: string[];
  verified: boolean;
  schoolLinked: boolean;
  password?: string;
}

export interface Student extends User {
  role: 'student';
  studentId: string;
  grade: string;
  classSection: string;
}

export interface Parent extends User {
  role: 'parent';
  children: string[];
}

export interface Employee extends User {
  role: 'employee';
  employeeId: string;
  subjects?: string[];
  classes?: string[];
  subRole: SubRole;
}

export interface Admin extends User {
  role: 'admin';
  adminId: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  timestamp: Date;
  likes: number;
  comments: Comment[];
  tags: string[];
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Date;
}

export interface Grade {
  id: string;
  studentId: string;
  subject: string;
  score: number;
  maxScore: number;
  date: Date;
  term: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: Date;
  submitted: boolean;
  score?: number;
  maxScore: number;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: Date;
  status: 'present' | 'absent' | 'late';
}

export interface Schedule {
  id: string;
  day: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
}

const defaultUsers: User[] = [
  {
    id: 'admin1',
    email: 'admin@campus.com',
    name: 'John Smith',
    role: 'admin',
    avatar: '👨‍💼',
    phone: '+1234567890',
    profileCompletion: 100,
    verified: true,
    schoolLinked: true,
    password: 'password',
    adminId: 'ADM001'
  } as Admin,
  {
    id: 'student1',
    email: 'alice@campus.com',
    name: 'Alice Johnson',
    role: 'student',
    avatar: '👧',
    phone: '+1234567891',
    profileCompletion: 80,
    points: 1250,
    badges: ['top-performer', 'early-bird', 'helpful'],
    verified: true,
    schoolLinked: true,
    password: 'password',
    studentId: 'STU001',
    grade: '10',
    classSection: 'A'
  } as Student,
  {
    id: 'parent1',
    email: 'parent@campus.com',
    name: 'Sarah Johnson',
    role: 'parent',
    avatar: '👩',
    phone: '+1234567892',
    profileCompletion: 90,
    verified: true,
    schoolLinked: true,
    password: 'password',
    children: ['student1']
  } as Parent,
  {
    id: 'employee1',
    email: 'teacher@campus.com',
    name: 'Michael Brown',
    role: 'employee',
    avatar: '👨‍🏫',
    phone: '+1234567893',
    profileCompletion: 95,
    verified: true,
    schoolLinked: true,
    password: 'password',
    employeeId: 'EMP001',
    subjects: ['Mathematics', 'Physics'],
    classes: ['10A', '10B', '11A'],
    subRole: 'teacher'
  } as Employee,
  {
    id: 'principal1',
    email: 'principal@campus.com',
    name: 'Dr. Elizabeth Wilson',
    role: 'employee',
    avatar: '👩‍💼',
    phone: '+1234567894',
    profileCompletion: 100,
    verified: true,
    schoolLinked: true,
    password: 'password',
    employeeId: 'EMP002',
    subjects: [],
    classes: [],
    subRole: 'principal'
  } as Employee,
  {
    id: 'bursar1',
    email: 'bursar@campus.com',
    name: 'Robert Martinez',
    role: 'employee',
    avatar: '💼',
    phone: '+1234567895',
    profileCompletion: 100,
    verified: true,
    schoolLinked: true,
    password: 'password',
    employeeId: 'EMP003',
    subjects: [],
    classes: [],
    subRole: 'bursar'
  } as Employee,
  {
    id: 'secretary1',
    email: 'secretary@campus.com',
    name: 'Patricia Lee',
    role: 'employee',
    avatar: '📋',
    phone: '+1234567896',
    profileCompletion: 95,
    verified: true,
    schoolLinked: true,
    password: 'password',
    employeeId: 'EMP004',
    subjects: [],
    classes: [],
    subRole: 'secretary'
  } as Employee,
  {
    id: 'gov1',
    email: 'ministry@education.gov',
    name: 'Ministry of Education',
    role: 'admin',
    avatar: '🏛️',
    profileCompletion: 100,
    verified: true,
    schoolLinked: false,
    password: 'password',
    adminId: 'GOV001'
  } as Admin,
  {
    id: 'student2',
    email: 'bob@campus.com',
    name: 'Bob Wilson',
    role: 'student',
    avatar: '👦',
    profileCompletion: 75,
    points: 980,
    badges: ['helpful'],
    verified: true,
    schoolLinked: true,
    password: 'password',
    studentId: 'STU002',
    grade: '10',
    classSection: 'A'
  } as Student,
  {
    id: 'student3',
    email: 'emma@campus.com',
    name: 'Emma Davis',
    role: 'student',
    avatar: '👧',
    profileCompletion: 85,
    points: 1100,
    badges: ['creative-mind'],
    verified: true,
    schoolLinked: true,
    password: 'password',
    studentId: 'STU003',
    grade: '10',
    classSection: 'B'
  } as Student
];

function loadUsers(): User[] {
  const stored = localStorage.getItem('campus_all_users');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [...defaultUsers];
    }
  }
  return [...defaultUsers];
}

function saveUsers(users: User[]) {
  localStorage.setItem('campus_all_users', JSON.stringify(users));
}

export const mockUsers: User[] = loadUsers();

export const mockPosts: Post[] = extendedPosts;

export { mockCommunities, mockChats, mockNotifications };

export const mockGrades: Grade[] = [
  {
    id: 'g1',
    studentId: 'student1',
    subject: 'Mathematics',
    score: 92,
    maxScore: 100,
    date: new Date('2025-09-25'),
    term: 'Term 1'
  },
  {
    id: 'g2',
    studentId: 'student1',
    subject: 'Physics',
    score: 88,
    maxScore: 100,
    date: new Date('2025-09-26'),
    term: 'Term 1'
  },
  {
    id: 'g3',
    studentId: 'student1',
    subject: 'Chemistry',
    score: 95,
    maxScore: 100,
    date: new Date('2025-09-27'),
    term: 'Term 1'
  },
  {
    id: 'g4',
    studentId: 'student1',
    subject: 'English',
    score: 90,
    maxScore: 100,
    date: new Date('2025-09-28'),
    term: 'Term 1'
  }
];

export const mockAssignments: Assignment[] = [
  {
    id: 'a1',
    title: 'Quadratic Equations Worksheet',
    subject: 'Mathematics',
    description: 'Complete exercises 1-20 from Chapter 5',
    dueDate: new Date('2025-10-05'),
    submitted: false,
    maxScore: 20
  },
  {
    id: 'a2',
    title: 'Newton\'s Laws Lab Report',
    subject: 'Physics',
    description: 'Write a detailed lab report on the experiments conducted',
    dueDate: new Date('2025-10-08'),
    submitted: true,
    score: 18,
    maxScore: 20
  },
  {
    id: 'a3',
    title: 'Shakespearean Essay',
    subject: 'English',
    description: 'Write a 500-word essay on Hamlet',
    dueDate: new Date('2025-10-10'),
    submitted: false,
    maxScore: 25
  }
];

export const mockAttendance: Attendance[] = [
  {
    id: 'att1',
    studentId: 'student1',
    date: new Date('2025-10-01'),
    status: 'present'
  },
  {
    id: 'att2',
    studentId: 'student1',
    date: new Date('2025-09-30'),
    status: 'present'
  },
  {
    id: 'att3',
    studentId: 'student1',
    date: new Date('2025-09-29'),
    status: 'late'
  }
];

export const mockSchedule: Schedule[] = [
  {
    id: 's1',
    day: 'Monday',
    time: '08:00 - 09:00',
    subject: 'Mathematics',
    teacher: 'Michael Brown',
    room: 'Room 101'
  },
  {
    id: 's2',
    day: 'Monday',
    time: '09:00 - 10:00',
    subject: 'Physics',
    teacher: 'Michael Brown',
    room: 'Lab 1'
  },
  {
    id: 's3',
    day: 'Monday',
    time: '10:30 - 11:30',
    subject: 'Chemistry',
    teacher: 'Dr. Emily White',
    room: 'Lab 2'
  },
  {
    id: 's4',
    day: 'Monday',
    time: '11:30 - 12:30',
    subject: 'English',
    teacher: 'Ms. Jane Davis',
    room: 'Room 205'
  },
  {
    id: 's5',
    day: 'Tuesday',
    time: '08:00 - 09:00',
    subject: 'History',
    teacher: 'Mr. Robert Wilson',
    room: 'Room 103'
  }
];

export { saveUsers };

export const badges = [
  { id: 'top-performer', name: 'Top Performer', icon: '🏆', description: 'Achieved top grades' },
  { id: 'early-bird', name: 'Early Bird', icon: '🌅', description: 'Never late to class' },
  { id: 'helpful', name: 'Helpful Hand', icon: '🤝', description: 'Helped fellow students' },
  { id: 'perfect-attendance', name: 'Perfect Attendance', icon: '✅', description: '100% attendance' },
  { id: 'creative-mind', name: 'Creative Mind', icon: '🎨', description: 'Outstanding project work' }
];
