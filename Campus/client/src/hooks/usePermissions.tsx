import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Permission, getPermissionsForRole, hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions';

export function usePermissions() {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return [];
    
    const subRole = (user as any).subRole;
    return getPermissionsForRole(user.role, subRole);
  }, [user]);

  const can = (permission: Permission): boolean => {
    return hasPermission(permissions, permission);
  };

  const canAny = (permissionList: Permission[]): boolean => {
    return hasAnyPermission(permissions, permissionList);
  };

  const canAll = (permissionList: Permission[]): boolean => {
    return hasAllPermissions(permissions, permissionList);
  };

  return {
    permissions,
    can,
    canAny,
    canAll
  };
}
