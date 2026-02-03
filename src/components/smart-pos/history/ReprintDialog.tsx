'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, Share2, Mail, Copy } from 'lucide-react';
import { getReprintData } from '@/actions/reprint-action';
import { toast } from 'sonner';
import gsap from 'gsap';
import { ReceiptTemplate } from '../ReceiptTemplate';

import { useReactToPrint } from 'react-to-print';
import { toPng } from 'html-to-image';

// --- INTERFACES ---
interface ReceiptItem {
  productNameSnapshot: string;
  quantity: number;
  priceAtTime: number;
}
interface ReceiptPayment {
  paymentMethod: string;
  amount: number;
}
interface ReceiptStore {
  name: string;
  address?: string;
  phone?: string;
  receiptFooter?: string;
  logoUrl?: string | null;
}
interface ReceiptTransaction {
  id: number;
  createdAt: string | Date;
  queueNumber: number;
  totalAmount: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  cashier: { name: string };
  items: ReceiptItem[];
  payments: ReceiptPayment[];
}
interface ReceiptData {
  store: ReceiptStore;
  transaction: ReceiptTransaction;
}

interface ReprintDialogProps {
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReprintDialog({
  orderId,
  open,
  onOpenChange,
}: ReprintDialogProps) {
  const [content, setContent] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);

  const btnPrintRef = useRef<HTMLButtonElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Struk-${orderId || 'Transaksi'}`,
    onAfterPrint: () => console.log('Print success'),
    onPrintError: () => toast.error('Gagal mencetak'),
  });

  // --- LOGIC SHARE (Image) ---
  const handleShare = async () => {
    const originalElement = document.getElementById('receipt-preview-box');

    if (!originalElement) {
      toast.error('Gagal: Elemen struk tidak ditemukan');
      return;
    }

    if (loading) return;
    setLoading(true);
    const toastId = toast.loading('Memproses gambar...');

    try {
      const clone = originalElement.cloneNode(true) as HTMLElement;

      clone.style.position = 'fixed';
      clone.style.top = '-10000px';
      clone.style.left = '-10000px';
      clone.style.zIndex = '-1000';
      clone.style.width = '380px';
      clone.style.background = 'white';
      clone.style.margin = '0';
      clone.style.transform = 'none';

      document.body.appendChild(clone);

      const dataUrl = await toPng(clone, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });

      document.body.removeChild(clone);

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `struk-${orderId}.png`, {
        type: 'image/png',
      });

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Struk Belanja',
            text: `Struk transaksi #${orderId}`,
            files: [file],
          });
          toast.dismiss(toastId);
          toast.success('Berhasil dibagikan');
        } catch (err) {
          toast.dismiss(toastId);
        }
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `struk-${orderId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast.dismiss(toastId);
        toast.success('Struk diunduh');
      }
    } catch (error) {
      console.error('Generate Image Error:', error);
      toast.dismiss(toastId);
      toast.error('Gagal memproses gambar');
      
      // Cleanup extra safety
      const leftover = document.body.lastElementChild as HTMLElement;
      if (leftover && leftover.style.top === '-10000px') {
        document.body.removeChild(leftover);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC EMAIL ---
  const handleEmail = () => {
    if (!content || !content.transaction) {
      toast.error('Data transaksi belum siap');
      return;
    }

    const subject = `Struk Transaksi #${orderId}`;
    const storeInfo = `${content.store.name}\n${content.store.address || ''}`;
    const dateInfo = `Tanggal: ${new Date(
      content.transaction.createdAt
    ).toLocaleString('id-ID')}`;

    const itemsList = content.transaction.items
      .map(
        (item) =>
          `- ${item.productNameSnapshot} (${
            item.quantity
          }x @${item.priceAtTime.toLocaleString('id-ID')})`
      )
      .join('\n');

    const totals = `TOTAL: Rp ${content.transaction.totalAmount.toLocaleString(
      'id-ID'
    )}`;
    const footer = `Terima kasih!`;

    const bodyText = `${storeInfo}\n\n${dateInfo}\n\nBelanjaan:\n${itemsList}\n\n${totals}\n\n${footer}`;

    if (bodyText.length > 1500) {
      toast.warning('Struk terlalu panjang untuk direct email');
    }

    const emailBody = encodeURIComponent(bodyText);
    const mailtoLink = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${emailBody}`;

    try {
      window.open(mailtoLink, '_blank');
    } catch (e) {
      console.error(e);
      toast.error('Gagal membuka aplikasi email');
    }
  };

  // --- LOGIC COPY TEXT ---
  const handleCopyText = async () => {
    if (!content) return;

    const text = `
*${content.store.name}*
${content.store.address || ''}
---------------------------
No: #${orderId}
Tgl: ${new Date(content.transaction.createdAt).toLocaleString('id-ID')}
---------------------------
${content.transaction.items
  .map(
    (item) =>
      `${item.productNameSnapshot} x${item.quantity} (${item.priceAtTime})`
  )
  .join('\n')}
---------------------------
*TOTAL: Rp ${content.transaction.totalAmount.toLocaleString('id-ID')}*
---------------------------
Terima kasih!
  `;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Rincian struk disalin!');
    } catch (err) {
      toast.error('Gagal menyalin');
    }
  };

  useEffect(() => {
    if (!open || !orderId) return;
    let isActive = true;
    const fetchReceipt = async () => {
      try {
        setLoading(true);
        setContent(null);
        const res = await getReprintData(orderId);
        if (!isActive) return;
        if (res.error || !res.data) {
          toast.error(res.error || 'Data kosong');
          onOpenChange(false);
        } else {
          setContent(res.data as unknown as ReceiptData);
        }
      } catch (error) {
        console.error(error);
        toast.error('Gagal mengambil data struk');
      } finally {
        if (isActive) setLoading(false);
      }
    };
    fetchReceipt();
    return () => {
      isActive = false;
    };
  }, [open, orderId, onOpenChange]);

  useEffect(() => {
    if (!loading && content && receiptRef.current) {
      gsap.fromTo(
        receiptRef.current,
        { y: -20, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }
  }, [loading, content]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-zinc-950/90 border-zinc-800 backdrop-blur-xl p-0 overflow-hidden gap-0 text-zinc-100">
        <DialogHeader className="sr-only">
          <DialogTitle>Reprint Struk</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="relative flex items-center justify-center p-4 border-b border-zinc-800">
          <div className="absolute left-4 flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleShare}
              disabled={loading}
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleEmail}
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Mail className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCopyText}
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <span className="text-sm font-bold text-zinc-200">Preview Struk</span>
        </div>

        {/* Content Area */}
        <div className="p-6 bg-zinc-900/50 flex justify-center min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-xs">Mengambil data transaksi...</span>
            </div>
          ) : content ? (
            <div className="shadow-2xl">
              <div
                id="receipt-preview-box"
                ref={receiptRef}
                className="bg-white text-black"
              >
                <ReceiptTemplate
                  storeName={content.store.name}
                  storeAddress={content.store.address || '-'}
                  storePhone={content.store.phone}
                  receiptFooter={content.store.receiptFooter}
                  subtotal={content.transaction.totalAmount}
                  taxAmount={0}       
                  discountAmount={0}
                  date={content.transaction.createdAt}
                  orderId={content.transaction.id}
                  cashierName={content.transaction.cashier?.name || 'Kasir'}
                  customerName={'Guest'}
                  items={content.transaction.items.map((item, idx) => ({
                    id: idx,
                    name: item.productNameSnapshot,
                    quantity: item.quantity,
                    price: item.priceAtTime,
                  }))}
                  orderType={'dine_in'}
                  amountPaid={content.transaction.amountPaid}
                  totalAmount={content.transaction.totalAmount}
                  paymentMethod={content.transaction.paymentMethod}
                  cashAmount={content.transaction.amountPaid}
                  changeAmount={content.transaction.change}
                  payments={(content.transaction.payments || []).map((p) => ({
                    paymentMethod: p.paymentMethod,
                    amount: p.amount,
                  }))}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end">
          <Button
            ref={btnPrintRef}
            disabled={loading}
            onClick={() => handlePrint()}
            className="rounded-full px-8 bg-white text-black hover:bg-zinc-200 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all"
          >
            <Printer className="w-4 h-4 mr-2" />
            Cetak Struk
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}