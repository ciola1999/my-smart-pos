// src/app/actions.ts
'use server';

import { db } from '@/db';
import { members, discounts, type Member, type Discount } from '@/db/schema';
import { eq, or, ilike, and, gte, lte, isNull } from 'drizzle-orm';
import { z } from 'zod'; // Kita pakai Zod untuk validasi input server-side

// --- 1. SEARCH MEMBER ---
const searchMemberSchema = z.string().min(2, 'Minimal 2 karakter');

export type SearchMemberResult = {
  success: boolean;
  data?: Member[];
  error?: string;
};

export async function searchMember(query: string): Promise<SearchMemberResult> {
  const validation = searchMemberSchema.safeParse(query);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    const results = await db
      .select()
      .from(members)
      .where(
        or(
          ilike(members.name, `%${query}%`),
          ilike(members.phone, `%${query}%`)
        )
      )
      .limit(5); // Limit agar query ringan

    return { success: true, data: results };
  } catch (error) {
    console.error('Search Member Error:', error);
    return { success: false, error: 'Terjadi kesalahan server.' };
  }
}

// --- 2. VALIDATE DISCOUNT ---
export type ValidateDiscountResult = {
  success: boolean;
  data?: Discount;
  error?: string;
};

export async function validateDiscount(
  code: string
): Promise<ValidateDiscountResult> {
  if (!code) return { success: false, error: 'Kode kosong' };

  try {
    const now = new Date();

    const [foundDiscount] = await db
      .select()
      .from(discounts)
      .where(
        and(
          eq(discounts.code, code.toUpperCase()),
          eq(discounts.isActive, true),
          // PERBAIKAN: Gunakan isNull() agar Type-Safe
          or(lte(discounts.startDate, now), isNull(discounts.startDate)),
          or(gte(discounts.endDate, now), isNull(discounts.endDate))
        )
      )
      .limit(1);

    if (!foundDiscount) {
      return { success: false, error: 'Voucher tidak valid atau kadaluarsa.' };
    }

    return { success: true, data: foundDiscount };
  } catch (error) {
    console.error('Discount Validation Error:', error);
    return { success: false, error: 'Gagal memvalidasi diskon.' };
  }
}
