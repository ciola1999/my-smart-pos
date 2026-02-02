'use server';

import { db } from '@/db'; // Sesuaikan import db kamu
import { members } from '@/db/schema';
import { memberFormSchema } from './schemas';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Tipe standar untuk return value ActionState React 19
export type ActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  errors?: Record<string, string[]>;
};

export async function upsertMemberAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Ambil data dari FormData
  const rawData = {
    // Jika ada ID (mode edit), convert ke number. Jika tidak, undefined.
    id: formData.get('id') ? parseInt(formData.get('id') as string) : undefined,
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    tier: formData.get('tier'),
  };

  // 2. Validasi dengan Zod
  const validated = memberFormSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      status: 'error',
      message: 'Validasi gagal. Periksa input Anda.',
      errors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    const data = validated.data;

    if (data.id) {
      // --- UPDATE MODE ---
      await db
        .update(members)
        .set({
          name: data.name,
          phone: data.phone,
          email: data.email || null, // Pastikan empty string jadi null
          tier: data.tier,
        })
        .where(eq(members.id, data.id));

      revalidatePath('/dashboard/members');
      return { status: 'success', message: 'Data member berhasil diperbarui!' };
    } else {
      // --- CREATE MODE ---
      // Cek duplikasi nomor HP manual (karena catch error DB kadang kurang rapi untuk user)
      const existing = await db.query.members.findFirst({
        where: eq(members.phone, data.phone),
      });

      if (existing) {
        return {
          status: 'error',
          message: 'Gagal: Nomor HP sudah terdaftar.',
          errors: { phone: ['Nomor ini sudah digunakan member lain'] },
        };
      }

      await db.insert(members).values({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        tier: data.tier,
        points: 0, // Default 0
      });

      revalidatePath('/dashboard/members');
      return {
        status: 'success',
        message: 'Member baru berhasil ditambahkan!',
      };
    }
  } catch (error) {
    console.error('Database Error:', error);
    return {
      status: 'error',
      message: 'Terjadi kesalahan sistem saat menyimpan data.',
    };
  }
}

export async function deleteMemberAction(id: number): Promise<ActionState> {
  try {
    await db.delete(members).where(eq(members.id, id));
    revalidatePath('/dashboard/members');
    return { status: 'success', message: 'Member berhasil dihapus.' };
  } catch (error) {
    return { status: 'error', message: 'Gagal menghapus data.' };
  }
}
