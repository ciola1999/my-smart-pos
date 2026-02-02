'use client';

import { useState, useEffect } from 'react';
import { updateProductStock } from '@/actions/smart-price-adjustment';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface StockEditableCellProps {
  id: number;
  initialStock: number;
}

export function StockEditableCell({
  id,
  initialStock,
}: StockEditableCellProps) {
  const [value, setValue] = useState(initialStock);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setValue(initialStock);
  }, [initialStock]);

  const handleUpdate = async () => {
    if (value === initialStock) {
      setIsFocused(false);
      return;
    }

    setIsLoading(true);
    const result = await updateProductStock(id, value);
    setIsLoading(false);
    setIsFocused(false);

    if (result.success) {
      toast.success('Stok diupdate');
    } else {
      toast.error('Gagal update stok');
      setValue(initialStock);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Logic Warna (Tetap dipertahankan agar informatif)
  const getStatusColor = (val: number) => {
    if (val === 0) return 'text-red-500 border-red-900/50 bg-red-500/10';
    if (val < 10)
      return 'text-orange-400 border-orange-900/50 bg-orange-500/10';
    return 'text-[#dfff4f] border-[#dfff4f]/20 bg-[#dfff4f]/5'; // Warna lebih subtle
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <input
        type="number"
        min={0}
        value={value}
        onFocus={() => setIsFocused(true)}
        onChange={(e) => setValue(Number(e.target.value))}
        onBlur={handleUpdate}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        className={cn(
          // Base styles
          'text-center font-mono font-bold text-xs rounded-md border transition-all outline-none',
          // Size adjustments (Lebih ramping)
          'w-12 py-1',
          // Hide Spinner (Membuang panah up/down bawaan browser)
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          // Colors
          getStatusColor(value),
          // Interactive states
          'hover:bg-opacity-20 focus:bg-black focus:border-[#dfff4f] focus:ring-1 focus:ring-[#dfff4f] focus:z-10',
          isLoading && 'opacity-50 cursor-wait'
        )}
      />

      {/* Loading indicator kecil di pojok jika sedang save */}
      {isLoading && (
        <div className="absolute -right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="animate-spin text-gray-500" size={10} />
        </div>
      )}
    </div>
  );
}
