// src/features/smart-pos/_components/status-toggle-cell.tsx
'use client';

import { useOptimistic, startTransition } from 'react';
import { toggleProductStatus } from '@/actions/smart-price-adjustment'; // Sesuaikan import action
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Power } from 'lucide-react';

interface StatusToggleCellProps {
  id: number;
  initialStatus: boolean;
}

export function StatusToggleCell({ id, initialStatus }: StatusToggleCellProps) {
  // Optimistic UI: Update tampilan duluan sebelum server selesai
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    initialStatus,
    (state, newStatus: boolean) => newStatus
  );

  const handleToggle = () => {
    const newStatus = !optimisticStatus;

    startTransition(async () => {
      // 1. Update Visual Langsung (Optimistic)
      setOptimisticStatus(newStatus);

      // 2. Kirim ke Server
      const result = await toggleProductStatus(id, optimisticStatus);

      // 3. Feedback / Rollback jika gagal
      if (result.success) {
        toast.success(newStatus ? 'Produk Diaktifkan' : 'Produk Dinonaktifkan');
      } else {
        toast.error('Gagal mengubah status');
        // UI akan otomatis rollback saat revalidatePath server selesai
      }
    });
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Mencegah klik tembus ke baris tabel
        handleToggle();
      }}
      className={cn(
        'group/toggle relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#dfff4f] focus:ring-offset-2 focus:ring-offset-[#18191e]',
        // Logic Warna Background Switch
        optimisticStatus ? 'bg-[#dfff4f]' : 'bg-gray-700'
      )}
      title={
        optimisticStatus ? 'Klik untuk Non-aktifkan' : 'Klik untuk Aktifkan'
      }
    >
      <span className="sr-only">Toggle Status</span>

      {/* Lingkaran Knob */}
      <span
        className={cn(
          'flex items-center justify-center pointer-events-none h-4 w-4 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out',
          // Logic Posisi Knob
          optimisticStatus ? 'translate-x-6' : 'translate-x-1'
        )}
      >
        {/* Ikon Power Kecil di dalam Knob */}
        <Power
          size={10}
          className={cn(
            'transition-colors',
            optimisticStatus ? 'text-[#dfff4f]' : 'text-gray-500'
          )}
        />
      </span>
    </button>
  );
}
