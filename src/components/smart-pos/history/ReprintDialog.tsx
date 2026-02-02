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

// 1. IMPORT LIBRARY INI
import { useReactToPrint } from 'react-to-print';
import { toPng } from 'html-to-image';

// ... (Interface ReceiptItem, ReceiptPayment, dll TETAP SAMA, tidak perlu diubah) ...
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

  // Ref untuk tombol (animasi)
  const btnPrintRef = useRef<HTMLButtonElement>(null);

  // Ref untuk komponen Struk
  const receiptRef = useRef<HTMLDivElement>(null);

  // 2. SETUP REACT-TO-PRINT
  const handlePrint = useReactToPrint({
    contentRef: receiptRef, // Mengambil konten dari ref receipt
    documentTitle: `Struk-${orderId || 'Transaksi'}`,
    onAfterPrint: () => console.log('Print success'),
    onPrintError: () => toast.error('Gagal mencetak'),
  });

  // --- LOGIC SHARE BUTTON (VERSI AMAN) ---
  const handleShare = async () => {
    // 1. Ambil elemen asli
    const originalElement = document.getElementById('receipt-preview-box');

    if (!originalElement) {
      toast.error('Gagal: Elemen struk tidak ditemukan');
      return;
    }

    if (loading) return;
    setLoading(true);
    const toastId = toast.loading('Memproses gambar...');

    try {
      // 2. TEKNIK CLONING MANUAL (Tetap dipakai karena paling stabil)
      const clone = originalElement.cloneNode(true) as HTMLElement;

      // 3. Setup Clone (Sembunyikan dari layar)
      clone.style.position = 'fixed';
      clone.style.top = '-10000px';
      clone.style.left = '-10000px';
      clone.style.zIndex = '-1000';
      clone.style.width = '380px'; // Lebar tetap agar hasil konsisten
      clone.style.background = 'white'; // Pastikan background putih

      // Reset margin agar tidak berantakan
      clone.style.margin = '0';
      clone.style.transform = 'none';

      // 4. Tempel ke Body
      document.body.appendChild(clone);

      // 5. PROSES FOTO MENGGUNAKAN HTML-TO-IMAGE
      // Library ini support CSS modern (lab/oklch) jadi tidak akan error
      const dataUrl = await toPng(clone, {
        cacheBust: true, // Paksa refresh gambar (hindari cache)
        backgroundColor: '#ffffff',
        pixelRatio: 2, // Resolusi tajam (setara scale: 2)
      });

      // 6. Hapus Clone
      document.body.removeChild(clone);

      // 7. Convert DataURL (Base64) ke Blob (File Object)
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `struk-${orderId}.png`, {
        type: 'image/png',
      });

      // --- LOGIC SHARE / DOWNLOAD (Sama seperti sebelumnya) ---
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
        // Fallback Download PC
        const a = document.createElement('a');
        a.href = dataUrl; // Bisa langsung pakai dataUrl
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

      // Cleanup jika error
      const leftover = document.body.lastElementChild as HTMLElement;
      if (leftover && leftover.style.top === '-10000px') {
        document.body.removeChild(leftover);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = () => {
    // 1. Cek Data dulu
    if (!content || !content.transaction) {
      toast.error('Data transaksi belum siap');
      return;
    }

    // 2. Susun Data (Sama seperti sebelumnya)
    const subject = `Struk Transaksi #${orderId}`;
    const storeInfo = `${content.store.name}\n${content.store.address || ''}`;
    const dateInfo = `Tanggal: ${new Date(
      content.transaction.createdAt
    ).toLocaleString('id-ID')}`;

    // List Barang
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

    // 3. Susun Body dengan encodeURIComponent
    const bodyText = `${storeInfo}\n\n${dateInfo}\n\nBelanjaan:\n${itemsList}\n\n${totals}\n\n${footer}`;

    // Cek panjang karakter (Browser punya limit sekitar 2000 karakter untuk URL)
    if (bodyText.length > 1500) {
      toast.warning('Struk terlalu panjang untuk direct email');
    }

    const emailBody = encodeURIComponent(bodyText);
    const mailtoLink = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${emailBody}`;

    // 4. EKSEKUSI: Gunakan window.open agar lebih agresif membuka aplikasi
    try {
      // Log untuk memastikan kode jalan
      console.log('Mencoba membuka email client...');

      // Membuka di tab baru seringkali memancing browser utk mendeteksi aplikasi mail
      window.open(mailtoLink, '_blank');
    } catch (e) {
      console.error(e);
      toast.error('Gagal membuka aplikasi email');
    }
  };

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

  // Fetch Data Effect (TETAP SAMA)
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

  // Animasi GSAP (TETAP SAMA)
  useEffect(() => {
    if (!loading && content && receiptRef.current) {
      gsap.fromTo(
        receiptRef.current,
        { y: -20, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }
  }, [loading, content]);

  // Magnetic Button Logic (Bisa dihapus jika error, tapi kalau jalan biarkan saja)
  // ... (Kode Magnetic Button kamu di sini) ...

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-zinc-950/90 border-zinc-800 backdrop-blur-xl p-0 overflow-hidden gap-0 text-zinc-100">
        <DialogHeader className="sr-only">
          <DialogTitle>Reprint Struk</DialogTitle>
        </DialogHeader>

        {/* Header Dialog */}
        <div className="relative flex items-center justify-center p-4 border-b border-zinc-800">
          {/* Container Tombol Kiri */}
          <div className="absolute left-4 flex gap-2">
            {/* Tombol Share Gambar (Yang sudah berhasil tadi) */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleShare}
              disabled={loading}
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
              title="Bagikan Gambar (WA/Sosmed)"
            >
              <Share2 className="w-4 h-4" />
            </Button>

            {/* Tombol Email (Baru) */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleEmail}
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
              title="Kirim Rincian via Email"
            >
              <Mail className="w-4 h-4" />
            </Button>
            {/* 3. Copy Teks (BARU - Solusi untuk PC) */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCopyText}
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
              title="Salin Teks Struk"
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
              {/* 3. PASTIKAN REF DIPASANG DI SINI 
                 React-to-print akan mengambil elemen ini dan isinya saja 
              */}
              <div
                id="receipt-preview-box"
                ref={receiptRef}
                className="bg-white text-black"
              >
                <ReceiptTemplate
                  // Mapping props (Sama seperti kodemu sebelumnya)
                  storeName={content.store.name}
                  storeAddress={content.store.address || '-'}
                  storePhone={content.store.phone}
                  receiptFooter={content.store.receiptFooter}
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
                  totalAmount={content.transaction.totalAmount}
                  paymentMethod={content.transaction.paymentMethod}
                  cashAmount={content.transaction.amountPaid}
                  changeAmount={content.transaction.change}
                  payments={content.transaction.payments.map((p) => ({
                    method: p.paymentMethod,
                    amount: p.amount,
                  }))}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Dialog */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end">
          <Button
            ref={btnPrintRef}
            disabled={loading}
            // 4. PANGGIL FUNCTION DARI REACT-TO-PRINT
            onClick={() => handlePrint()}
            className="rounded-full px-8 bg-white text-black hover:bg-zinc-200 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all"
          >
            <Printer className="w-4 h-4 mr-2" />
            Cetak Struk
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
