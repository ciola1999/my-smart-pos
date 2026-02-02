// src/app/projects/smart-pos/page.tsx
import { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

// Actions & Utils
import { getProducts } from '@/actions/products';
import { getTransactionHistory } from '@/actions/get-history';
import { getUser } from '@/actions/auth';
import { getDashboardData } from '@/services/dashboard.service';
import { getStoreSettings } from '@/actions/setting-action';

// 🔥 1. IMPORT DB & SCHEMA UNTUK FETCH PAJAK
import { db } from '@/db';
import { taxes } from '@/db/schema';

import SmartPosMainView from '@/components/smart-pos/main-view';
import SmartPosSkeleton from '@/components/smart-pos/Skeleton';

export const metadata: Metadata = {
  title: 'Kasir - NexLanding POS',
  description: 'Aplikasi Smart POS terintegrasi',
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// --- KOMPONEN PENGAMBIL DATA (UPDATED) ---
async function PosDataLoader({
  currentView,
  sort,
  order,
}: {
  currentView: string | undefined;
  sort: string;
  order: 'asc' | 'desc';
}) {
  // 🔥 2. TAMBAHKAN db.select().from(taxes) KE PROMISE.ALL
  const [
    productsResult,
    historyResult,
    dashboardData,
    storeSettings,
    taxesData, // 👈 Hasil fetch pajak
  ] = await Promise.all([
    getProducts(sort, order),
    getTransactionHistory(),
    getDashboardData(),
    getStoreSettings(),
    db.select().from(taxes), // 👈 Fetch langsung dari DB (Aman di Server Component)
  ]);

  const products = productsResult.success ? productsResult.data : [];
  const history = historyResult.success ? historyResult.data : [];

  return (
    <SmartPosMainView
      products={products ?? []}
      transactionHistory={history}
      dashboardData={dashboardData}
      storeSettings={storeSettings}
      taxesData={taxesData} // 👈 3. PASS DATA PAJAK KE VIEW
      currentView={currentView}
    />
  );
}

// --- HALAMAN UTAMA ---
export default async function PosPage({ searchParams }: Props) {
  // 🔒 CEK AUTENTIKASI
  const session = await getUser();

  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;

  // 1. Ambil View
  const currentView = typeof params.view === 'string' ? params.view : undefined;

  // 2. Ambil Sorting
  const sort = typeof params.sort === 'string' ? params.sort : 'createdAt';
  const orderRaw = typeof params.order === 'string' ? params.order : 'desc';
  const order: 'asc' | 'desc' = orderRaw === 'asc' ? 'asc' : 'desc';

  return (
    <main>
      <Suspense fallback={<SmartPosSkeleton />}>
        <PosDataLoader currentView={currentView} sort={sort} order={order} />
      </Suspense>
    </main>
  );
}
