// src/actions/auth.ts

'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// Kita pakai validasi Zod biar aman (bisa dipindah ke lib/schemas nanti)
const loginSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  password: z.string().min(1, { message: "Password wajib diisi" }),
});

export type AuthState = {
  success?: boolean;
  message?: string;
  errors?: {
    email?: string[];
    password?: string[];
  };
};

export async function loginAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  // 1. Ambil data & Validasi Zod
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const validatedFields = loginSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Input tidak valid.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  // 2. Init Supabase
  const supabase = await createClient();

  // 3. Login via Supabase Auth (Pengganti verifyPassword lama)
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Supabase Login Error:', error.message);
    // Kita translate error message biar user friendly
    let errorMsg = 'Email atau password salah.';
    if (error.message.includes('Email not confirmed')) errorMsg = 'Email belum diverifikasi.';
    
    return { success: false, message: errorMsg };
  }

  // 4. Redirect jika sukses
  // ⚠️ PASTIKAN REDIRECT KE ALAMAT YANG BENAR (Sesuaikan dengan folder project kamu)
  // Misalnya: /projects/smart-pos
  redirect('/'); 
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Redirect kemana setelah logout?
  redirect('/login'); 
}

// 🔥🔥 TAMBAHAN PENTING (Agar bisa dipanggil di page.tsx) 🔥🔥
export async function getUser() {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}