'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation'; // TAMBAHAN PENTING
import { deleteAllProducts } from '@/actions/products';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner'; // TAMBAHAN UTK NOTIFIKASI

export default function ResetButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter(); // Hook untuk refresh halaman

  const handleReset = () => {
    // 1. Konfirmasi
    if (
      !confirm('PERINGATAN: Ini akan menghapus SEMUA data produk. Lanjutkan?')
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteAllProducts();

        if (!result.success) {
          // Ini akan memunculkan pesan error dari database ke layar
          toast.error(result.message);
        } else {
          toast.success(result.message);
          router.refresh();
        }
      } catch (error) {
        console.error(error);
        toast.error('Terjadi kesalahan sistem.');
      }
    });
  };

  return (
    <button
      onClick={handleReset}
      disabled={isPending}
      className="w-full md:w-auto px-6 py-3 rounded-xl text-sm font-bold text-red-500 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="animate-spin" size={18} />
      ) : (
        <>
          <Trash2 size={18} /> Reset DB
        </>
      )}
    </button>
  );
}
