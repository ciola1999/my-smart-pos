// Project\smart-pos-v2\src\components\smart-pos\HistoryList.tsx

'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  ChevronDown,
  ShoppingBag,
  Calendar,
  CreditCard,
  PackageX,
  User,
  Phone,
  Armchair,
  Hash,
  QrCode,
  Banknote,
  MessageCircle,
  PieChart,
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
// ✅ Import Komponen Custom
import { ReprintDialog } from './history/ReprintDialog';
import { DateRangeFilter } from './history/date-range-filter';
import { ExportExcelButton } from './history/ExportButton';

// --- TYPE DEFINITION ---
type HistoryItem = {
  id: number;

  // 🔥 UPDATE 1: Ratakan struktur (sesuai kolom DB)
  subtotal: number | null;
  taxAmount: number | null;
  totalAmount: number;

  amountPaid: number | null;
  change: number | null;
  paymentMethod: 'cash' | 'debit' | 'qris' | 'split' | string;
  tableNumber: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  queueNumber: number;
  createdAt: Date | string | null;

  payments?: {
    id: number;
    paymentMethod: 'cash' | 'debit' | 'qris' | 'split' | string;
    amount: number;
  }[];

  // ❌ Hapus bagian summary ini karena data sudah ada di root (subtotal & taxAmount di atas)
  // summary: {
  //   taxAmount: number;
  // };

  items: {
    id: number;
    quantity: number;
    priceAtTime: number;
    productNameSnapshot: string;
    skuSnapshot: string | null;
    product: {
      name: string;
    } | null;
  }[];
};

export default function HistoryList({ history }: { history: HistoryItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ✅ STATE: Dialog Reprint
  const [reprintOpen, setReprintOpen] = useState(false);
  const [selectedReprintId, setSelectedReprintId] = useState<number | null>(
    null
  );

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateInput: Date | string | null) => {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    return date
      .toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      })
      .replace(/\./g, ':');
  };

  // --- HANDLER REPRINT ---
  const handleOpenReprint = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelectedReprintId(id);
    setReprintOpen(true);
  };

  // --- BADGE LOGIC ---
  const getPaymentBadge = (method: string) => {
    const m = method.toLowerCase();
    switch (m) {
      case 'qris':
        return {
          colorClass:
            'from-purple-500/20 to-purple-900/10 text-purple-400 border-purple-500/20',
          icon: QrCode,
          label: 'QRIS',
        };
      case 'debit':
        return {
          colorClass:
            'from-blue-500/20 to-blue-900/10 text-blue-400 border-blue-500/20',
          icon: CreditCard,
          label: 'DEBIT',
        };
      case 'split':
        return {
          colorClass:
            'from-orange-500/20 to-orange-900/10 text-orange-400 border-orange-500/20',
          icon: PieChart,
          label: 'SPLIT',
        };
      case 'cash':
      default:
        return {
          colorClass:
            'from-emerald-500/20 to-emerald-900/10 text-emerald-400 border-emerald-500/20',
          icon: Banknote,
          label: 'CASH',
        };
    }
  };

  const handleOpenWA = (phone: string | null | undefined) => {
    if (!phone) return;
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.substring(1);
    window.open(`https://wa.me/${p}`, '_blank');
  };

  useGSAP(
    () => {
      if (!containerRef.current || history.length === 0) return;
      gsap.set('.history-row', { clearProps: 'all' });
      gsap.fromTo(
        '.history-row',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    },
    { scope: containerRef, dependencies: [history] }
  );

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* 1. SECTION HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Riwayat Transaksi
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Pantau pemasukan dan unduh laporan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter />
          <ExportExcelButton />
        </div>
      </div>

      {/* 2. SECTION LIST */}
      {!history || history.length === 0 ? (
        <div className="text-center py-20 text-gray-500 flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="bg-neutral-900/50 w-24 h-24 rounded-full flex items-center justify-center mb-4 border border-white/5 shadow-inner">
            <ShoppingBag className="w-10 h-10 opacity-30" />
          </div>
          <p className="text-lg font-medium text-gray-400">
            Tidak ada transaksi pada periode ini.
          </p>
          <p className="text-sm text-gray-600">
            Coba atur ulang filter tanggal.
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="flex flex-col w-full pb-20">
          {history.map((order) => {
            const badge = getPaymentBadge(order.paymentMethod);
            const PaymentIcon = badge.icon;

            return (
              <div
                key={order.id}
                className={`history-row border-b border-white/5 last:border-0 transition-all duration-300 ${
                  expandedId === order.id
                    ? 'bg-white/[0.03] border-l-2 border-l-[#dfff4f]'
                    : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                }`}
              >
                {/* --- HEADER ROW --- */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  className="p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg bg-gradient-to-br',
                        badge.colorClass
                      )}
                    >
                      <PaymentIcon size={20} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base tracking-wide">
                          Order #{order.id}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#dfff4f]/10 text-[#dfff4f] border border-[#dfff4f]/20 font-bold uppercase tracking-wider">
                          Success
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1.5 font-medium">
                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md">
                          <Calendar size={12} className="text-gray-500" />
                          <span className="tracking-wide text-gray-300">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md">
                          <User size={12} className="text-gray-500" />
                          <span className="text-gray-300">
                            {order.customerName || 'Guest'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pl-[4rem] sm:pl-0">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white tracking-tight">
                        {formatRupiah(order.totalAmount)}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">
                        <PaymentIcon size={10} />
                        {badge.label}
                      </div>
                    </div>

                    <div
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 border border-white/5 ${
                        expandedId === order.id
                          ? 'rotate-180 bg-[#dfff4f] text-black border-[#dfff4f]'
                          : 'text-gray-500 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                {/* --- EXPANDED DETAIL --- */}
                <div
                  className={`grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    expandedId === order.id
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="bg-black/20 border-t border-dashed border-white/10 mx-0 sm:mx-4 mb-4 rounded-b-2xl px-4 pb-4">
                      {/* DETAIL GRID */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 text-sm">
                        {/* Meja */}
                        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-gray-500 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
                            <Armchair size={12} /> No. Meja
                          </span>
                          <span className="text-white font-bold text-lg">
                            {order.tableNumber}
                          </span>
                        </div>

                        {/* Antrian */}
                        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-gray-500 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
                            <Hash size={12} /> Antrian
                          </span>
                          <span className="text-[#dfff4f] font-bold text-lg">
                            #{order.queueNumber}
                          </span>
                        </div>

                        {/* Pelanggan */}
                        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-gray-500 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
                            <User size={12} /> Pelanggan
                          </span>
                          <span className="text-white font-medium truncate">
                            {order.customerName || 'Guest'}
                          </span>
                        </div>

                        {/* No HP */}
                        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5 relative group">
                          <span className="text-gray-500 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
                            <Phone size={12} /> No. HP
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium truncate">
                              {order.customerPhone || '-'}
                            </span>
                            {order.customerPhone && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWA(order.customerPhone);
                                }}
                                className="bg-green-600 hover:bg-green-500 text-white p-1 rounded-full transition-colors shadow-lg"
                                title="Chat WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* TABEL ITEM */}
                      <div className="border border-white/5 rounded-xl overflow-hidden bg-[#121317]">
                        <table className="w-full text-sm text-left text-gray-300">
                          <thead className="text-[10px] text-gray-500 uppercase bg-white/5 tracking-wider">
                            <tr>
                              <th className="px-4 py-3 font-bold">Produk</th>
                              <th className="px-4 py-3 text-right font-bold">
                                Harga
                              </th>
                              <th className="px-4 py-3 text-center font-bold">
                                Qty
                              </th>
                              <th className="px-4 py-3 text-right font-bold">
                                Subtotal
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {order.items.map((item) => {
                              const isProductDeleted = !item.product;
                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-white/[0.02] transition-colors group"
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span
                                        className={cn(
                                          'font-medium transition-colors',
                                          isProductDeleted
                                            ? 'text-gray-400'
                                            : 'text-white group-hover:text-[#dfff4f]'
                                        )}
                                      >
                                        {item.productNameSnapshot}
                                      </span>
                                      {item.skuSnapshot && (
                                        <span className="text-[10px] text-gray-600 font-mono">
                                          {item.skuSnapshot}
                                        </span>
                                      )}
                                      {isProductDeleted && (
                                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-900/10 px-1.5 py-0.5 rounded border border-red-500/20 w-fit">
                                          <PackageX size={10} /> Discontinue
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-500 font-mono text-xs">
                                    {formatRupiah(item.priceAtTime)}
                                  </td>
                                  <td className="px-4 py-3 text-center text-white text-xs font-bold">
                                    x{item.quantity}
                                  </td>
                                  <td className="px-4 py-3 text-right text-white font-bold font-mono text-xs">
                                    {formatRupiah(
                                      item.priceAtTime * item.quantity
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* --- FOOTER & TOTAL --- */}
                        <div className="bg-[#dfff4f]/5 border-t border-[#dfff4f]/10 p-4">
                          <div className="flex flex-col gap-2">
                            {/* 🔥 UPDATE 2: Tambah Baris Subtotal */}
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">
                                Subtotal
                              </span>
                              <span className="text-sm font-mono text-gray-300">
                                {formatRupiah(order.subtotal || 0)}
                              </span>
                            </div>

                            {/* Baris Pajak */}
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">
                                Pajak (Tax)
                              </span>
                              <span className="text-sm font-mono text-gray-300">
                                {formatRupiah(order.taxAmount || 0)}
                              </span>
                            </div>

                            {/* Total Utama */}
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-white/10">
                              <span className="text-xs text-[#dfff4f] uppercase font-bold tracking-widest">
                                Total Tagihan
                              </span>
                              <span className="text-base font-bold text-[#dfff4f]">
                                {formatRupiah(order.totalAmount)}
                              </span>
                            </div>

                            {/* --- LOGIKA SPLIT & CASH --- */}
                            {order.paymentMethod === 'split' &&
                              order.payments &&
                              order.payments.length > 0 && (
                                <div className="mt-1 pt-2 border-t border-dashed border-white/10 flex flex-col gap-1.5">
                                  <span className="text-[10px] text-orange-400 uppercase font-bold tracking-wider mb-1">
                                    Rincian Pembayaran (Split)
                                  </span>
                                  {order.payments.map((p) => (
                                    <div
                                      key={p.id}
                                      className="flex justify-between items-center text-xs"
                                    >
                                      <span className="text-gray-400 uppercase flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500/50"></span>
                                        {p.paymentMethod.toUpperCase()}
                                      </span>
                                      <span className="font-mono text-gray-300">
                                        {formatRupiah(p.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                            {order.paymentMethod === 'cash' && (
                              <>
                                <div className="w-full h-px bg-white/5 my-1" />
                                <div className="flex justify-between items-center text-xs text-gray-400">
                                  <span>Tunai Diterima</span>
                                  <span className="font-mono text-gray-300">
                                    {formatRupiah(
                                      order.amountPaid || order.totalAmount
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-400">
                                    Kembalian
                                  </span>
                                  <span
                                    className={cn(
                                      'font-mono font-bold',
                                      (order.change || 0) < 0
                                        ? 'text-red-400'
                                        : 'text-emerald-400'
                                    )}
                                  >
                                    {formatRupiah(order.change || 0)}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* TOMBOL REPRINT */}
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={(e) => handleOpenReprint(e, order.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95"
                        >
                          <Printer size={14} />
                          Cetak Struk
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. DIALOG REPRINT */}
      <ReprintDialog
        open={reprintOpen}
        onOpenChange={setReprintOpen}
        orderId={selectedReprintId}
      />
    </div>
  );
}
