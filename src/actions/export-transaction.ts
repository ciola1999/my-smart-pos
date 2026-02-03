'use server';

import { db } from '@/db'; // 👈 Pastikan path ini sesuai (biasanya @/db saja cukup jika ada index.ts)
import {
  orders,
  orderItems,
  orderPayments,
  users, // ⚠️ Pastikan table 'users' sudah diexport di schema.ts
} from '@/db/schema';
import { desc, type InferSelectModel, and, gte, lte } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// 1. Definisikan Tipe Data Dasar
type Order = InferSelectModel<typeof orders>;
type OrderItem = InferSelectModel<typeof orderItems>;
type OrderPayment = InferSelectModel<typeof orderPayments>;
type User = InferSelectModel<typeof users>;

// 2. Tipe Komposit (Relasi)
// Pastikan relasi 'items', 'payments', dan 'cashier' sudah didefinisikan di relations.ts / schema.ts
type TransactionWithRelations = Order & {
  items: OrderItem[];
  payments: OrderPayment[];
  cashier: User | null;
};

interface TransactionExportRow {
  'No. ID': string;
  'Tanggal': string;
  'Jam': string;
  'Tipe Order': string;
  'Pelanggan': string;
  'Items': string;
  'Total Belanja': number; // Excel suka number
  'Metode Bayar': string;
  'Detail Bayar': string;
  'Kasir': string;
  'Status': string;
}

const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export async function exportTransactionsAction(from?: Date, to?: Date) {
  try {
    // Logic Filter Tanggal
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const startDate = from || defaultFrom;
    const endDate = to || new Date(); // Hari ini

    // Pastikan endDate mencakup sampai akhir hari (23:59:59)
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    // 3. Query Data
    const transactions = (await db.query.orders.findMany({
      orderBy: [desc(orders.createdAt)],
      where: and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      ),
      with: {
        cashier: true,   // ⚠️ Pastikan relation 'cashier' ada di schema (relations)
        items: true,
        payments: true,
      },
      limit: 2000,
    })) as TransactionWithRelations[];

    if (!transactions.length) {
      return { success: false, message: 'Tidak ada data transaksi pada periode ini.' };
    }

    // 4. Mapping Data (Fix Decimal String here)
    const excelData: TransactionExportRow[] = transactions.map((trx) => {
      const itemsSummary = trx.items
        .map((i) => `${i.productNameSnapshot} (${i.quantity})`)
        .join(', ');

      let paymentDetail = trx.paymentMethod?.toUpperCase() || '-';

      // 🔥 FIX 1: Handle Split Payment Amount (String -> Number)
      if (trx.paymentMethod === 'split') {
        paymentDetail = trx.payments
          .map(
            (p) =>
              `${(p.paymentMethod || '').toUpperCase()}: ${formatRupiah(
                Number(p.amount) // Konversi string decimal ke number dulu!
              )}`
          )
          .join(' + ');
      }

      // 🔥 FIX 2: Handle Total Amount (String -> Number)
      // Kita pakai Number() agar Excel membacanya sebagai angka, bukan teks
      const totalBelanjaNumber = Number(trx.totalAmount); 

      return {
        'No. ID': `#${trx.id}`,
        'Tanggal': trx.createdAt
          ? format(new Date(trx.createdAt), 'dd MMM yyyy', { locale: id }) // new Date() jaga-jaga kalau string
          : '-',
        'Jam': trx.createdAt
          ? format(new Date(trx.createdAt), 'HH:mm', { locale: id })
          : '-',
        'Tipe Order':
          trx.orderType === 'dine_in' ? 'Makan di Tempat' : 'Bungkus',
        'Pelanggan': trx.customerName || 'Guest',
        'Items': itemsSummary,
        'Total Belanja': totalBelanjaNumber, // ✅ Kirim number bersih ke Excel
        'Metode Bayar': (trx.paymentMethod || '').toUpperCase(),
        'Detail Bayar': paymentDetail,
        'Kasir': trx.cashier?.name || 'Unknown',
        'Status': 'Selesai',
      };
    });

    // 5. Generate Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const wscols = [
      { wch: 10 }, // ID
      { wch: 15 }, // Tanggal
      { wch: 8 },  // Jam
      { wch: 18 }, // Tipe
      { wch: 20 }, // Pelanggan
      { wch: 45 }, // Items (Lebar)
      { wch: 15 }, // Total
      { wch: 12 }, // Metode
      { wch: 35 }, // Detail Bayar (Lebar)
      { wch: 15 }, // Kasir
      { wch: 10 }, // Status
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Transaksi');

    const dateLabel = `${format(startDate, 'ddMM')}-${format(endDate, 'ddMM')}`;
    const fileName = `Laporan-POS-${dateLabel}.xlsx`;
    
    // Tulis ke buffer base64
    const buf = XLSX.write(workbook, {
      type: 'base64',
      bookType: 'xlsx',
    });

    return { success: true, data: buf as string, filename: fileName };
  } catch (error) {
    console.error('Export Failed:', error);
    return { success: false, message: 'Terjadi kesalahan sistem saat export.' };
  }
}