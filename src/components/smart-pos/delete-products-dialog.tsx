'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteProductsAction } from '@/actions/products'; // Pastikan path action benar

interface DeleteProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productsToDelete: { id: number; name: string }[];
  onSuccess?: () => void;
}

export function DeleteProductsDialog({
  open,
  onOpenChange,
  productsToDelete,
  onSuccess,
}: DeleteProductsDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const ids = productsToDelete.map((p) => p.id);
      const result = await deleteProductsAction(ids);

      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-red-500/20 bg-[#18191e] text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-500">
            <Trash2 size={20} /> Hapus {productsToDelete.length} Produk?
          </AlertDialogTitle>

          {/* BAGIAN 1: TEXT PERINGATAN (Tetap di dalam Description karena ini text) */}
          <AlertDialogDescription className="text-gray-400">
            Tindakan ini permanen. Produk yang dihapus tidak bisa dikembalikan.
          </AlertDialogDescription>

          {/* BAGIAN 2: LIST PRODUK (Dikeluarkan dari Description, ditaruh di bawahnya) */}
          {/* Karena AlertDialogHeader adalah div, dia boleh menampung div ini */}
          <div className="mt-4 p-3 bg-red-950/20 rounded-lg border border-red-900/30 text-left">
            <p className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wider">
              Produk yang akan dihapus:
            </p>
            <ul className="max-h-[100px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
              {productsToDelete.map((p) => (
                <li
                  key={p.id}
                  className="text-sm text-gray-300 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/50 shrink-0" />
                  <span className="line-clamp-1">{p.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            className="bg-transparent border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
          >
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white border-0 font-bold"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Proses...
              </>
            ) : (
              'Ya, Hapus Sekarang'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
