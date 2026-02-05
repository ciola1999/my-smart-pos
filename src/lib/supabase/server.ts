// src/lib/supabase/server.ts
import { createBrowserClient } from '@supabase/ssr';

// PERHATIAN: 
// Di mode Tauri (Static Export), kita tidak bisa menggunakan 'next/headers' atau 'cookies()'.
// Fungsi ini dimodifikasi agar build Next.js tidak error.

export async function createClient() {
  // Kita kembalikan instance client yang bekerja di level Browser.
  // Auth state akan disimpan di LocalStorage/IndexedDB browser, bukan di HttpOnly Cookie server.
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}