'use server';

import { db } from '@/db';
import {
  orders,
  orderItems,
  orderPayments,
  products,
  type Order,
} from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq, sql, gte, desc } from 'drizzle-orm';

// --- TYPE DEFINITIONS ---

type CheckoutResult =
  | { success: false; message: string; data?: never }
  | { success: true; message: string; data: Order };

type CheckoutItem = {
  id: number;
  quantity: number;
  price: number;
};

type PaymentDetail = {
  method: 'cash' | 'debit' | 'qris';
  amount: number;
  referenceId?: string;
};

type CustomerData = {
  orderType: 'dine_in' | 'take_away';
  tableNumber: string;
  customerName?: string;
  customerPhone?: string;
  payments: PaymentDetail[];

  // Field Member & Diskon
  memberId?: number | null;
  discountId?: number | null;

  // Snapshot Keuangan
  summary: {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
  };
};

export async function processCheckout(
  items: CheckoutItem[],
  customer: CustomerData // <--- Perhatikan nama variabel ini adalah 'customer'
): Promise<CheckoutResult> {
  // 1. Validasi Input Dasar
  if (!items.length) {
    return { success: false, message: 'Keranjang belanja kosong.' };
  }

  if (!customer.payments || customer.payments.length === 0) {
    return { success: false, message: 'Data pembayaran tidak valid.' };
  }

  // 2. Logic Validasi Table Number
  let finalTableNumber = customer.tableNumber;

  if (customer.orderType === 'dine_in' && !finalTableNumber) {
    return { success: false, message: 'Nomor Meja wajib diisi untuk Dine In!' };
  }

  if (customer.orderType === 'take_away') {
    finalTableNumber = 'TAKE AWAY';
  }

  try {
    const result = await db.transaction(async (tx) => {
      // A. Hitung Queue Number
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const lastOrderToday = await tx.query.orders.findFirst({
        where: gte(orders.createdAt, startOfDay),
        orderBy: [desc(orders.queueNumber)],
        columns: { queueNumber: true },
      });

      const nextQueueNumber = (lastOrderToday?.queueNumber ?? 0) + 1;

      // B. Hitung Total Tagihan (Server Side Calculation)

      // 1. Hitung Subtotal Murni (Harga barang di DB/Cart)
      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // 2. Ambil Diskon & Pajak dari parameter Frontend
      // (Idealnya diskon divalidasi ulang di sini, tapi ambil dari summary dulu agar cepat)
      const discountAmount = customer.summary.discountAmount || 0;
      const taxAmount = customer.summary.taxAmount || 0;

      // 3. 🔥 PERBAIKAN RUMUS: (Subtotal - Diskon) + Pajak
      const finalTotalAmount = subtotal - discountAmount + taxAmount;

      // Logic Validasi Pembayaran
      const totalPaid = customer.payments.reduce((sum, p) => sum + p.amount, 0);

      // Cek apakah uang pembayaran kurang (gunakan finalTotalAmount)
      if (totalPaid < finalTotalAmount) {
        throw new Error(
          `Pembayaran kurang! Tagihan: ${finalTotalAmount}, Dibayar: ${totalPaid}`
        );
      }

      // Hitung Kembalian
      const change = totalPaid - finalTotalAmount;

      const mainPaymentMethod =
        customer.payments.length > 1 ? 'split' : customer.payments[0].method;

      // C. Insert Order Header
      const [insertedOrder] = await tx
        .insert(orders)
        .values({
          // Data Keuangan
          subtotal: subtotal,
          discountAmount: discountAmount, // 🔥 PENTING: Simpan nominal diskon
          taxAmount: taxAmount,
          totalAmount: finalTotalAmount,

          // Data Relasi
          memberId: customer.memberId ?? null, // 🔥 FIX: Gunakan 'customer', bukan 'data'
          discountId: customer.discountId ?? null, // 🔥 FIX: Gunakan 'customer', bukan 'data'

          // Data Order Lainnya
          orderType: customer.orderType,
          paymentMethod: mainPaymentMethod,
          amountPaid: totalPaid,
          change: change,
          customerName: customer.customerName || 'Guest',
          customerPhone: customer.customerPhone || null,
          tableNumber: finalTableNumber,
          queueNumber: nextQueueNumber,
        })
        .returning();

      // D. Insert Detail Pembayaran
      for (const pay of customer.payments) {
        await tx.insert(orderPayments).values({
          orderId: insertedOrder.id,
          paymentMethod: pay.method,
          amount: pay.amount,
          referenceId: pay.referenceId || null,
        });
      }

      // E. Insert Items & Update Stock
      for (const item of items) {
        const productInfo = await tx.query.products.findFirst({
          where: eq(products.id, item.id),
          columns: {
            name: true,
            sku: true,
            costPrice: true,
            stock: true,
          },
        });

        if (!productInfo) {
          throw new Error(`Produk ID ${item.id} tidak ditemukan`);
        }

        if (productInfo.stock < item.quantity) {
          throw new Error(
            `Stok untuk produk "${productInfo.name}" tidak mencukupi.`
          );
        }

        await tx.insert(orderItems).values({
          orderId: insertedOrder.id,
          productId: item.id,
          quantity: item.quantity,
          priceAtTime: item.price,
          costPriceAtTime: productInfo.costPrice || '0',
          productNameSnapshot: productInfo.name,
          skuSnapshot: productInfo.sku || null,
        });

        await tx
          .update(products)
          .set({
            stock: sql`${products.stock} - ${item.quantity}`,
          })
          .where(eq(products.id, item.id));
      }

      return insertedOrder;
    });

    revalidatePath('/projects/smart-pos');

    return {
      success: true,
      message: 'Transaksi Berhasil!',
      data: result,
    };
  } catch (error) {
    console.error('Checkout Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Gagal memproses transaksi.';

    return {
      success: false,
      message: errorMessage,
    };
  }
}
