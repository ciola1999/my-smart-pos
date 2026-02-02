// E:\Belajar Javascript\.vscode\Project-Freelance\nexlanding\frontend\src\features\smart-pos\_components\RevenueChart.tsx

'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';

// Kita import tipe data dari service biar sinkron
import { DashboardData } from '@/services/dashboard.service';

// --- 1. KOMPONEN PENDUKUNG (TOOLTIP) ---
// (Ini kode aslimu, tidak ada yang diubah, hanya dipindah)
const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-[#18191e]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl z-50">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-[#dfff4f] font-bold font-mono text-lg">
          {formatRupiah(value)}
        </p>
      </div>
    );
  }
  return null;
};

// --- 2. KOMPONEN UTAMA ---
interface RevenueChartProps {
  // Komponen ini sekarang menerima data dari 'bapaknya' (Server Component)
  // Tidak perlu fetch sendiri lagi.
  data: DashboardData['chartData'];
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Tidak ada loading state, tidak ada useEffect.
  // Data dijamin sudah ada saat komponen ini dirender.

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Sales Trend</h3>
          <p className="text-xs text-gray-500">Last 7 days performance</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-[#dfff4f]"></span> Revenue
        </div>
      </div>

      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dfff4f" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#dfff4f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#333"
              vertical={false}
              opacity={0.3}
            />
            <XAxis
              dataKey="date" // Perhatikan: di service tadi kuncinya 'date', bukan 'name'
              stroke="#666"
              tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#666"
              tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value / 1000}k`}
              dx={-10}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: '#dfff4f',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue" // Perhatikan: di service tadi kuncinya 'revenue', bukan 'value'
              stroke="#dfff4f"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
