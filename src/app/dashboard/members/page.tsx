import { getMembers } from '@/components/smart-pos/members/queries';
import { MemberTable } from '@/components/smart-pos/members/components/member-table';
import { MemberSearch } from '@/components/smart-pos/members/components/member-search';
import { PaginationControls } from '@/components/smart-pos/members/components/pagination-controls';
import { Suspense } from 'react';

// Di Next.js 15/16, searchParams mungkin berbentuk Promise
type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function MembersPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.q || '';
  const currentPage = Number(searchParams?.page) || 1;

  // Fetch data dengan filter & pagination
  const { data, metadata } = await getMembers(query, currentPage);

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Manajemen Member
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Kelola data pelanggan, tier, dan poin loyalitas.
          </p>
        </div>

        {/* Pasang Search Component disini */}
        {/* Suspense diperlukan karena useSearchParams adalah Client Hook */}
        <Suspense
          fallback={
            <div className="h-10 w-[300px] bg-white/5 animate-pulse rounded-md" />
          }
        >
          <MemberSearch />
        </Suspense>
      </div>

      {/* TABLE SECTION */}
      {/* Kita passing metadata total items ke Table jika ingin menampilkan info "Menampilkan 1-10 dari 50" */}
      <MemberTable data={data} />

      {/* PAGINATION SECTION */}
      {metadata.totalPages > 1 && (
        <PaginationControls
          totalPages={metadata.totalPages}
          currentPage={metadata.currentPage}
        />
      )}
    </div>
  );
}
