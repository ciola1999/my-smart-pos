"use client";

import { useEffect, useState } from "react";
import { db } from "@/db"; 
import { sql } from "drizzle-orm";
import { MIGRATION_SCRIPT } from "@/lib/migration";

export function DbGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    const init = async () => {
      try {
        console.log("⚡ Checking Offline Database...");
        
        // 1. Cek apakah DB sudah ter-seed (Cek keberadaan tabel 'users')
        // Kita pakai try-catch query sederhana
        let isSeeded = false;
        try {
           await db.execute(sql`SELECT count(*) FROM "users" LIMIT 1`);
           isSeeded = true;
        } catch (e) {
           isSeeded = false;
        }

        if (isSeeded) {
            console.log("✅ Database already exists. Skipping migration.");
            setIsReady(true);
            return;
        }

        // 2. Jika belum ada, jalankan Migrasi
        setStatus("Applying Migrations...");
        console.log("🛠 Applying Schema...");

        // Split script berdasarkan '--> statement-breakpoint' agar dieksekusi per blok
        // Ini penting karena PGlite kadang bingung jika satu string besar sekaligus
        const statements = MIGRATION_SCRIPT.split('--> statement-breakpoint');

        for (const statement of statements) {
            const cleanStmt = statement.trim();
            if (cleanStmt.length > 0) {
                await db.execute(sql.raw(cleanStmt));
            }
        }
        
        console.log("✅ Migration Success!");
        setIsReady(true);

      } catch (err: any) {
        console.error("❌ DB Init Failed:", err);
        setError(err.message || "Unknown Database Error");
      }
    };

    init();
  }, []);

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-red-950 text-white p-10 font-mono">
        <h1 className="text-2xl font-bold mb-4">CRITICAL DATABASE ERROR</h1>
        <p className="mb-4">Please restart the application or clear browser data.</p>
        <div className="bg-black p-4 rounded text-xs w-full max-w-2xl overflow-auto border border-red-800">
          {error}
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-emerald-500"></div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Smart POS v2</p>
            <p className="text-xs text-zinc-500 animate-pulse">{status}</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}