'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LogoutButton() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('LogoutButton - User state:', user);
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!user) {
    console.log('LogoutButton - No user, not rendering');
    return null;
  }

  return (
    <button
      onClick={handleLogout}
      className="fixed bottom-4 left-4 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all text-gray-700 hover:text-gray-900"
      title="Log out"
    >
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm font-medium">Log Out</span>
      </div>
    </button>
  );
} 