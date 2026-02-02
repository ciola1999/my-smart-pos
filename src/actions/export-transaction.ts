// app/actions/export-transactions.ts
'use server';

import { db } from '@/db/index';
import {
  orders,
  orderItems,
  orderPayments,
  users,
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

// 2. Tipe Komposit (Relasi) -> SEKARANG KITA PAKAI ✅
type TransactionWithRelations = Order & {
  items: OrderItem[];
  payments: OrderPayment[];
  cashier: User | null;
};

interface TransactionExportRow {
  'No. ID': string;
  Tanggal: string;
  Jam: string;
  'Tipe Order': string;
  Pelanggan: string;
  Items: string;
  'Total Belanja': number;
  'Metode Bayar': string;
  'Detail Bayar': string;
  Kasir: string;
  Status: string;
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
    // Jika tidak ada filter, default ke 30 hari terakhir (biar aman tidak fetch jutaan data)
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const startDate = from || defaultFrom;
    const endDate = to || new Date(); // Hari ini

    // Pastikan endDate mencakup sampai akhir hari (23:59:59)
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);
    // 3. Casting hasil query ke tipe eksplisit ✅
    // Kita memberitahu TS: "Hasil query ini pasti strukturnya TransactionWithRelations[]"
    const transactions = (await db.query.orders.findMany({
      orderBy: [desc(orders.createdAt)],
      where: and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      ),
      with: {
        cashier: true,
        items: true,
        payments: true,
      },
      // Limit bisa dilepas atau diperbesar karena sudah ada filter tanggal
      limit: 2000,
    })) as TransactionWithRelations[];
    // ^^^ Perhatikan casting 'as' di sini.
    // Ini memaksa tipe data agar sesuai definisi kita.

    if (!transactions.length) {
      return { success: false, message: 'Tidak ada data transaksi' };
    }

    // 4. Mapping Data
    // Sekarang variabel 'trx' di sini otomatis dikenali sebagai TransactionWithRelations
    const excelData: TransactionExportRow[] = transactions.map((trx) => {
      const itemsSummary = trx.items
        .map((i) => `${i.productNameSnapshot} (${i.quantity})`)
        .join(', ');

      let paymentDetail = trx.paymentMethod?.toUpperCase() || '-';

      if (trx.paymentMethod === 'split') {
        paymentDetail = trx.payments
          .map(
            (p) =>
              `${(p.paymentMethod || '').toUpperCase()}: ${formatRupiah(
                p.amount
              )}`
          )
          .join(' + ');
      }

      return {
        'No. ID': `#${trx.id}`,
        Tanggal: trx.createdAt
          ? format(trx.createdAt, 'dd MMM yyyy', { locale: id })
          : '-',
        Jam: trx.createdAt
          ? format(trx.createdAt, 'HH:mm', { locale: id })
          : '-',
        'Tipe Order':
          trx.orderType === 'dine_in' ? 'Makan di Tempat' : 'Bungkus',
        Pelanggan: trx.customerName || 'Guest',
        Items: itemsSummary,
        'Total Belanja': trx.totalAmount,
        'Metode Bayar': (trx.paymentMethod || '').toUpperCase(),
        'Detail Bayar': paymentDetail,
        Kasir: trx.cashier?.name || 'Unknown',
        Status: 'Selesai',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const wscols = [
      { wch: 10 },
      { wch: 15 },
      { wch: 8 },
      { wch: 18 },
      { wch: 20 },
      { wch: 45 },
      { wch: 15 },
      { wch: 12 },
      { wch: 35 },
      { wch: 15 },
      { wch: 10 },
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Transaksi');

    const dateLabel = `${format(startDate, 'ddMM')}-${format(endDate, 'ddMM')}`;
    const fileName = `Laporan-POS-${dateLabel}.xlsx`;
    const buf = XLSX.write(workbook, {
      type: 'base64',
      bookType: 'xlsx',
    }); // Placeholder

    return { success: true, data: buf as string, filename: fileName };
  } catch (error) {
    console.error('Export Failed:', error);
    return { success: false, message: 'Terjadi kesalahan sistem saat export.' };
  }
}
