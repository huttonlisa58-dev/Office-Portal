'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';

export default function MyProfileRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (user?.employee) router.replace(`/employees/${user.employee}`);
    else router.replace('/dashboard');
  }, [user, loading, router]);
  return <Loader />;
}
