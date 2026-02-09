import {
  User,
  Post,
  Grade,
  Assignment,
  Attendance,
  Schedule,
  mockUsers,
  mockPosts,
  mockGrades,
  mockAssignments,
  mockAttendance,
  mockSchedule,
  UserRole,
  saveUsers
} from './mockData';

const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
  auth: {
    login: async (email: string, password: string): Promise<User | null> => {
      await delay();
      const user = mockUsers.find(u => u.email === email);
      if (user && user.password === password) {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      }
      return null;
    },

    register: async (data: {
      email: string;
      password: string;
      name: string;
      role: UserRole;
      subRole?: string;
      studentId?: string;
      employeeId?: string;
    }): Promise<User> => {
      await delay();
      const newUser: User = {
        id: `${data.role}${Date.now()}`,
        email: data.email,
        name: data.name,
        role: data.role,
        password: data.password,
        profileCompletion: 40,
        verified: false,
        schoolLinked: false,
        points: data.role === 'student' ? 0 : undefined,
        badges: data.role === 'student' ? [] : undefined
      };
      
      if (data.role === 'student' && data.studentId) {
        (newUser as any).studentId = data.studentId;
        (newUser as any).grade = '10';
        (newUser as any).classSection = 'A';
      }
      
      if (data.role === 'employee' && data.employeeId) {
        (newUser as any).employeeId = data.employeeId;
        (newUser as any).subjects = [];
        (newUser as any).classes = [];
        (newUser as any).subRole = data.subRole || 'teacher';
      }
      
      mockUsers.push(newUser);
      saveUsers(mockUsers);
      
      const { password: _, ...userWithoutPassword } = newUser;
      localStorage.setItem('campus_user', JSON.stringify(userWithoutPassword));
      
      return userWithoutPassword as User;
    },

    updateProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
      await delay();
      
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        const currentPassword = mockUsers[userIndex].password;
        const updatedUser = { ...mockUsers[userIndex], ...updates, password: currentPassword };
        mockUsers[userIndex] = updatedUser;
        saveUsers(mockUsers);
        
        const { password: _, ...userWithoutPassword } = updatedUser;
        localStorage.setItem('campus_user', JSON.stringify(userWithoutPassword));
        return userWithoutPassword as User;
      }
      
      throw new Error('User not found');
    }
  },

  posts: {
    getFeed: async (): Promise<Post[]> => {
      await delay();
      return [...mockPosts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    },

    createPost: async (post: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments'>): Promise<Post> => {
      await delay();
      return {
        ...post,
        id: `post${Date.now()}`,
        timestamp: new Date(),
        likes: 0,
        comments: []
      };
    },

    likePost: async (postId: string): Promise<void> => {
      await delay();
    },

    addComment: async (postId: string, content: string, authorId: string, authorName: string): Promise<void> => {
      await delay();
    }
  },

  grades: {
    getGradesByStudent: async (studentId: string): Promise<Grade[]> => {
      await delay();
      return mockGrades.filter(g => g.studentId === studentId);
    },

    addGrade: async (grade: Omit<Grade, 'id'>): Promise<Grade> => {
      await delay();
      return {
        ...grade,
        id: `g${Date.now()}`
      };
    }
  },

  assignments: {
    getAssignments: async (): Promise<Assignment[]> => {
      await delay();
      return mockAssignments;
    },

    submitAssignment: async (assignmentId: string): Promise<void> => {
      await delay();
    }
  },

  attendance: {
    getAttendanceByStudent: async (studentId: string): Promise<Attendance[]> => {
      await delay();
      return mockAttendance.filter(a => a.studentId === studentId);
    },

    markAttendance: async (attendance: Omit<Attendance, 'id'>): Promise<Attendance> => {
      await delay();
      return {
        ...attendance,
        id: `att${Date.now()}`
      };
    }
  },

  schedule: {
    getSchedule: async (): Promise<Schedule[]> => {
      await delay();
      return mockSchedule;
    }
  },

  users: {
    getAllUsers: async (): Promise<User[]> => {
      await delay();
      return mockUsers.map(({ password: _, ...user }) => user as User);
    },

    getUserById: async (userId: string): Promise<User | null> => {
      await delay();
      const user = mockUsers.find(u => u.id === userId);
      if (!user) return null;
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    },

    createUser: async (user: Omit<User, 'id'>): Promise<User> => {
      await delay();
      const newUser = {
        ...user,
        id: `user${Date.now()}`
      };
      const { password: _, ...userWithoutPassword } = newUser;
      return userWithoutPassword as User;
    }
  }
};
