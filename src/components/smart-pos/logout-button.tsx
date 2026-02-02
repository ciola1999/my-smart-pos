'use client'; // Wajib Client Component karena ada onClick

import { LogOut } from 'lucide-react'; // Pastikan sudah install lucide-react
import { logoutAction } from '@/actions/auth';
import { useState } from 'react';

export default function LogoutButton() {
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    setIsPending(true);
    await logoutAction(); // Panggil server action
    // Tidak perlu setPending(false) karena user akan di-redirect
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
    >
      <LogOut size={18} />
      {isPending ? 'Keluar...' : 'Logout'}
    </button>
  );
}
