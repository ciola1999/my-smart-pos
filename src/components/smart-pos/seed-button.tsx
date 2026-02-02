'use client';

import { useState } from 'react';
import { seedDummyProducts } from '@/actions/products';
import { Package, Loader2, CheckCircle2 } from 'lucide-react'; // Pastikan install lucide-react

export default function SeedButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSeed = async () => {
    setIsLoading(true);
    setMessage('');

    const result = await seedDummyProducts();

    setMessage(result.message);
    setIsLoading(false);

    // Hilangkan pesan setelah 3 detik
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="flex flex-col items-end gap-2 w-full md:w-auto">
      <button
        onClick={handleSeed}
        disabled={isLoading}
        className="w-full md:w-auto bg-[#dfff4f] hover:bg-[#ccee3d] text-black text-sm font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-[0_0_15px_rgba(223,255,79,0.3)]"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <>
            <Package size={18} /> + 1 Produk Acak
          </>
        )}
      </button>

      {/* Notifikasi Mini di bawah tombol */}
      {message && (
        <span
          className={`text-xs flex items-center gap-1 animate-in fade-in slide-in-from-top-1 ${
            message.includes('Gagal') || message.includes('sudah ada')
              ? 'text-red-400'
              : 'text-[#dfff4f]'
          }`}
        >
          {message.includes('Berhasil') && <CheckCircle2 size={12} />}
          {message}
        </span>
      )}
    </div>
  );
}
