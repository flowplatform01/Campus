import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/data-access/mockData';

export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/');
    } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      setLocation(`/dashboard/${user.role}`);
    }
  }, [isAuthenticated, user, allowedRoles, setLocation]);

  return { user, isAuthenticated };
}
