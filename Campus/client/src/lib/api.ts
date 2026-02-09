const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function getToken(): string | null {
  return localStorage.getItem("campus_access_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Ensure the URL is correctly constructed
  let url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  
  // Strip double slashes if they occur at the base (e.g., domain:3001//api/auth)
  if (API_BASE && path.startsWith("/")) {
    url = `${API_BASE}${path}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data as T;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
  profileCompletion?: number;
  verified?: boolean;
  schoolLinked?: boolean;
  avatar?: string;
  points?: number;
  badges?: string[];
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  verificationEmailSent?: boolean;
}

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<AuthResponse> => {
      return request<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    register: async (data: {
      email: string;
      password: string;
      name: string;
      role: string;
      schoolName?: string;
      studentId?: string;
      employeeId?: string;
      subRole?: string;
    }): Promise<AuthResponse> => {
      return request<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    refresh: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> => {
      return request("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    },
    me: async (): Promise<ApiUser> => {
      return request<ApiUser>("/api/auth/me");
    },
    verifyEmail: async (token: string): Promise<void> => {
      return request("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
    },
    forgotPassword: async (email: string): Promise<void> => {
      return request("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
    resetPassword: async (token: string, password: string): Promise<void> => {
      return request("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
    },
  },
  posts: {
    getFeed: async (params?: { category?: string }) => {
      const q = params?.category ? `?category=${params.category}` : "";
      return request<{ posts: any[]; nextCursor: string | null }>(`/api/social/posts${q}`);
    },
    create: async (post: { content: string; category?: string; visibility?: string; tags?: string[]; postedAsSchool?: boolean }) => {
      return request("/api/social/posts", {
        method: "POST",
        body: JSON.stringify(post),
      });
    },
    like: async (postId: string) => {
      return request<{ liked: boolean }>(`/api/social/posts/${postId}/like`, { method: "POST" });
    },
    addComment: async (postId: string, content: string) => {
      return request(`/api/social/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
    },
  },
  grades: {
    getByStudent: async (studentId?: string) => {
      const q = studentId ? `?studentId=${studentId}` : "";
      return request(`/api/academics/grades${q}`);
    },
  },
  assignments: {
    getAll: async () => request("/api/academics/assignments"),
    submit: async (id: string, fileUrl?: string) =>
      request(`/api/academics/assignments/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({ fileUrl }),
      }),
  },
  attendance: {
    getByStudent: async (studentId?: string) => {
      const q = studentId ? `?studentId=${studentId}` : "";
      return request(`/api/academics/attendance${q}`);
    },
  },
  schedule: {
    get: async () => request("/api/academics/schedule"),
  },
  notifications: {
    getAll: async () => request("/api/notifications"),
    markRead: async (id: string) =>
      request(`/api/notifications/${id}/read`, { method: "PATCH" }),
  },
  communities: {
    getAll: async () => request("/api/communities"),
  },
  announcements: {
    list: async () => request<any[]>("/api/announcements"),
    create: async (title: string, message: string) =>
      request("/api/announcements", {
        method: "POST",
        body: JSON.stringify({ title, message }),
      }),
  },
  users: {
    getById: async (id: string) => request<ApiUser>(`/api/users/${id}`),
    list: async () => request<any[]>("/api/users"),
    listStaff: async () => request<any[]>("/api/users/staff"),
    create: async (data: {
      email: string;
      password: string;
      name: string;
      role: "admin" | "student" | "parent" | "employee";
      subRole?: string;
      studentId?: string;
      employeeId?: string;
    }) =>
      request("/api/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  sms: {
    dashboard: {
      get: async () => request<any>("/api/sms/dashboard"),
    },
    payments: {
      feeHeads: {
        list: async () => request<any[]>("/api/sms/payments/fee-heads"),
        create: async (data: { name: string; code?: string }) => request<any>("/api/sms/payments/fee-heads", { method: "POST", body: JSON.stringify(data) }),
      },
      settings: {
        get: async () => request<any>("/api/sms/payments/settings"),
        update: async (data: Partial<{ currency: string; methods: string[] }>) =>
          request<any>("/api/sms/payments/settings", { method: "PATCH", body: JSON.stringify(data) }),
      },
      invoices: {
        list: async () => request<any[]>("/api/sms/payments/invoices"),
        get: async (id: string) => request<any>(`/api/sms/payments/invoices/${id}`),
        create: async (data: {
          academicYearId?: string;
          termId?: string;
          studentId: string;
          dueAt?: string;
          notes?: string;
          lines: Array<{ feeHeadId?: string; description: string; amount: number }>;
        }) => request<any>("/api/sms/payments/invoices", { method: "POST", body: JSON.stringify(data) }),
      },
      payments: {
        create: async (data: { invoiceId: string; amount: number; method: string; reference?: string; paidAt?: string }) =>
          request<any>("/api/sms/payments/payments", { method: "POST", body: JSON.stringify(data) }),
      },
      students: {
        balance: async (studentId: string) => request<any>(`/api/sms/payments/students/${studentId}/balance`),
      },
    },
    reports: {
      summary: async () => request<any>("/api/sms/reports/summary"),
    },
    resources: {
      list: async () => request<any[]>("/api/sms/resources"),
      create: async (data: { title: string; description?: string; url: string; academicYearId?: string; classId?: string; sectionId?: string; subjectId?: string }) =>
        request<any>("/api/sms/resources", { method: "POST", body: JSON.stringify(data) }),
      remove: async (id: string) => request(`/api/sms/resources/${id}`, { method: "DELETE" }),
    },
    school: {
      get: async () => request<any>("/api/sms/school"),
      update: async (data: Partial<{ name: string; logoUrl: string; address: string; phone: string; email: string }>) =>
        request<any>("/api/sms/school", { method: "PATCH", body: JSON.stringify(data) }),
    },
    attendance: {
      roster: async (params: { academicYearId: string; classId: string; sectionId?: string }) => {
        const q = new URLSearchParams();
        q.set("academicYearId", params.academicYearId);
        q.set("classId", params.classId);
        if (params.sectionId) q.set("sectionId", params.sectionId);
        return request<any[]>(`/api/sms/attendance/roster?${q.toString()}`);
      },
      createSession: async (data: {
        academicYearId: string;
        termId: string;
        classId: string;
        sectionId?: string;
        subjectId?: string;
        date: string;
      }) => request<any>("/api/sms/attendance/sessions", { method: "POST", body: JSON.stringify(data) }),
      saveEntries: async (sessionId: string, entries: Array<{ studentId: string; status: string; note?: string }>) =>
        request<any[]>(`/api/sms/attendance/sessions/${sessionId}/entries`, {
          method: "POST",
          body: JSON.stringify({ entries }),
        }),
      submitSession: async (sessionId: string) => request<any>(`/api/sms/attendance/sessions/${sessionId}/submit`, { method: "POST" }),
      lockSession: async (sessionId: string) => request<any>(`/api/sms/attendance/sessions/${sessionId}/lock`, { method: "POST" }),
      my: async () => request<any>("/api/sms/attendance/my"),
    },
    assignments: {
      list: async (params?: { academicYearId?: string; termId?: string }) => {
        const q = new URLSearchParams();
        if (params?.academicYearId) q.set("academicYearId", params.academicYearId);
        if (params?.termId) q.set("termId", params.termId);
        const qs = q.toString();
        return request<any[]>(`/api/sms/assignments${qs ? `?${qs}` : ""}`);
      },
      create: async (data: {
        academicYearId: string;
        termId: string;
        classId: string;
        sectionId?: string;
        subjectId: string;
        title: string;
        instructions: string;
        dueAt: string;
        maxScore: number;
        attachmentUrl?: string;
      }) => request<any>("/api/sms/assignments", { method: "POST", body: JSON.stringify(data) }),
      publish: async (id: string) => request<any>(`/api/sms/assignments/${id}/publish`, { method: "POST" }),
      close: async (id: string) => request<any>(`/api/sms/assignments/${id}/close`, { method: "POST" }),
      submit: async (id: string, data: { submissionUrl?: string; submissionText?: string }) =>
        request<any>(`/api/sms/assignments/${id}/submit`, { method: "POST", body: JSON.stringify(data) }),
      listSubmissions: async (assignmentId: string) => request<any[]>(`/api/sms/assignments/${assignmentId}/submissions`),
      review: async (submissionId: string, data: { score: number; feedback?: string }) =>
        request<any>(`/api/sms/assignments/submissions/${submissionId}/review`, { method: "POST", body: JSON.stringify(data) }),
    },
    exams: {
      list: async () => request<any[]>("/api/sms/exams"),
      create: async (data: { academicYearId: string; termId: string; name: string; type: string; startDate?: string; endDate?: string }) =>
        request<any>("/api/sms/exams", { method: "POST", body: JSON.stringify(data) }),
      getMarks: async (examId: string) => request<any[]>(`/api/sms/exams/${examId}/marks`),
      saveMarks: async (examId: string, marks: Array<{ studentId: string; subjectId: string; marksObtained?: number; totalMarks: number; remarks?: string }>) =>
        request<any[]>(`/api/sms/exams/${examId}/marks`, { method: "POST", body: JSON.stringify(marks) }),
    },
    expenses: {
      list: async () => request<any[]>("/api/sms/expenses"),
      create: async (data: { category: string; title: string; amount: number; date?: string; notes?: string }) =>
        request<any>("/api/sms/expenses", { method: "POST", body: JSON.stringify(data) }),
    },
    promotions: {
      promote: async (data: {
        currentAcademicYearId: string;
        nextAcademicYearId: string;
        currentClassId: string;
        nextClassId: string;
        studentIds: string[];
      }) => request<any>("/api/sms/students/promote", { method: "POST", body: JSON.stringify(data) }),
    },
    staffAttendance: {
      listSessions: async () => request<any[]>("/api/sms/staff-attendance/sessions"),
      createSession: async (date: string) => request<any>("/api/sms/staff-attendance/sessions", { method: "POST", body: JSON.stringify({ date }) }),
      listEntries: async (sessionId: string) => request<any[]>(`/api/sms/staff-attendance/sessions/${sessionId}/entries`),
      saveEntries: async (sessionId: string, entries: Array<{ staffId: string; status: string; note?: string }>) =>
        request<any[]>(`/api/sms/staff-attendance/sessions/${sessionId}/entries`, { method: "POST", body: JSON.stringify(entries) }),
    },
    timetable: {
      week: async (params?: { academicYearId?: string; termId?: string; classId?: string; sectionId?: string }) => {
        const q = new URLSearchParams();
        if (params?.academicYearId) q.set("academicYearId", params.academicYearId);
        if (params?.termId) q.set("termId", params.termId);
        if (params?.classId) q.set("classId", params.classId);
        if (params?.sectionId) q.set("sectionId", params.sectionId);
        const qs = q.toString();
        return request<any>(`/api/sms/timetable/week${qs ? `?${qs}` : ""}`);
      },
      createSlot: async (data: {
        academicYearId: string;
        termId: string;
        classId: string;
        sectionId?: string;
        weekday: string;
        startTime: string;
        endTime: string;
        subjectId: string;
        teacherId: string;
        room?: string;
      }) => request<any>("/api/sms/timetable/slots", { method: "POST", body: JSON.stringify(data) }),
      deleteSlot: async (id: string) => request(`/api/sms/timetable/slots/${id}`, { method: "DELETE" }),
      publish: async (data: { academicYearId: string; termId: string; classId: string; sectionId?: string }) =>
        request<any>("/api/sms/timetable/publish", { method: "POST", body: JSON.stringify(data) }),
    },
    academicYears: {
      list: async () => request<any[]>("/api/sms/academic-years"),
      create: async (data: { name: string; startDate: string; endDate: string; isActive?: boolean }) =>
        request("/api/sms/academic-years", { method: "POST", body: JSON.stringify(data) }),
      update: async (id: string, data: Partial<{ name: string; startDate: string; endDate: string; isActive: boolean }>) =>
        request(`/api/sms/academic-years/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      setActive: async (id: string) => request(`/api/sms/academic-years/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: true }) }),
      remove: async (id: string) => request(`/api/sms/academic-years/${id}`, { method: "DELETE" }),
    },
    terms: {
      list: async (academicYearId?: string) => {
        const q = academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : "";
        return request<any[]>(`/api/sms/terms${q}`);
      },
      create: async (data: { academicYearId: string; name: string; startDate: string; endDate: string }) =>
        request("/api/sms/terms", { method: "POST", body: JSON.stringify(data) }),
      remove: async (id: string) => request(`/api/sms/terms/${id}`, { method: "DELETE" }),
    },
    classes: {
      list: async () => request<any[]>("/api/sms/classes"),
      create: async (data: { name: string; sortOrder?: number }) =>
        request("/api/sms/classes", { method: "POST", body: JSON.stringify(data) }),
      remove: async (id: string) => request(`/api/sms/classes/${id}`, { method: "DELETE" }),
    },
    sections: {
      list: async (classId?: string) => {
        const q = classId ? `?classId=${encodeURIComponent(classId)}` : "";
        return request<any[]>(`/api/sms/sections${q}`);
      },
      create: async (data: { classId: string; name: string }) =>
        request("/api/sms/sections", { method: "POST", body: JSON.stringify(data) }),
      remove: async (id: string) => request(`/api/sms/sections/${id}`, { method: "DELETE" }),
    },
    subjects: {
      list: async () => request<any[]>("/api/sms/subjects"),
      create: async (data: { name: string; code?: string }) =>
        request("/api/sms/subjects", { method: "POST", body: JSON.stringify(data) }),
      remove: async (id: string) => request(`/api/sms/subjects/${id}`, { method: "DELETE" }),
    },
    permissions: {
      list: async () => request<any[]>("/api/sms/permissions"),
    },
    subRoles: {
      list: async () => request<any[]>("/api/sms/sub-roles"),
      create: async (data: { key: string; name: string }) =>
        request("/api/sms/sub-roles", { method: "POST", body: JSON.stringify(data) }),
      remove: async (id: string) => request(`/api/sms/sub-roles/${id}`, { method: "DELETE" }),
    },
    subRoleGrants: {
      list: async (subRoleId?: string) => {
        const q = subRoleId ? `?subRoleId=${encodeURIComponent(subRoleId)}` : "";
        return request<any[]>(`/api/sms/sub-role-grants${q}`);
      },
      set: async (data: { subRoleId: string; permissionKeys: string[] }) =>
        request<any[]>("/api/sms/sub-role-grants", { method: "PUT", body: JSON.stringify(data) }),
    },
    admissions: {
      list: async () => request<any[]>("/api/sms/admissions"),
      create: async (data: {
        academicYearId: string;
        classId: string;
        sectionId?: string;
        studentFullName: string;
        studentEmail?: string;
        studentPhone?: string;
        desiredStudentId?: string;
        parentFullName?: string;
        parentEmail?: string;
        parentPhone?: string;
        notes?: string;
      }) => request("/api/sms/admissions", { method: "POST", body: JSON.stringify(data) }),
      update: async (id: string, data: { status?: string; notes?: string }) =>
        request(`/api/sms/admissions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      approve: async (id: string) => request(`/api/sms/admissions/${id}/approve`, { method: "POST" }),
    },
  },
};
