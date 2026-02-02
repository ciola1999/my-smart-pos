'use server';

import { db } from '@/db';
import { orders } from '@/db/schema';
import { desc, and, gte, lte, sql } from 'drizzle-orm';

// Kita tambahkan parameter opsional untuk filter tanggal
export async function getTransactionHistory(dateRange?: {
  from: Date;
  to: Date;
}) {
  try {
    // 1. Logika Filter Tanggal
    let whereCondition = undefined;

    if (dateRange?.from && dateRange?.to) {
      // Set jam ke akhir hari untuk tanggal 'to' agar data hari itu masuk semua
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);

      whereCondition = and(
        gte(orders.createdAt, dateRange.from),
        lte(orders.createdAt, endDate)
      );
    }

    // 2. Query Database
    const data = await db.query.orders.findMany({
      where: whereCondition,
      orderBy: [desc(orders.createdAt)],

      // Secara default Drizzle mengambil semua kolom di schema.ts
      // Pastikan schema.ts orders sudah punya: subtotal, taxAmount, totalAmount

      with: {
        items: {
          with: {
            product: true, // Mengambil nama product
          },
        },
        payments: true, // Mengambil rincian split payment
      },
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching history:', error);
    return { success: false, data: [] };
  }
}
