'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface PaginationProps {
  totalPages: number;
  currentPage: number;
}

export function PaginationControls({
  totalPages,
  currentPage,
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { replace } = useRouter();

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-end gap-2 py-4">
      <span className="text-sm text-gray-400 mr-2">
        Halaman {currentPage} dari {totalPages}
      </span>

      <Button
        variant="outline"
        size="icon"
        onClick={() => createPageURL(currentPage - 1)}
        disabled={currentPage <= 1}
        className="h-8 w-8 bg-transparent border-white/10 hover:bg-white/10 text-gray-300 disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={() => createPageURL(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="h-8 w-8 bg-transparent border-white/10 hover:bg-white/10 text-gray-300 disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
