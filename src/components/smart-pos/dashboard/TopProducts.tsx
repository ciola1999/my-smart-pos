'use client';

import { Progress } from '@/components/ui/progress'; // ✅ Sekarang kita pakai komponen ini
import { DashboardData } from '@/services/dashboard.service';
import { Trophy, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils'; // Helper standar Shadcn/Tailwind

interface TopProductsProps {
  data: DashboardData['topProducts'];
}

export function TopProducts({ data }: TopProductsProps) {
  // 1. Cari nilai penjualan tertinggi untuk acuan persentase (Bar penuh = 100%)
  const maxSales = Math.max(...data.map((p) => p.sales), 1);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-gray-500">
        <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Belum ada data produk terjual.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.map((product, index) => {
        // Hitung persentase: (Penjualan Produk / Penjualan Tertinggi) * 100
        const percent = (product.sales / maxSales) * 100;

        return (
          <div key={product.id} className="space-y-3 group">
            {/* LABEL ATAS: RANK, NAMA, JUMLAH */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                {/* Badge Ranking */}
                <div
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold font-mono',
                    index === 0
                      ? 'bg-[#dfff4f] text-black' // Rank 1: Neon
                      : index === 1
                      ? 'bg-white/20 text-white' // Rank 2: Abu terang
                      : index === 2
                      ? 'bg-white/10 text-gray-300' // Rank 3: Abu gelap
                      : 'text-gray-600' // Sisanya: Teks saja
                  )}
                >
                  {index === 0 ? <Trophy size={12} /> : index + 1}
                </div>

                <span className="font-medium text-white group-hover:text-[#dfff4f] transition-colors">
                  {product.name}
                </span>
              </div>

              <div className="text-right">
                <span className="font-bold text-white font-mono">
                  {product.sales}
                </span>
                <span className="text-gray-500 text-xs ml-1">sold</span>
              </div>
            </div>

            {/* PROGRESS BAR SHADCN */}
            {/* Class [&>*]:bg-[#dfff4f] adalah trik Tailwind v4 untuk
                mengubah warna 'Indicator' di dalam komponen Shadcn Progress
                menjadi warna Neon kita.
            */}
            <Progress
              value={percent}
              className="h-2 bg-white/5 [&>*]:bg-[#dfff4f]"
            />
          </div>
        );
      })}
    </div>
  );
}
