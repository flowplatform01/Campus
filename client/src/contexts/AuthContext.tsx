import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/data-access/mockData';
import { api, ApiUser } from '@/lib/api';

function apiUserToUser(u: ApiUser): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as UserRole,
    avatar: u.avatar,
    profileCompletion: u.profileCompletion ?? 0,
    verified: u.verified ?? false,
    schoolLinked: u.schoolLinked ?? false,
    points: u.points,
    badges: u.badges ?? [],
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    schoolName?: string;
    studentId?: string;
    employeeId?: string;
    subRole?: string;
  }) => Promise<User>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('campus_access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth.me()
      .then((u) => {
        setUser(apiUserToUser(u));
      })
      .catch(() => {
        localStorage.removeItem('campus_access_token');
        localStorage.removeItem('campus_refresh_token');
        localStorage.removeItem('campus_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.auth.login(email, password);
      setUser(apiUserToUser(res.user));
      localStorage.setItem('campus_access_token', res.accessToken);
      localStorage.setItem('campus_refresh_token', res.refreshToken);
      localStorage.setItem('campus_user', JSON.stringify(apiUserToUser(res.user)));
      return true;
    } catch {
      return false;
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    schoolName?: string;
    studentId?: string;
    employeeId?: string;
    subRole?: string;
  }): Promise<User> => {
    const res = await api.auth.register({
      ...data,
      schoolName: data.schoolName,
      studentId: data.studentId,
      employeeId: data.employeeId,
      subRole: data.subRole,
    });
    setUser(apiUserToUser(res.user));
    localStorage.setItem('campus_access_token', res.accessToken);
    localStorage.setItem('campus_refresh_token', res.refreshToken);
    localStorage.setItem('campus_user', JSON.stringify(apiUserToUser(res.user)));
    return apiUserToUser(res.user);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('campus_access_token');
    localStorage.removeItem('campus_refresh_token');
    localStorage.removeItem('campus_user');
  };

  const updateUser = async (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
      localStorage.setItem('campus_user', JSON.stringify({ ...user, ...updates }));
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
