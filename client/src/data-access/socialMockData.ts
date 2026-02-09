import { Post, Comment, UserRole } from './mockData';

export type PostCategory = 'news' | 'resources' | 'opportunities' | 'discussions' | 'announcements' | 'events' | 'achievements';

export interface ExtendedPost extends Post {
  category: PostCategory;
  media?: {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  };
  visibility: 'public' | 'school' | 'class';
  scheduled?: Date;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  type: 'school' | 'class' | 'club' | 'department' | 'public';
  memberCount: number;
  members: string[];
  createdBy: string;
  avatar?: string;
}

export interface ChatConversation {
  id: string;
  type: 'private' | 'group';
  participants: string[];
  participantNames: string[];
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  avatar?: string;
  name?: string;
}

export interface Notification {
  id: string;
  type: 'campus' | 'social';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  icon?: string;
}

export const extendedPosts: ExtendedPost[] = [
  {
    id: 'post1',
    authorId: 'employee1',
    authorName: 'Michael Brown',
    authorRole: 'employee',
    content: '📚 Reminder: Math quiz tomorrow on Chapter 5 - Quadratic Equations. Review your notes!',
    timestamp: new Date('2025-10-07T10:30:00'),
    likes: 45,
    comments: [
      {
        id: 'c1',
        authorId: 'student1',
        authorName: 'Alice Johnson',
        content: 'Thanks for the reminder, sir!',
        timestamp: new Date('2025-10-07T11:00:00')
      }
    ],
    tags: ['academics', 'mathematics'],
    category: 'announcements',
    visibility: 'class'
  },
  {
    id: 'post2',
    authorId: 'admin1',
    authorName: 'John Smith',
    authorRole: 'admin',
    content: '🎉 School Annual Day on October 15th! All students and parents are invited. Cultural performances, sports events, and prize distribution ceremony.',
    timestamp: new Date('2025-10-06T14:00:00'),
    likes: 128,
    comments: [
      {
        id: 'c2',
        authorId: 'parent1',
        authorName: 'Sarah Johnson',
        content: 'Looking forward to it! Will there be parent participation?',
        timestamp: new Date('2025-10-06T14:30:00')
      }
    ],
    tags: ['announcement', 'events'],
    category: 'events',
    visibility: 'public',
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400'
    }
  },
  {
    id: 'post3',
    authorId: 'student1',
    authorName: 'Alice Johnson',
    authorRole: 'student',
    content: 'Just completed my science project on renewable energy! 🌱 It was challenging but fun! Thanks to everyone who helped.',
    timestamp: new Date('2025-10-07T16:00:00'),
    likes: 67,
    comments: [
      {
        id: 'c3',
        authorId: 'employee1',
        authorName: 'Michael Brown',
        content: 'Great work, Alice! Looking forward to your presentation.',
        timestamp: new Date('2025-10-07T16:30:00')
      }
    ],
    tags: ['academics', 'science', 'projects'],
    category: 'achievements',
    visibility: 'public'
  },
  {
    id: 'post4',
    authorId: 'principal1',
    authorName: 'Dr. Elizabeth Wilson',
    authorRole: 'employee',
    content: '📢 Important Update: New safety protocols will be implemented starting next week. Please review the attached guidelines.',
    timestamp: new Date('2025-10-07T09:00:00'),
    likes: 89,
    comments: [],
    tags: ['announcement', 'safety', 'policy'],
    category: 'news',
    visibility: 'public'
  },
  {
    id: 'post5',
    authorId: 'student2',
    authorName: 'Bob Wilson',
    authorRole: 'student',
    content: '🏆 Our debate team won the inter-school competition! Special thanks to Coach Martinez for the guidance. #TeamWork',
    timestamp: new Date('2025-10-06T18:00:00'),
    likes: 156,
    comments: [
      {
        id: 'c4',
        authorId: 'employee1',
        authorName: 'Michael Brown',
        content: 'Congratulations to the entire team! Well deserved victory!',
        timestamp: new Date('2025-10-06T18:15:00')
      },
      {
        id: 'c5',
        authorId: 'admin1',
        authorName: 'John Smith',
        content: 'Proud of our students! Keep up the great work.',
        timestamp: new Date('2025-10-06T18:20:00')
      }
    ],
    tags: ['achievements', 'debate', 'competition'],
    category: 'achievements',
    visibility: 'public',
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400'
    }
  },
  {
    id: 'post6',
    authorId: 'gov1',
    authorName: 'Ministry of Education',
    authorRole: 'admin',
    content: '📋 New Education Policy 2025: Digital learning initiatives and updated curriculum guidelines released. Schools are encouraged to adopt these changes by next semester.',
    timestamp: new Date('2025-10-05T10:00:00'),
    likes: 234,
    comments: [
      {
        id: 'c6',
        authorId: 'principal1',
        authorName: 'Dr. Elizabeth Wilson',
        content: 'We will begin implementation planning this week.',
        timestamp: new Date('2025-10-05T11:00:00')
      }
    ],
    tags: ['government', 'policy', 'education'],
    category: 'news',
    visibility: 'public'
  },
  {
    id: 'post7',
    authorId: 'employee2',
    authorName: 'Sarah Martinez',
    authorRole: 'employee',
    content: '📖 Free online course on Advanced Mathematics available! Great opportunity for students preparing for competitive exams. Link in comments.',
    timestamp: new Date('2025-10-06T12:00:00'),
    likes: 92,
    comments: [],
    tags: ['resources', 'mathematics', 'courses'],
    category: 'resources',
    visibility: 'public'
  },
  {
    id: 'post8',
    authorId: 'student3',
    authorName: 'Emma Davis',
    authorRole: 'student',
    content: '💡 Study tip: Use the Pomodoro Technique! 25 minutes of focused study followed by 5-minute breaks. Game changer for me!',
    timestamp: new Date('2025-10-07T08:00:00'),
    likes: 78,
    comments: [
      {
        id: 'c7',
        authorId: 'student1',
        authorName: 'Alice Johnson',
        content: 'I tried this last week, really helps with concentration!',
        timestamp: new Date('2025-10-07T08:30:00')
      }
    ],
    tags: ['study-tips', 'productivity'],
    category: 'discussions',
    visibility: 'public'
  },
  {
    id: 'post9',
    authorId: 'bursar1',
    authorName: 'Robert Martinez',
    authorRole: 'employee',
    content: '💳 Fee payment deadline extended to October 20th. Online payment portal is now active. For queries, contact the accounts office.',
    timestamp: new Date('2025-10-05T15:00:00'),
    likes: 145,
    comments: [],
    tags: ['fees', 'payment', 'announcement'],
    category: 'announcements',
    visibility: 'school'
  },
  {
    id: 'post10',
    authorId: 'parent2',
    authorName: 'David Thompson',
    authorRole: 'parent',
    content: '🙏 Thank you to all the teachers for the excellent parent-teacher meeting yesterday. Very informative and helpful!',
    timestamp: new Date('2025-10-06T20:00:00'),
    likes: 56,
    comments: [
      {
        id: 'c8',
        authorId: 'principal1',
        authorName: 'Dr. Elizabeth Wilson',
        content: 'Glad it was helpful! We value parent engagement.',
        timestamp: new Date('2025-10-06T20:15:00')
      }
    ],
    tags: ['parent-teacher', 'appreciation'],
    category: 'discussions',
    visibility: 'public'
  },
  {
    id: 'post11',
    authorId: 'student4',
    authorName: 'James Lee',
    authorRole: 'student',
    content: '🎨 Art exhibition this Friday in the school auditorium! Come see amazing artwork by our talented students.',
    timestamp: new Date('2025-10-07T11:00:00'),
    likes: 89,
    comments: [],
    tags: ['art', 'exhibition', 'events'],
    category: 'events',
    visibility: 'public',
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400'
    }
  },
  {
    id: 'post12',
    authorId: 'employee3',
    authorName: 'Dr. Rachel Green',
    authorRole: 'employee',
    content: '🔬 Science Fair 2025: Registration now open! Showcase your innovative projects. Last date: October 25th.',
    timestamp: new Date('2025-10-06T09:00:00'),
    likes: 112,
    comments: [
      {
        id: 'c9',
        authorId: 'student1',
        authorName: 'Alice Johnson',
        content: 'Already working on my project! Super excited!',
        timestamp: new Date('2025-10-06T09:30:00')
      }
    ],
    tags: ['science-fair', 'projects', 'registration'],
    category: 'events',
    visibility: 'public'
  },
  {
    id: 'post13',
    authorId: 'scholarship1',
    authorName: 'National Scholarship Board',
    authorRole: 'admin',
    content: '🎓 Merit Scholarships 2025 announced! Students with 90%+ can apply. Application deadline: November 15th. Details: scholarships.edu/2025',
    timestamp: new Date('2025-10-05T08:00:00'),
    likes: 267,
    comments: [
      {
        id: 'c10',
        authorId: 'parent1',
        authorName: 'Sarah Johnson',
        content: 'Great opportunity! Will help my daughter apply.',
        timestamp: new Date('2025-10-05T09:00:00')
      }
    ],
    tags: ['scholarship', 'opportunities', 'merit'],
    category: 'opportunities',
    visibility: 'public'
  },
  {
    id: 'post14',
    authorId: 'student5',
    authorName: 'Olivia Brown',
    authorRole: 'student',
    content: '📚 Looking for study partners for Physics! Anyone interested in forming a study group for the upcoming semester exam?',
    timestamp: new Date('2025-10-07T14:00:00'),
    likes: 34,
    comments: [
      {
        id: 'c11',
        authorId: 'student2',
        authorName: 'Bob Wilson',
        content: 'Count me in! When do we start?',
        timestamp: new Date('2025-10-07T14:15:00')
      },
      {
        id: 'c12',
        authorId: 'student3',
        authorName: 'Emma Davis',
        content: 'Me too! Let\'s create a group chat.',
        timestamp: new Date('2025-10-07T14:20:00')
      }
    ],
    tags: ['study-group', 'physics', 'collaboration'],
    category: 'discussions',
    visibility: 'public'
  },
  {
    id: 'post15',
    authorId: 'secretary1',
    authorName: 'Patricia Lee',
    authorRole: 'employee',
    content: '📅 School calendar for November updated! Check the portal for holidays, exam dates, and important events.',
    timestamp: new Date('2025-10-07T07:00:00'),
    likes: 98,
    comments: [],
    tags: ['calendar', 'schedule', 'updates'],
    category: 'announcements',
    visibility: 'public'
  },
  {
    id: 'post16',
    authorId: 'student6',
    authorName: 'Sophia Anderson',
    authorRole: 'student',
    content: '🏃‍♀️ Sports Day preparations are in full swing! Can\'t wait for the inter-house competitions. Go Red House! 🔴',
    timestamp: new Date('2025-10-06T16:00:00'),
    likes: 145,
    comments: [
      {
        id: 'c13',
        authorId: 'student4',
        authorName: 'James Lee',
        content: 'Blue House will win this year! 💙',
        timestamp: new Date('2025-10-06T16:10:00')
      }
    ],
    tags: ['sports', 'events', 'competition'],
    category: 'events',
    visibility: 'public',
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400'
    }
  },
  {
    id: 'post17',
    authorId: 'employee4',
    authorName: 'Mark Johnson',
    authorRole: 'employee',
    content: '🎭 Drama club auditions next week! We\'re performing "Romeo and Juliet" this year. All students welcome!',
    timestamp: new Date('2025-10-07T12:00:00'),
    likes: 76,
    comments: [],
    tags: ['drama', 'auditions', 'club'],
    category: 'events',
    visibility: 'public'
  },
  {
    id: 'post18',
    authorId: 'library1',
    authorName: 'Library Department',
    authorRole: 'employee',
    content: '📚 New books arrival! 50+ titles added including latest science fiction, academic references, and bestsellers. Visit the library!',
    timestamp: new Date('2025-10-06T10:00:00'),
    likes: 88,
    comments: [
      {
        id: 'c14',
        authorId: 'student1',
        authorName: 'Alice Johnson',
        content: 'Any new fantasy series?',
        timestamp: new Date('2025-10-06T10:30:00')
      }
    ],
    tags: ['library', 'books', 'resources'],
    category: 'resources',
    visibility: 'public'
  },
  {
    id: 'post19',
    authorId: 'tech1',
    authorName: 'Tech Academy',
    authorRole: 'admin',
    content: '💻 Free Coding Workshop: Learn Python basics! Perfect for beginners. Saturday 10 AM - 2 PM. Register now!',
    timestamp: new Date('2025-10-05T14:00:00'),
    likes: 198,
    comments: [
      {
        id: 'c15',
        authorId: 'student5',
        authorName: 'Olivia Brown',
        content: 'Registered! Super excited to learn coding!',
        timestamp: new Date('2025-10-05T14:30:00')
      }
    ],
    tags: ['coding', 'workshop', 'technology'],
    category: 'opportunities',
    visibility: 'public'
  },
  {
    id: 'post20',
    authorId: 'parent3',
    authorName: 'Lisa Wang',
    authorRole: 'parent',
    content: '🤝 Parent Support Group meeting this Thursday 6 PM. Discussion topic: Helping kids manage exam stress. All parents welcome!',
    timestamp: new Date('2025-10-07T13:00:00'),
    likes: 62,
    comments: [],
    tags: ['parents', 'support-group', 'wellbeing'],
    category: 'events',
    visibility: 'public'
  },
  {
    id: 'post21',
    authorId: 'counselor1',
    authorName: 'Dr. Emily Foster',
    authorRole: 'employee',
    content: '🧠 Mental Health Awareness Week starts Monday! Daily sessions on stress management, mindfulness, and emotional wellbeing.',
    timestamp: new Date('2025-10-06T11:00:00'),
    likes: 134,
    comments: [
      {
        id: 'c16',
        authorId: 'student3',
        authorName: 'Emma Davis',
        content: 'This is so important! Looking forward to the sessions.',
        timestamp: new Date('2025-10-06T11:30:00')
      }
    ],
    tags: ['mental-health', 'wellbeing', 'awareness'],
    category: 'events',
    visibility: 'public'
  },
  {
    id: 'post22',
    authorId: 'student7',
    authorName: 'Ryan Cooper',
    authorRole: 'student',
    content: '🎮 Gaming club meeting Friday! We\'ll discuss organizing an esports tournament. Gamers assemble!',
    timestamp: new Date('2025-10-07T15:00:00'),
    likes: 54,
    comments: [
      {
        id: 'c17',
        authorId: 'student2',
        authorName: 'Bob Wilson',
        content: 'Finally! Count me in!',
        timestamp: new Date('2025-10-07T15:15:00')
      }
    ],
    tags: ['gaming', 'club', 'esports'],
    category: 'events',
    visibility: 'public'
  },
  {
    id: 'post23',
    authorId: 'eco1',
    authorName: 'Eco Warriors Club',
    authorRole: 'student',
    content: '🌍 Earth Day campaign: Plastic-free week starting Monday! Let\'s make our campus greener. Tips and activities in comments.',
    timestamp: new Date('2025-10-06T08:00:00'),
    likes: 167,
    comments: [],
    tags: ['environment', 'sustainability', 'campaign'],
    category: 'events',
    visibility: 'public',
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400'
    }
  },
  {
    id: 'post24',
    authorId: 'employee5',
    authorName: 'Chris Anderson',
    authorRole: 'employee',
    content: '🏀 Basketball tryouts next Tuesday! Positions open for all grades. Show your skills and join the team!',
    timestamp: new Date('2025-10-07T09:30:00'),
    likes: 91,
    comments: [
      {
        id: 'c18',
        authorId: 'student6',
        authorName: 'Sophia Anderson',
        content: 'Been practicing all summer! Ready for this!',
        timestamp: new Date('2025-10-07T10:00:00')
      }
    ],
    tags: ['basketball', 'sports', 'tryouts'],
    category: 'events',
    visibility: 'public'
  },
  {
    id: 'post25',
    authorId: 'career1',
    authorName: 'Career Guidance Center',
    authorRole: 'admin',
    content: '🎯 Career fair next month! Top universities and companies participating. Great opportunity for Class 11-12 students.',
    timestamp: new Date('2025-10-05T12:00:00'),
    likes: 203,
    comments: [
      {
        id: 'c19',
        authorId: 'parent1',
        authorName: 'Sarah Johnson',
        content: 'Perfect timing! My daughter is exploring options.',
        timestamp: new Date('2025-10-05T13:00:00')
      }
    ],
    tags: ['career', 'fair', 'opportunities'],
    category: 'opportunities',
    visibility: 'public'
  },
  {
    id: 'post26',
    authorId: 'student8',
    authorName: 'Maya Patel',
    authorRole: 'student',
    content: '✨ Just published my first article in the school magazine! Topic: "The Future of AI in Education". Check it out!',
    timestamp: new Date('2025-10-07T17:00:00'),
    likes: 102,
    comments: [
      {
        id: 'c20',
        authorId: 'employee1',
        authorName: 'Michael Brown',
        content: 'Excellent work, Maya! Very insightful article.',
        timestamp: new Date('2025-10-07T17:30:00')
      },
      {
        id: 'c21',
        authorId: 'principal1',
        authorName: 'Dr. Elizabeth Wilson',
        content: 'Proud of your achievement! Keep writing!',
        timestamp: new Date('2025-10-07T17:45:00')
      }
    ],
    tags: ['writing', 'achievement', 'magazine'],
    category: 'achievements',
    visibility: 'public'
  },
  {
    id: 'post27',
    authorId: 'music1',
    authorName: 'Music Department',
    authorRole: 'employee',
    content: '🎵 Annual music concert rehearsals start this week! Orchestra, choir, and band members please check your schedules.',
    timestamp: new Date('2025-10-06T13:00:00'),
    likes: 78,
    comments: [],
    tags: ['music', 'concert', 'rehearsal'],
    category: 'events',
    visibility: 'public'
  },
  {
    id: 'post28',
    authorId: 'volunteer1',
    authorName: 'Community Service Club',
    authorRole: 'student',
    content: '❤️ Volunteering opportunity: Teaching underprivileged kids this weekend. Sign up if you want to make a difference!',
    timestamp: new Date('2025-10-07T06:00:00'),
    likes: 156,
    comments: [
      {
        id: 'c22',
        authorId: 'student1',
        authorName: 'Alice Johnson',
        content: 'Signed up! This is such a great initiative.',
        timestamp: new Date('2025-10-07T06:30:00')
      }
    ],
    tags: ['volunteer', 'community-service', 'social-work'],
    category: 'opportunities',
    visibility: 'public'
  }
];

export const mockCommunities: Community[] = [
  {
    id: 'com1',
    name: 'Mathematics Enthusiasts',
    description: 'For students who love numbers and problem-solving',
    type: 'club',
    memberCount: 45,
    members: ['student1', 'student2', 'employee1'],
    createdBy: 'employee1',
    avatar: '🔢'
  },
  {
    id: 'com2',
    name: 'Class 10A',
    description: 'Official group for Class 10A students',
    type: 'class',
    memberCount: 32,
    members: ['student1', 'student2', 'employee1'],
    createdBy: 'employee1',
    avatar: '📚'
  },
  {
    id: 'com3',
    name: 'Science Club',
    description: 'Exploring the wonders of science together',
    type: 'club',
    memberCount: 67,
    members: ['student1', 'student3', 'employee3'],
    createdBy: 'employee3',
    avatar: '🔬'
  },
  {
    id: 'com4',
    name: 'Parent-Teacher Association',
    description: 'Collaboration between parents and teachers',
    type: 'public',
    memberCount: 156,
    members: ['parent1', 'parent2', 'employee1', 'principal1'],
    createdBy: 'principal1',
    avatar: '🤝'
  },
  {
    id: 'com5',
    name: 'Debate Society',
    description: 'Sharpen your argumentative and public speaking skills',
    type: 'club',
    memberCount: 28,
    members: ['student2', 'student4', 'employee2'],
    createdBy: 'employee2',
    avatar: '🎤'
  },
  {
    id: 'com6',
    name: 'School Administration',
    description: 'Internal communication for school staff',
    type: 'department',
    memberCount: 15,
    members: ['admin1', 'principal1', 'bursar1', 'secretary1'],
    createdBy: 'admin1',
    avatar: '🏫'
  },
  {
    id: 'com7',
    name: 'National Education Forum',
    description: 'Cross-school collaboration and policy discussions',
    type: 'public',
    memberCount: 2340,
    members: ['admin1', 'principal1', 'gov1'],
    createdBy: 'gov1',
    avatar: '🌐'
  }
];

export const mockChats: ChatConversation[] = [
  {
    id: 'chat1',
    type: 'private',
    participants: ['student1', 'employee1'],
    participantNames: ['Alice Johnson', 'Michael Brown'],
    lastMessage: 'Thank you for the extra help with the math problems!',
    lastMessageTime: new Date('2025-10-07T16:30:00'),
    unreadCount: 0,
    avatar: '👨‍🏫'
  },
  {
    id: 'chat2',
    type: 'group',
    participants: ['student1', 'student2', 'student3'],
    participantNames: ['Alice Johnson', 'Bob Wilson', 'Emma Davis'],
    name: 'Physics Study Group',
    lastMessage: 'Meeting tomorrow at library 4 PM?',
    lastMessageTime: new Date('2025-10-07T15:00:00'),
    unreadCount: 3,
    avatar: '📖'
  },
  {
    id: 'chat3',
    type: 'private',
    participants: ['student1', 'parent1'],
    participantNames: ['Alice Johnson', 'Sarah Johnson'],
    lastMessage: 'See you at dinner! 🍝',
    lastMessageTime: new Date('2025-10-07T14:00:00'),
    unreadCount: 0,
    avatar: '👩'
  },
  {
    id: 'chat4',
    type: 'group',
    participants: ['admin1', 'principal1', 'bursar1', 'secretary1'],
    participantNames: ['John Smith', 'Dr. Elizabeth Wilson', 'Robert Martinez', 'Patricia Lee'],
    name: 'Admin Team',
    lastMessage: 'Budget meeting rescheduled to 3 PM',
    lastMessageTime: new Date('2025-10-07T13:00:00'),
    unreadCount: 1,
    avatar: '💼'
  },
  {
    id: 'chat5',
    type: 'private',
    participants: ['student2', 'student4'],
    participantNames: ['Bob Wilson', 'James Lee'],
    lastMessage: 'Great game yesterday! 🏀',
    lastMessageTime: new Date('2025-10-06T18:00:00'),
    unreadCount: 0,
    avatar: '👦'
  }
];

export const mockNotifications: Notification[] = [
  {
    id: 'notif1',
    type: 'campus',
    title: 'Assignment Due Tomorrow',
    message: 'Math Worksheet is due tomorrow at 5 PM',
    timestamp: new Date('2025-10-07T18:00:00'),
    read: false,
    actionUrl: '/campus/assignments',
    icon: '📝'
  },
  {
    id: 'notif2',
    type: 'social',
    title: 'New Comment on Your Post',
    message: 'Michael Brown commented on your post',
    timestamp: new Date('2025-10-07T17:30:00'),
    read: false,
    actionUrl: '/social/feed',
    icon: '💬'
  },
  {
    id: 'notif3',
    type: 'campus',
    title: 'Fee Payment Reminder',
    message: 'Last date for fee payment: October 20th',
    timestamp: new Date('2025-10-07T09:00:00'),
    read: true,
    actionUrl: '/campus/payments',
    icon: '💳'
  },
  {
    id: 'notif4',
    type: 'social',
    title: 'Mentioned in Discussion',
    message: 'Emma Davis mentioned you in Physics Study Group',
    timestamp: new Date('2025-10-07T15:00:00'),
    read: false,
    actionUrl: '/social/feed',
    icon: '@'
  },
  {
    id: 'notif5',
    type: 'campus',
    title: 'Exam Schedule Released',
    message: 'Mid-term exam schedule is now available',
    timestamp: new Date('2025-10-07T08:00:00'),
    read: true,
    actionUrl: '/campus/schedule',
    icon: '📅'
  },
  {
    id: 'notif6',
    type: 'social',
    title: 'New Post in Community',
    message: 'New post in Mathematics Enthusiasts community',
    timestamp: new Date('2025-10-06T16:00:00'),
    read: true,
    actionUrl: '/social/communities',
    icon: '🔢'
  }
];
