// Project\smart-pos-v2\src\components\smart-pos\main-view.tsx

'use client';

import { useRef } from 'react';
import Link from 'next/link';
import {
  Store,
  LayoutGrid,
  History,
  LayoutDashboard,
  LucideIcon,
  Settings,
} from 'lucide-react';
import { Toaster } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Import komponen fitur
import StatusBadge from './status-badge';
import POSInterface from './pos-interface';
import InventoryDashboard from './InventoryDashboard';
import DashboardView from './dashboard/DashboardView';
import { DashboardData } from '@/services/dashboard.service';
import HistoryList from './HistoryList';
import LogoutButton from './logout-button';
import SettingsView from './views/SettingsView'; // Import komponen baru
import type { StoreSetting, Tax } from '@/db/schema';

// Import schema database
import { Product, Order, OrderItem, OrderPayment } from '@/db/schema';

// 🔥 UPDATE PENTING DI SINI:
// Kita definisikan struktur data riwayat agar mengenali kolom Snapshot
export type HistoryRecord = Order & {
  items: (OrderItem & {
    // Pastikan UI tahu bahwa kolom ini ada
    productNameSnapshot: string;
    skuSnapshot: string | null;

    // Relasi produk (bisa null jika dihapus)
    product: Product | null;
  })[];
  payments: OrderPayment[];
};

interface NavButtonProps {
  href: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
  special?: boolean;
}

interface SmartPosMainViewProps {
  products: Product[];
  currentView: string | undefined;
  dashboardData: DashboardData;
  transactionHistory: HistoryRecord[];
  storeSettings: StoreSetting | null; // 👈 Terima prop baru
  taxesData: Tax[];
}

export default function SmartPosMainView({
  products,
  currentView,
  dashboardData,
  storeSettings,
  transactionHistory = [],
  taxesData, // 👈 2. DESTRUCTURE PROPS
}: SmartPosMainViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Logic view
  const view = currentView || 'dashboard';
  const isPosMode = view === 'cashier';
  const isInventoryMode = view === 'inventory';
  const isDashboardMode = view === 'dashboard';
  const isHistoryMode = view === 'history';
  const isSettingsMode = view === 'settings'; // 👈 2. TAMBAHKAN VARIABLE INI

  const totalProducts = products ? products.length : 0;
  const lowStockCount = products
    ? products.filter((p) => p.stock < 20).length
    : 0;

  // --- Animation ---
  useGSAP(
    () => {
      gsap.killTweensOf(containerRef.current);
      gsap.fromTo(
        containerRef.current,
        {
          opacity: 0,
          y: 20,
          filter: 'blur(10px)',
          scale: 0.98,
        },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          scale: 1,
          duration: 0.5,
          ease: 'power4.out',
          stagger: 0.1,
        }
      );
    },
    { dependencies: [view], scope: containerRef }
  );

  // Render Content Switcher
  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return <DashboardView data={dashboardData} />;
      case 'inventory':
        return (
          <InventoryDashboard
            products={products || []}
            totalProducts={totalProducts}
            lowStockCount={lowStockCount}
          />
        );
      case 'history':
        // 🔥 FIX: Konversi Data (String -> Number) sebelum masuk ke UI
        // Drizzle mengembalikan Decimal sebagai String, UI butuh Number.
        const formattedHistory = transactionHistory.map((order) => ({
          ...order,
          // Paksa ubah jadi number agar HistoryList tidak error
          subtotal: Number(order.subtotal),
          taxAmount: Number(order.taxAmount || 0),
          totalAmount: Number(order.totalAmount),
          amountPaid: Number(order.amountPaid || 0),
          change: Number(order.change || 0),
          
          // Mapping Item (Harga per item)
          items: order.items.map((item) => ({
            ...item,
            priceAtTime: Number(item.priceAtTime),
          })),

          // Mapping Payments (Jika ada split payment)
          payments: order.payments?.map((p) => ({
            ...p,
            amount: Number(p.amount),
          })) || [],
        }));

        return (
          <div className="space-y-6 h-full">
            {/* Header Mini Glassmorphism */}
            <div className="flex items-center justify-between bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  Riwayat Transaksi
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Database penjualan real-time.
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-[#dfff4f] font-mono uppercase tracking-widest mb-1">
                  Total Records
                </span>
                <span className="text-3xl font-black text-[#dfff4f] tabular-nums">
                  {transactionHistory.length}
                </span>
              </div>
            </div>

            {/* Area List History */}
            <div className="bg-[#18191e]/50 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden min-h-[500px] shadow-inner">
              {/* ✅ UPDATE: Kita kirim variable 'formattedHistory' yang sudah bersih */}
              {/* @ts-ignore - Abaikan jika TS masih protes sedikit soal tipe null, karena kita sudah handle di atas */}
              <HistoryList history={formattedHistory} />
            </div>
          </div>
        );
      case 'settings':
        return (
          <SettingsView
            initialData={storeSettings ?? null}
            taxesData={taxesData} // 👈 4. OPER KE SETTINGS VIEW
          />
        );
      case 'cashier':
      default:
        return (
          <POSInterface
            initialProducts={products || []}
            storeSettings={storeSettings}
            taxesData={taxesData} // 👈 TAMBAHKAN INI (Oper data pajak ke Kasir)
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1014] text-white selection:bg-[#dfff4f] selection:text-black force-show-cursor">
      <Toaster position="bottom-left" richColors closeButton theme="dark" />

      {/* Floating Navbar */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-400 z-50">
        <div className="bg-[#1c1d24]/80 backdrop-blur-2xl border border-white/10 rounded-2xl px-4 py-1.5 flex items-center justify-between shadow-2xl shadow-black/50">
          <div className="flex items-center gap-3 pl-2">
            <div className="w-9 h-9 bg-[#dfff4f] rounded-lg flex items-center justify-center text-black font-black text-lg shadow-[0_0_15px_rgba(223,255,79,0.4)]">
              N
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-sm font-bold leading-none">NexPOS</span>
              <span className="text-[9px] text-gray-500 tracking-[0.2em]">
                SYSTEM
              </span>
            </div>
          </div>
          <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
            <NavButton
              href="/?view=dashboard"
              active={isDashboardMode}
              icon={LayoutDashboard}
              label="Dash"
            />
            <NavButton
              href="/?view=inventory"
              active={isInventoryMode}
              icon={LayoutGrid}
              label="Stock"
            />
            <NavButton
              href="/?view=history"
              active={isHistoryMode}
              icon={History}
              label="Riwayat"
            />
            {/* 3. TOMBOL SETTINGS DITAMBAHKAN DI SINI */}
            <NavButton
              href="/?view=settings"
              active={isSettingsMode}
              icon={Settings}
              label="Settings"
            />
            <div className="w-px h-5 bg-white/10 mx-2 self-center" />
            <NavButton
              href="/?view=cashier"
              active={isPosMode}
              icon={Store}
              label="Kasir"
              special
            />
            <div className="w-px h-5 bg-white/10 mx-2 self-center" />
            <div>
              <LogoutButton />
            </div>
          </div>

          <div className="pr-2">
            <StatusBadge />
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="pt-28 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen pb-10"
      >
        {renderContent()}
      </div>
    </div>
  );
}

function NavButton({
  href,
  active,
  icon: Icon,
  label,
  special,
}: NavButtonProps) {
  let containerClass =
    'relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 ';

  if (special && active) {
    containerClass +=
      'bg-[#dfff4f] text-black shadow-[0_0_15px_rgba(223,255,79,0.3)] font-bold scale-105';
  } else if (special) {
    containerClass += 'text-[#dfff4f] hover:bg-[#dfff4f]/10';
  } else if (active) {
    containerClass += 'bg-white/10 text-white shadow-inner';
  } else {
    containerClass += 'text-gray-400 hover:text-white hover:bg-white/5';
  }

  return (
    <Link href={href} scroll={false} className={containerClass}>
      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
