import { db } from '@/db';
import {
  orders,
  orderItems,
  products,
} from '@/db/schema';
import { sql, desc, eq, gte, sum, count } from 'drizzle-orm';

// Export tipe data
export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData() {
  // 🛡️ 1. SATPAM: Cek Server Side
  // Kalau ini jalan di server (saat build), return data kosong biar gak error.
  if (typeof window === 'undefined') {
    return {
      revenueToday: 0,
      ordersToday: 0,
      chartData: [],
      recentOrders: [],
      topProducts: [],
    };
  }

  try {
    // 📅 2. SETUP TANGGAL (Tanpa date-fns biar native & ringan)
    const now = new Date();
    // Set ke jam 00:00:00 hari ini
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Set ke 7 hari lalu
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    // 🔥 3. EKSEKUSI PARALEL
    const [todayStats, salesTrend, recentOrders, topProducts] = await Promise.all([
      
      // A. STATISTIK HARI INI
      db
        .select({
          totalRevenue: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`.mapWith(Number),
          totalOrders: count(orders.id),
        })
        .from(orders)
        .where(gte(orders.createdAt, today)),

      // B. CHART DATA (Revisi: Hindari 'to_char' di SQL, format di JS saja)
      // PGlite lebih aman pakai date_trunc atau casting ke date biasa
      db
        .select({
          rawDate: sql<string>`date_trunc('day', ${orders.createdAt})`, 
          revenue: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`.mapWith(Number),
        })
        .from(orders)
        .where(gte(orders.createdAt, sevenDaysAgo))
        .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
        .orderBy(sql`date_trunc('day', ${orders.createdAt})`),

      // C. RECENT ORDERS (The Pulse)
      db
        .select({
          id: orders.id,
          customerName: orders.customerName,
          totalAmount: sql<number>`${orders.totalAmount}`.mapWith(Number), // Casting number biar aman
          status: orders.paymentMethod, 
          createdAt: orders.createdAt,
          itemsCount: count(orderItems.id),
        })
        .from(orders)
        .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
        .orderBy(desc(orders.createdAt))
        .groupBy(orders.id)
        .limit(5),

      // D. TOP PRODUCTS
      db
        .select({
          id: products.id,
          name: products.name,
          sales: sql<number>`sum(${orderItems.quantity})`.mapWith(Number),
          revenue: sql<number>`sum(${orderItems.priceAtTime})`.mapWith(Number),
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(orders, eq(orderItems.orderId, orders.id))
        .where(gte(orders.createdAt, today))
        .groupBy(products.id, products.name)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(5),
    ]);

    // 🧹 4. DATA MAPPING & FORMATTING (Dilakukan di JS)
    
    // Format Chart Data di sini (Lebih aman daripada SQL 'to_char')
    const formattedChartData = salesTrend.map((item) => {
      const d = new Date(item.rawDate);
      // Format: "05 Feb"
      const label = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      return {
        date: label,
        revenue: item.revenue,
      };
    });

    return {
      revenueToday: Number(todayStats[0]?.totalRevenue || 0),
      ordersToday: Number(todayStats[0]?.totalOrders || 0),
      chartData: formattedChartData,
      recentOrders,
      topProducts,
    };

  } catch (error) {
    console.error("❌ Gagal memuat dashboard:", error);
    // Return dummy data jika error, supaya halaman tidak crash (White Screen)
    return {
      revenueToday: 0,
      ordersToday: 0,
      chartData: [],
      recentOrders: [],
      topProducts: [],
    };
  }
}