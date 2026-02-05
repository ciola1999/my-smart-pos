'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

// Actions & Utils
import { getProducts } from '@/actions/products';
import { getTransactionHistory } from '@/actions/get-history';
import { getDashboardData } from '@/services/dashboard.service';
import { getStoreSettings } from '@/actions/setting-action';

// DB Imports
import { db } from '@/db';
import { taxes } from '@/db/schema';
import { sql } from "drizzle-orm";

// Components
import SmartPosMainView from '@/components/smart-pos/main-view';
import SmartPosSkeleton from '@/components/smart-pos/Skeleton';

export default function PosPage() {

  return (
    <Suspense fallback={<SmartPosSkeleton />}>
      <PosContent />
    </Suspense>
  );
}

function PosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. State untuk Data
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    products: [],
    history: [],
    dashboard: null,
    settings: null,
    taxes: [],
  });

  // 2. State untuk Query Params (View & Sort)
  const currentView = searchParams.get('view') || undefined;
  const sort = searchParams.get('sort') || 'createdAt';
  const order = (searchParams.get('order') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  useEffect(() => {
    let isMounted = true;

    const initPage = async () => {
      try {
        // --- A. AUTH CHECK (Client Side) ---
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/login');
          return;
        }

        // --- B. DATA FETCHING (Parallel) ---
        const [
          productsResult,
          historyResult,
          dashboardData,
          storeSettings,
          taxesData
        ] = await Promise.all([
          getProducts(sort, order),
          getTransactionHistory(),
          getDashboardData(),
          getStoreSettings(),
          db.select().from(taxes),
        ]);

        if (isMounted) {
          setData({
            products: productsResult.success ? productsResult.data : [],
            history: historyResult.success ? historyResult.data : [],
            dashboard: dashboardData,
            settings: storeSettings,
            taxes: taxesData,
          });
          setLoading(false);
        }

      } catch (error) {
        console.error("Gagal memuat data POS:", error);
      }
    };

    initPage();

    return () => { isMounted = false; };
  }, [router, sort, order]); 

  if (loading) {
    return <SmartPosSkeleton />;
  }

  return (
    <main>
      <SmartPosMainView
        products={data.products}
        transactionHistory={data.history}
        dashboardData={data.dashboard}
        storeSettings={data.settings}
        taxesData={data.taxes}
        currentView={currentView}
      />
    </main>
  );
}