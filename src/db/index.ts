// Project\smart-pos-v2\src\db\index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// 1. Definisikan tipe untuk global variable agar TypeScript tidak komplain
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// 2. Konfigurasi koneksi
// Gunakan koneksi yang sudah ada (jika ada), kalau tidak buat baru.
const client = globalForDb.conn ?? postgres(connectionString, {
  prepare: false, // Wajib false untuk Supabase Transaction Mode
  max: process.env.NODE_ENV === 'production' ? 10 : 1, // Batasi koneksi!
  idle_timeout: 20, // Tutup koneksi jika nganggur 20 detik
  connect_timeout: 10,
});

// 3. Simpan koneksi ke global variable HANYA di mode development
// Ini mencegah hot-reload Next.js membuat koneksi bocor (leak) berulang kali
if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = client;
}

export const db = drizzle(client, { schema });