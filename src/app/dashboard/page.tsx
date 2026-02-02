// E:\Belajar Javascript\.vscode\Project-Freelance\nexlanding\frontend\src\app\projects\smart-pos\dashboard\page.tsx

import { Suspense } from 'react'; // ✅ Terpakai
import { getDashboardData } from '@/services/dashboard.service';
import AnimatedCounter from '@/components/smart-pos/AnimatedCounter';
import { RevenueChart } from '@/components/smart-pos/dashboard/RevenueChart';
import { RecentSales } from '@/components/smart-pos/dashboard/RecentSales';
import { TopProducts } from '@/components/smart-pos/dashboard/TopProducts';
import { Skeleton } from '@/components/ui/skeleton'; // ✅ Terpakai
import { RefreshCcw } from 'lucide-react';

// --- 1. KOMPONEN UTAMA (Async Server Component) ---
export default async function DashboardPage() {
  return (
    <div className="p-6 space-y-6 min-h-screen bg-neutral-950 text-white font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-gray-400">Overview performa toko hari ini.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm hover:border-[#dfff4f]/50 transition-colors group">
          <RefreshCcw
            size={16}
            className="group-hover:rotate-180 transition-transform duration-500"
          />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ✅ SUSPENSE BOUNDARY 
         Saat <DashboardContent /> loading, <DashboardLoading /> yang akan muncul.
      */}
      <Suspense fallback={<DashboardLoading />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

// --- 2. LOGIC & DATA FETCHING DISINI ---
async function DashboardContent() {
  // Fetching data terjadi di komponen anak ini
  const data = await getDashboardData();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 grid-rows-[auto_auto_auto]">
      {/* REVENUE CARD */}
      <div className="md:col-span-2 lg:col-span-2 row-span-1 bg-[#18191e] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-5 bg-[#dfff4f] blur-[60px] w-32 h-32 rounded-full"></div>
        <p className="text-gray-500 font-medium text-sm uppercase tracking-wider">
          Revenue Today
        </p>
        <div className="mt-4 text-4xl lg:text-5xl font-bold text-white font-mono tracking-tighter">
          <AnimatedCounter value={data.revenueToday} isCurrency />
        </div>
        <div className="mt-4 flex items-center gap-2 text-[#dfff4f] text-sm bg-[#dfff4f]/10 w-fit px-3 py-1 rounded-full">
          <span>+12.5%</span>
        </div>
      </div>

      {/* ORDERS CARD */}
      <div className="md:col-span-2 lg:col-span-1 bg-[#18191e] border border-white/5 p-6 rounded-3xl flex flex-col justify-between">
        <p className="text-gray-500 font-medium text-sm">Total Orders</p>
        <div className="text-4xl font-bold text-white font-mono">
          <AnimatedCounter value={data.ordersToday} />
        </div>
      </div>

      {/* AVG TICKET CARD */}
      <div className="md:col-span-2 lg:col-span-1 bg-[#18191e] border border-white/5 p-6 rounded-3xl flex flex-col justify-between">
        <p className="text-gray-500 font-medium text-sm">Avg. Ticket</p>
        <div className="text-2xl font-bold text-white font-mono">
          <AnimatedCounter
            value={
              data.ordersToday > 0 ? data.revenueToday / data.ordersToday : 0
            }
            isCurrency
          />
        </div>
      </div>

      {/* RECENT SALES */}
      <div className="md:col-span-4 lg:col-span-2 row-span-2 bg-[#18191e] border border-white/5 p-0 rounded-3xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-bold text-white">Live Transactions</h3>
        </div>
        <div className="flex-1 p-2">
          <RecentSales data={data.recentOrders} />
        </div>
      </div>

      {/* REVENUE CHART */}
      <div className="md:col-span-4 lg:col-span-4 row-span-1 bg-[#18191e] border border-white/5 p-6 rounded-3xl min-h-[350px]">
        <RevenueChart data={data.chartData} />
      </div>

      {/* TOP PRODUCTS */}
      <div className="md:col-span-4 lg:col-span-4 row-span-1 bg-[#18191e] border border-white/5 p-6 rounded-3xl">
        <h3 className="font-bold text-white mb-4">Top Performing Menu</h3>
        <TopProducts data={data.topProducts} />
      </div>
    </div>
  );
}

// --- 3. LOADING SKELETON (UI TUNGGU) ---
function DashboardLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {/* Skeleton untuk Revenue Card */}
      <Skeleton className="h-40 md:col-span-2 lg:col-span-2 rounded-3xl bg-white/5" />
      {/* Skeleton untuk Metric Kecil */}
      <Skeleton className="h-40 md:col-span-2 lg:col-span-1 rounded-3xl bg-white/5" />
      <Skeleton className="h-40 md:col-span-2 lg:col-span-1 rounded-3xl bg-white/5" />

      {/* Skeleton untuk Recent Sales (Tall) */}
      <Skeleton className="h-[500px] md:col-span-4 lg:col-span-2 row-span-2 rounded-3xl bg-white/5" />

      {/* Skeleton untuk Chart */}
      <Skeleton className="h-[350px] md:col-span-4 lg:col-span-4 rounded-3xl bg-white/5" />

      {/* Skeleton untuk Top Products */}
      <Skeleton className="h-[200px] md:col-span-4 lg:col-span-4 rounded-3xl bg-white/5" />
    </div>
  );
}
