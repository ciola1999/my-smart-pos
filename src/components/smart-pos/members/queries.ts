import { db } from '@/db'; // Sesuaikan import db-mu
import { members } from '@/db/schema';
import { ilike, or, desc, sql, count } from 'drizzle-orm';

export const ITEMS_PER_PAGE = 10;

export async function getMembers(searchQuery: string = '', page: number = 1) {
  const offset = (page - 1) * ITEMS_PER_PAGE;

  // 1. Kondisi Filter (Search by Name OR Phone)
  const whereCondition = searchQuery
    ? or(
        ilike(members.name, `%${searchQuery}%`),
        ilike(members.phone, `%${searchQuery}%`)
      )
    : undefined;

  // 2. Query Data dengan Pagination
  // Transaction digunakan agar count & data diambil bersamaan (konsisten)
  return await db.transaction(async (tx) => {
    const data = await tx
      .select()
      .from(members)
      .where(whereCondition)
      .limit(ITEMS_PER_PAGE)
      .offset(offset)
      .orderBy(desc(members.id)); // Urutkan dari yang terbaru

    // 3. Hitung Total Data (untuk tahu jumlah halaman)
    const totalResult = await tx
      .select({ count: count() })
      .from(members)
      .where(whereCondition);

    const totalItems = totalResult[0].count;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return {
      data,
      metadata: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: ITEMS_PER_PAGE,
      },
    };
  });
}
