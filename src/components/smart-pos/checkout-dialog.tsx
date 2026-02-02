'use client';

import * as React from 'react';
import { useRef, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import gsap from 'gsap';
import {
  Banknote,
  CreditCard,
  CheckCircle2,
  QrCode,
  Loader2,
  Split,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn, formatRupiah } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// --- 1. DEFINISI TIPE DATA YANG STRICT ---

// Tipe Pembayaran Atomic (sesuai DB)
export type PaymentDetail = {
  type: 'cash' | 'debit' | 'qris';
  amount: number;
  bankName?: string;
  refNumber?: string;
};

// Tipe Data yang akan dikirim ke Parent (pos-interface)
export interface CheckoutResultData {
  orderType: 'dine_in' | 'take_away';
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  payments: PaymentDetail[];
}

// --- 2. ZOD SCHEMA FORM INTERNAL (UI STATE) ---
const formSchema = z.object({
  tableNumber: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),

  // Enum ini termasuk 'split' untuk keperluan UI, meski nanti outputnya array
  paymentMethod: z.enum(['cash', 'debit', 'qris', 'split']),

  // Field Kondisional
  bankName: z.string().optional(),
  refNumber: z.string().optional(),
  cashGiven: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;

  // 🔥 UPDATE: Ganti 'any' dengan Tipe Strict
  onConfirm: (data: CheckoutResultData) => void;

  isPending: boolean;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  subtotal,
  onConfirm,
  isPending,
}: CheckoutDialogProps) {
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away'>(
    'dine_in'
  );
  const debitRef = useRef<HTMLDivElement>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentMethod: 'cash',
      cashGiven: 0,
    },
  });

  const paymentMethod = watch('paymentMethod');
  const cashGiven = watch('cashGiven') || 0;
  const change = cashGiven - subtotal;

  // --- ANIMASI GSAP ---
  useEffect(() => {
    if (paymentMethod === 'debit' && debitRef.current) {
      gsap.fromTo(
        debitRef.current,
        { height: 0, opacity: 0, y: -10 },
        { height: 'auto', opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [paymentMethod]);

  // --- SUBMIT HANDLER ---
  const onSubmit = (data: FormValues) => {
    // A. Validasi Logic Bisnis UI
    if (orderType === 'dine_in' && !data.tableNumber) {
      toast.error('Nomor meja wajib diisi untuk Dine In');
      return;
    }

    if (data.paymentMethod === 'cash' && (data.cashGiven || 0) < subtotal) {
      toast.error(
        `Uang kurang Rp ${formatRupiah(subtotal - (data.cashGiven || 0))}`
      );
      return;
    }

    if (data.paymentMethod === 'debit') {
      if (!data.bankName) {
        toast.error('Pilih Bank Penerbit!');
        return;
      }
      if (!data.refNumber || data.refNumber.length < 4) {
        toast.error('Masukkan 4 digit terakhir nomor kartu/struk');
        return;
      }
    }

    // B. Transformasi Data (Mapping Form -> CheckoutResultData)
    // 🔥 UPDATE: Kita inisialisasi array dengan tipe PaymentDetail[]
    const payments: PaymentDetail[] = [];

    if (data.paymentMethod === 'split') {
      toast.info('Fitur Split Bill sedang di-update logic-nya.');
      return;
    } else {
      // Single Payment Logic
      payments.push({
        type: data.paymentMethod as 'cash' | 'debit' | 'qris',
        amount:
          data.paymentMethod === 'cash' ? data.cashGiven || subtotal : subtotal,
        // Bersihkan data: jika bukan debit, undefined
        bankName: data.paymentMethod === 'debit' ? data.bankName : undefined,
        refNumber:
          data.paymentMethod === 'debit' || data.paymentMethod === 'qris'
            ? data.refNumber
            : undefined,
      });
    }

    // C. Kirim Data Strict ke Parent
    const finalPayload: CheckoutResultData = {
      orderType,
      tableNumber: data.tableNumber || '',
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      payments,
    };

    onConfirm(finalPayload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>
            Total Tagihan:{' '}
            <span className="text-primary font-bold">
              {formatRupiah(subtotal)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* TIPE PESANAN */}
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setOrderType('dine_in')}
              className={cn(
                'cursor-pointer border rounded-lg p-3 text-center transition-all',
                orderType === 'dine_in'
                  ? 'bg-primary/10 border-primary text-primary font-bold'
                  : 'hover:bg-muted'
              )}
            >
              🍽️ Dine In
            </div>
            <div
              onClick={() => setOrderType('take_away')}
              className={cn(
                'cursor-pointer border rounded-lg p-3 text-center transition-all',
                orderType === 'take_away'
                  ? 'bg-primary/10 border-primary text-primary font-bold'
                  : 'hover:bg-muted'
              )}
            >
              🛍️ Take Away
            </div>
          </div>

          {/* INPUT DATA PELANGGAN */}
          <div className="space-y-3">
            {orderType === 'dine_in' && (
              <Input
                placeholder="Nomor Meja"
                {...register('tableNumber')}
                className="bg-muted/30"
              />
            )}
            <Input
              placeholder="Nama Pelanggan"
              {...register('customerName')}
              className="bg-muted/30"
            />
            <Input
              placeholder="Nomor HP (WhatsApp)"
              {...register('customerPhone')}
              type="tel"
              className="bg-muted/30"
            />
          </div>

          <Separator />

          {/* PILIH METODE PEMBAYARAN */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'debit', label: 'Debit', icon: CreditCard },
              { id: 'qris', label: 'QRIS', icon: CheckCircle2 },
              { id: 'split', label: 'Split', icon: Split },
            ].map((m) => (
              <div
                key={m.id}
                // 🔥 UPDATE: Casting ke tipe enum yang valid, bukan 'any'
                onClick={() =>
                  setValue('paymentMethod', m.id as FormValues['paymentMethod'])
                }
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer transition-all h-16',
                  paymentMethod === m.id
                    ? 'border-lime-400 bg-lime-400/10 text-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.2)]'
                    : 'border-zinc-800 hover:bg-zinc-800 text-muted-foreground'
                )}
              >
                <m.icon size={18} className="mb-1" />
                <span className="text-[10px] font-bold uppercase">
                  {m.label}
                </span>
              </div>
            ))}
          </div>

          {/* --- LOGIC CASH --- */}
          {paymentMethod === 'cash' && (
            <div className="bg-muted/50 p-3 rounded-xl border border-dashed border-zinc-700 animate-in fade-in zoom-in-95">
              <label className="text-xs text-muted-foreground mb-1 block">
                Uang Diterima
              </label>
              <Input
                type="number"
                {...register('cashGiven', { valueAsNumber: true })}
                className="text-lg font-bold h-12 bg-background"
                autoFocus
              />
              <div className="flex justify-between items-center mt-2 text-sm">
                <span>Kembalian:</span>
                <span
                  className={cn(
                    'font-bold text-lg',
                    change < 0 ? 'text-red-500' : 'text-green-500'
                  )}
                >
                  {formatRupiah(change)}
                </span>
              </div>
            </div>
          )}

          {/* --- LOGIC DEBIT --- */}
          <div className="overflow-hidden">
            {paymentMethod === 'debit' && (
              <div ref={debitRef} className="space-y-3 pt-2">
                <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold">
                      Pilih Bank
                    </label>
                    <Select onValueChange={(val) => setValue('bankName', val)}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-700">
                        <SelectValue placeholder="-- Pilih Bank EDC --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BCA">BCA</SelectItem>
                        <SelectItem value="MANDIRI">Mandiri</SelectItem>
                        <SelectItem value="BNI">BNI</SelectItem>
                        <SelectItem value="BRI">BRI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold">
                      No. Ref (4 Digit Akhir)
                    </label>
                    <Input
                      placeholder="Contoh: 4521"
                      maxLength={6}
                      className="bg-zinc-950 border-zinc-700 font-mono tracking-widest"
                      {...register('refNumber')}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-center text-zinc-500 italic">
                  Pastikan transaksi EDC sudah Approved.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
            className="w-full h-11 text-base font-bold bg-lime-400 text-black hover:bg-lime-500"
          >
            {isPending ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              'Bayar Sekarang (Enter)'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
