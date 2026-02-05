
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function checkDatabaseConnection() {
  try {
    const start = performance.now();
    // Query sederhana
    await db.execute(sql`SELECT 1`);
    const end = performance.now();

    return {
      success: true,
      latency: Math.round(end - start),
      message: 'Terhubung ke Postgres',
    };
  } catch (error: unknown) {
    // 1. Gunakan 'unknown' alih-alih 'any'
    console.error('Database Connection Error:', error);

    let errorMessage = 'Gagal terhubung ke Database';

    // 2. Cek apakah error tersebut adalah object Error standar
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Opsional: Handle string error jika ada library yang melempar string mentah
    else if (typeof error === 'string') {
      errorMessage = error;
    }

    return {
      success: false,
      latency: 0,
      message: errorMessage,
    };
  }
}
