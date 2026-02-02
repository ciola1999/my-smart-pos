'use client';

import { useActionState, useEffect } from 'react'; // Hapus useState
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  // DialogTrigger dihapus karena controlled component
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { upsertMemberAction } from '../actions';
import { toast } from 'sonner';
// Import Plus dari lucide-react dihapus
import type { Member } from '@/db/schema';

interface MemberDialogProps {
  initialData?: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDialog({
  initialData,
  open,
  onOpenChange,
}: MemberDialogProps) {
  // React 19 State Handling
  const [state, formAction, isPending] = useActionState(upsertMemberAction, {
    status: 'idle',
    message: '',
  });

  // Efek samping setelah submit (Tutup modal / Show Toast)
  useEffect(() => {
    if (state.status === 'success') {
      toast.success(state.message);
      onOpenChange(false);
    } else if (state.status === 'error') {
      toast.error(state.message);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Member' : 'Tambah Member Baru'}
          </DialogTitle>
        </DialogHeader>

        <form action={formAction} className="grid gap-4 py-4">
          {/* Hidden ID untuk Edit Mode */}
          {initialData && (
            <input type="hidden" name="id" value={initialData.id} />
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialData?.name}
              placeholder="Contoh: Budi Santoso"
              required
            />
            {state.errors?.name && (
              <p className="text-red-500 text-xs">{state.errors.name[0]}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Nomor HP</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={initialData?.phone}
              placeholder="08123456789"
              type="tel"
              required
            />
            {state.errors?.phone && (
              <p className="text-red-500 text-xs">{state.errors.phone[0]}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email (Opsional)</Label>
            <Input
              id="email"
              name="email"
              defaultValue={initialData?.email || ''}
              placeholder="budi@example.com"
              type="email"
            />
            {state.errors?.email && (
              <p className="text-red-500 text-xs">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tier">Level Member</Label>
            <Select name="tier" defaultValue={initialData?.tier || 'Silver'}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? 'Menyimpan...'
                : initialData
                  ? 'Simpan Perubahan'
                  : 'Tambah Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
