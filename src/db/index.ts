import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema"; // Pastikan path schema Anda benar

// 1. Inisialisasi PGlite
// "idb://smart-pos-db" artinya data disimpan di IndexedDB browser dengan nama 'smart-pos-db'.
// Ini sangat cepat dan persistent untuk offline-first.
const client = new PGlite("idb://smart-pos-db");

// 2. Inisialisasi Drizzle
export const db = drizzle(client, { schema });

// 3. (Opsional) Helper untuk cek koneksi di console
export const checkDbConnection = async () => {
  try {
    await client.waitReady;
    console.log("✅ PGlite Database Connected (Offline/IndexedDB Mode)");
    return true;
  } catch (error) {
    console.error("❌ Database Connection Failed:", error);
    return false;
  }
};