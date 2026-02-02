'use client';

import { useState, useTransition } from 'react';
import { Search, UserCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { searchMember } from '@/actions/action'; // Import server action
import type { Member } from '@/db/schema';
import { toast } from 'sonner';

interface MemberSelectorProps {
  onSelect: (member: Member) => void;
  selectedMember: Member | null;
}

export function MemberSelector({
  onSelect,
  selectedMember,
}: MemberSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    // Debounce sederhana via transition
    startTransition(async () => {
      if (val.length < 2) {
        setResults([]);
        return;
      }
      const res = await searchMember(val);
      if (res.success && res.data) {
        setResults(res.data);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start border-dashed"
        >
          {selectedMember ? (
            <>
              <UserCheck className="mr-2 h-4 w-4 text-green-500" />
              <span className="font-semibold">{selectedMember.name}</span>
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Pilih Pelanggan
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cari Pelanggan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau no. hp..."
              className="pl-9"
              value={query}
              onChange={handleSearch}
            />
          </div>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
            {isPending && (
              <p className="text-sm text-muted-foreground p-2">Mencari...</p>
            )}

            {!isPending && results.length === 0 && query.length >= 2 && (
              <p className="text-sm text-muted-foreground p-2">
                Member tidak ditemukan.
              </p>
            )}

            {results.map((member) => (
              <div
                key={member.id}
                onClick={() => {
                  onSelect(member);
                  setOpen(false);
                  toast.success(`Member ${member.name} dipilih`);
                }}
                className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.phone}
                  </p>
                </div>
                <div className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                  {member.tier}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
