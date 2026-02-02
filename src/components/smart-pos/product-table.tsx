'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // Fallback jika perlu
import { useQueryState, parseAsString } from 'nuqs'; // ✅ Pakai nuqs
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Search,
  Package,
  Copy,
  CheckCircle2,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';

import { cn, formatPercent } from '@/lib/utils'; // Pastikan utils ini ada
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// --- IMPORT SUB-COMPONENTS (Pastikan file ini sudah kamu buat/miliki) ---
import { PriceEditableCell } from './price-editable-cell';
import { CostEditableCell } from './cost-editable-cell';
import { StockEditableCell } from './stock-editable-cell';
import { StatusToggleCell } from './status-toggle-cell';
import { DeleteProductsDialog } from './delete-products-dialog';

// --- TYPE DEFINITION (Sesuaikan dengan Schema Drizzle kamu) ---
type Product = {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number | string; // Bisa string dari DB decimal
  costPrice: number | string;
  stock: number;
  minStock: number;
  imageUrl: string | null;
  isActive: boolean | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  // Tambahkan field relation jika ada (misal categoryName)
};

// --- INTERNAL COMPONENT: SKU BADGE ---
const SkuBadge = ({ sku }: { sku: string | null }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!sku) return;
    navigator.clipboard.writeText(sku);
    setCopied(true);
    toast.success('SKU disalin ke clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!sku}
      type="button"
      className="group/sku flex items-center gap-1.5 text-[10px] text-gray-500 font-mono hover:text-[#dfff4f] transition-colors cursor-pointer bg-white/5 px-1.5 py-0.5 rounded border border-transparent hover:border-white/10"
    >
      <span>{sku || 'NO-SKU'}</span>
      {sku && (
        <span className="opacity-0 group-hover/sku:opacity-100 transition-opacity">
          {copied ? (
            <CheckCircle2 size={10} className="text-green-400" />
          ) : (
            <Copy size={10} />
          )}
        </span>
      )}
    </button>
  );
};

// --- INTERNAL COMPONENT: HEADER SORTABLE ---
const SortableHeader = ({
  label,
  sortKey,
  currentSort,
  currentOrder,
  onSort,
  align = 'left',
  className,
}: {
  label: string;
  sortKey: string;
  currentSort: string | null;
  currentOrder: string | null;
  onSort: (key: string) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) => {
  const isActive = currentSort === sortKey;

  return (
    <th
      className={cn(
        'p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-[#18191e] cursor-pointer hover:text-white hover:bg-white/5 transition-colors select-none border-b border-white/5 sticky top-0 z-10',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div
        className={cn(
          'flex items-center gap-1.5',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center'
        )}
      >
        {label}
        <span
          className={cn(
            'transition-all duration-200',
            isActive
              ? 'text-[#dfff4f] opacity-100'
              : 'text-gray-600 opacity-30 group-hover:opacity-50'
          )}
        >
          {isActive ? (
            currentOrder === 'asc' ? (
              <ArrowUp size={12} />
            ) : (
              <ArrowDown size={12} />
            )
          ) : (
            <ArrowUpDown size={12} />
          )}
        </span>
      </div>
    </th>
  );
};

// --- MAIN COMPONENT ---
export default function ProductTable({ data }: { data: Product[] }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ✅ 1. SETUP NUQS (URL State Management)
  // shallow: false artinya saat sort berubah, jalankan server action/fetch ulang di page.tsx
  const [sortBy, setSortBy] = useQueryState(
    'sort',
    parseAsString.withDefault('createdAt').withOptions({ shallow: false })
  );
  const [sortOrder, setSortOrder] = useQueryState(
    'order',
    parseAsString.withDefault('desc').withOptions({ shallow: false })
  );

  // ✅ 2. HANDLE SORT LOGIC (Optimized)
  const handleSort = (key: string) => {
    startTransition(() => {
      if (sortBy === key) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(key);
        setSortOrder('desc'); // Default new sort is desc
      }
    });
  };

  // Logic Selection
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? data.map((p) => p.id) : []);
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((pid) => pid !== id)
    );
  };

  const selectedProducts = data.filter((p) => selectedIds.includes(p.id));

  // --- RENDER EMPTY STATE ---
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-white/10 rounded-2xl bg-[#18191e]/50 backdrop-blur-sm">
        <div className="p-4 bg-white/5 rounded-full mb-4 ring-1 ring-white/10">
          <Search className="text-gray-500" size={24} />
        </div>
        <h3 className="text-white font-bold text-lg">Data Tidak Ditemukan</h3>
        <p className="text-gray-500 text-sm mt-1 max-w-xs">
          Produk yang kamu cari tidak ada. Coba kata kunci lain atau reset
          filter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Loading Indicator saat Sorting */}
      {isPending && (
        <div className="absolute top-0 left-0 w-full h-1 bg-[#dfff4f]/20 overflow-hidden z-50 rounded-t-xl">
          <div className="h-full bg-[#dfff4f] w-1/3 animate-[loading_1s_ease-in-out_infinite]"></div>
        </div>
      )}

      {/* --- FLOATING BULK ACTION BAR --- */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#202127] border border-white/10 p-2 pl-4 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-4 ring-1 ring-black/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="bg-[#dfff4f] text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {selectedIds.length}
            </span>
            <span className="text-sm text-gray-300 font-medium pr-2 border-r border-white/10">
              Produk Dipilih
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full h-8 px-3 transition-all"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds([])}
            className="text-gray-500 hover:text-white rounded-full h-8 w-8 p-0 hover:bg-white/10"
          >
            <MoreHorizontal size={14} />
          </Button>
        </div>
      )}

      {/* --- TABLE CONTAINER --- */}
      <div className="bg-[#18191e] border border-white/5 rounded-xl shadow-xl overflow-hidden relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-[#18191e]">
              <tr>
                {/* CHECKBOX ALL */}
                <th className="p-4 w-[50px] border-b border-white/5 text-center">
                  <Checkbox
                    checked={
                      data.length > 0 && selectedIds.length === data.length
                    }
                    onCheckedChange={handleSelectAll}
                    className="border-white/20 data-[state=checked]:bg-[#dfff4f] data-[state=checked]:text-black data-[state=checked]:border-[#dfff4f]"
                  />
                </th>

                {/* SORTABLE HEADERS */}
                <SortableHeader
                  label="Produk Info"
                  sortKey="name"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="HPP (Cost)"
                  sortKey="costPrice"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="Harga Jual"
                  sortKey="price"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                  align="right"
                />

                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center border-b border-white/5">
                  Margin
                </th>

                <SortableHeader
                  label="Stok"
                  sortKey="stock"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="Tanggal"
                  sortKey="createdAt"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                />

                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center border-b border-white/5">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {data.map((product) => {
                const cost = Number(product.costPrice);
                const price = Number(product.price);
                const marginPercentage =
                  price > 0 ? ((price - cost) / price) * 100 : 0;
                const isSelected = selectedIds.includes(product.id);

                return (
                  <tr
                    key={product.id}
                    className={cn(
                      'group transition-colors duration-200',
                      isSelected ? 'bg-[#dfff4f]/5' : 'hover:bg-white/[0.02]'
                    )}
                  >
                    {/* CHECKBOX ROW */}
                    <td className="p-4 text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) =>
                          handleSelectRow(product.id, c as boolean)
                        }
                        className="border-white/20 data-[state=checked]:bg-[#dfff4f] data-[state=checked]:text-black data-[state=checked]:border-[#dfff4f]"
                      />
                    </td>

                    {/* PRODUCT INFO */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative shrink-0">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <Package className="text-gray-600" size={16} />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-gray-200 text-sm line-clamp-1 max-w-[200px]">
                            {product.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <SkuBadge sku={product.sku} />
                            {/* Jika ada barcode bisa ditampilkan di sini juga */}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* EDITABLE CELLS */}
                    <td className="p-4 text-right">
                      <CostEditableCell id={product.id} initialCost={cost} />
                    </td>
                    <td className="p-4 text-right">
                      <PriceEditableCell
                        id={product.id}
                        initialPrice={price}
                        costPrice={cost}
                      />
                    </td>

                    {/* MARGIN (Visual only) */}
                    <td className="p-4 text-center">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-1 rounded',
                          marginPercentage < 15
                            ? 'text-red-400 bg-red-500/10'
                            : marginPercentage < 30
                              ? 'text-yellow-400 bg-yellow-500/10'
                              : 'text-green-400 bg-green-500/10'
                        )}
                      >
                        {formatPercent(marginPercentage)}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <StockEditableCell
                        id={product.id}
                        initialStock={product.stock}
                      />
                    </td>

                    {/* CREATED AT (Hydration Safe) */}
                    <td className="p-4 text-center text-xs text-gray-500 font-mono">
                      <div
                        className="flex items-center justify-center gap-1.5"
                        title={
                          product.createdAt ? String(product.createdAt) : '-'
                        }
                      >
                        <CalendarDays size={12} className="opacity-40" />
                        <span suppressHydrationWarning>
                          {product.createdAt
                            ? format(new Date(product.createdAt), 'dd/MM/yy', {
                                locale: idLocale,
                              })
                            : '-'}
                        </span>
                      </div>
                    </td>

                    {/* STATUS SWITCH */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        <StatusToggleCell
                          id={product.id}
                          initialStatus={product.isActive ?? true}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- DIALOG HAPUS --- */}
      <DeleteProductsDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        productsToDelete={selectedProducts}
        onSuccess={() => setSelectedIds([])}
      />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #18191e;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
}
