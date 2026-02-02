'use client';

import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Package, AlertTriangle, Search, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

// IMPORT KOMPONEN MODULAR KITA
// Pastikan path './product-table' mengarah ke file table baru yang ada fitur Sort/Nuqs
import ProductTable from './product-table';
import type { Product } from '@/db/schema';
import SeedButton from './seed-button';
import ResetButton from './reset-button';
import ProductForm from './Product-Form';

interface InventoryDashboardProps {
  products: Product[];
  totalProducts: number;
  lowStockCount: number;
}

export default function InventoryDashboard({
  products,
  totalProducts,
  lowStockCount,
}: InventoryDashboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- STATE UNTUK BUKA/TUTUP FORM ---
  const [isFormOpen, setIsFormOpen] = useState(false);

  // LOGIC FILTER
  // Array.filter mempertahankan urutan. Jadi jika 'products' dari server sudah urut,
  // maka 'filteredProducts' juga akan tetap urut (Sorted). Aman! ✅
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // --- ANIMASI GSAP (Tetap Sama) ---
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        '.stat-card',
        { y: 30, opacity: 0, filter: 'blur(5px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6, stagger: 0.1 }
      );

      // Animasi Angka
      const targets = [
        { el: '#count-total', val: totalProducts },
        { el: '#count-low', val: lowStockCount },
      ];

      targets.forEach((target) => {
        const obj = { value: 0 };
        gsap.to(obj, {
          value: target.val,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate: () => {
            const el = document.querySelector(target.el);
            if (el) el.textContent = Math.round(obj.value).toString();
          },
        });
      });

      tl.fromTo(
        '.inventory-content',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        '-=0.3'
      );
    },
    { scope: containerRef, dependencies: [totalProducts, lowStockCount] }
  );

  return (
    <div ref={containerRef} className="w-full space-y-8 pb-10">
      {/* --- SECTION 1: STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="stat-card bg-[#18191e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-[#dfff4f]/30 transition-all shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package size={80} className="text-white" />
          </div>
          <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">
            Total Produk
          </h3>
          <p
            id="count-total"
            className="text-4xl font-bold text-white mt-2 font-mono tracking-tighter"
          >
            0
          </p>
          <div className="mt-4 text-xs text-gray-500">
            Item terdaftar di database
          </div>
        </div>

        {/* Card 2 */}
        <div className="stat-card bg-[#18191e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-red-500/30 transition-all shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 text-red-500 transition-opacity">
            <AlertTriangle size={80} />
          </div>
          <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">
            Perlu Restock
          </h3>
          <p
            id="count-low"
            className={`text-4xl font-bold mt-2 font-mono tracking-tighter ${
              lowStockCount > 0 ? 'text-red-500' : 'text-[#dfff4f]'
            }`}
          >
            0
          </p>
          <div className="mt-4 text-xs text-gray-500">
            Produk dengan stok &lt; 20
          </div>
        </div>

        {/* Card 3: Actions */}
        <div className="stat-card bg-[#18191e] border border-white/5 p-6 rounded-2xl flex flex-col justify-between shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">
            Database Actions
          </h3>
          <div className="flex flex-row gap-3 h-full items-end">
            <SeedButton />
            <ResetButton />
          </div>
        </div>
      </div>

      {/* --- SECTION 2: HEADER & SEARCH --- */}
      <div className="inventory-content flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Inventory Produk
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Kelola stok dan harga produk Anda.
          </p>
        </div>

        <div className="flex gap-3 relative w-full md:w-72 group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#dfff4f] transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari nama / SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#18191e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#dfff4f]/50 focus:ring-1 focus:ring-[#dfff4f]/50 transition-all placeholder:text-gray-600 shadow-inner"
          />

          {/* TOMBOL TAMBAH */}
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-[#dfff4f] hover:bg-[#ccee2e] text-black px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="hidden md:inline">Tambah</span>
          </button>
        </div>
      </div>

      {/* --- SECTION 3: TABLE --- */}
      {/* KUNCINYA DISINI: 
         Data 'filteredProducts' ini berasal dari props 'products'.
         Props 'products' berasal dari Server yang sudah di-SORTING.
         Jadi tabel ini otomatis menerima data yang sudah urut.
      */}
      <div className="inventory-content mt-6">
        <ProductTable data={filteredProducts} />
      </div>

      {/* --- 4. RENDER MODAL FORM --- */}
      {isFormOpen && <ProductForm onClose={() => setIsFormOpen(false)} />}

      {/* Footer */}
      <div className="inventory-content pt-6 border-t border-white/5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-[#dfff4f] transition-colors font-medium group"
        >
          <ArrowLeft
            size={16}
            className="mr-2 group-hover:-translate-x-1 transition-transform"
          />
          Kembali ke Halaman Portfolio
        </Link>
      </div>
    </div>
  );
}
