//Project\smart-pos-v2\src\components\smart-pos\members\components\member-search.tsx

'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce'; // Perlu install library ini atau pakai timer manual

// PENTING: Install dulu librarynya: bun add use-debounce
// Kalau tidak mau install library, saya buatkan versi manual di bawah.

export function MemberSearch() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Debounce: Tunggu 300ms setelah user berhenti mengetik baru jalan
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);

    // Reset ke halaman 1 setiap kali search berubah
    params.set('page', '1');

    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }

    // Update URL tanpa reload halaman (Client-side navigation)
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
      <Input
        type="search"
        placeholder="Cari nama atau no. HP..."
        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-lime-400 focus-visible:border-transparent"
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('q')?.toString()}
      />
    </div>
  );
}
