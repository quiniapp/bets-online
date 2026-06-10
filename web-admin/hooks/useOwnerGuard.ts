"use client"
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from 'helper';
import { useAuth } from '@/contexts/auth-context';

/**
 * Redirects non-OWNER users to the dashboard. Used by every
 * /admin/settings/casino page (index + subpages).
 */
export function useOwnerGuard() {
  const { role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role && role !== UserRole.OWNER) {
      router.replace('/admin/dashboard');
    }
  }, [role, router]);
}
