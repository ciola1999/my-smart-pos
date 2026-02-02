'use server';

import { db } from '@/db'; // Sesuaikan path drizzle
import { orders, storeSettings } from '@/db/schema'; // Path schema kamu
import { eq } from 'drizzle-orm';

export async function getReprintData(orderId: number) {
  try {
    // 1. Ambil data Order beserta relasinya
    const transaction = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true, // Mengambil item (pakai snapshot)
        cashier: true, // Mengambil nama kasir
        payments: true, // Mengambil detail split payment (jika ada)
      },
    });

    if (!transaction) return { error: 'Transaksi tidak ditemukan' };

    // 2. Ambil pengaturan toko (untuk Header/Footer struk)
    // Kita ambil baris pertama saja (asumsi single store)
    const settings = await db.query.storeSettings.findFirst();

    return {
      data: {
        transaction,
        store: settings,
      },
    };
  } catch (error) {
    console.error('Reprint Error:', error);
    return { error: 'Gagal memuat data struk' };
  }
}
