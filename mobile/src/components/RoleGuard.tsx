import React from 'react';
import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
  role: 'warden' | 'student';
  children: React.ReactNode;
}

export default function RoleGuard({ role, children }: RoleGuardProps) {
  const { user } = useAuth();
  if (user?.role !== role) return null;
  return <>{children}</>;
}