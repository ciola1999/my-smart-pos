'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import { exportTransactionsAction } from '@/actions/export-transaction';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { parseAsIsoDate, useQueryState } from 'nuqs'; // Tambah ini

export function ExportExcelButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const containerRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [from] = useQueryState('from', parseAsIsoDate);
  const [to] = useQueryState('to', parseAsIsoDate);

  const { contextSafe } = useGSAP({ scope: containerRef });

  // ✅ PERBAIKAN: Terima elemen sebagai parameter (argumen)
  // Definisi fungsi ini sekarang "murni" dan tidak menyentuh ref.current secara langsung
  const animateClick = contextSafe((target: HTMLElement) => {
    gsap.to(target, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut',
    });
  });

  // ✅ PERBAIKAN: Terima elemen icon & label sebagai parameter
  const animateSuccess = contextSafe(
    (iconTarget: HTMLElement, labelTarget: HTMLElement) => {
      const tl = gsap.timeline();

      tl.fromTo(
        iconTarget,
        { rotation: 0, scale: 0.5, opacity: 0 },
        {
          rotation: 360,
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: 'back.out(1.7)',
        }
      );

      tl.from(labelTarget, { y: 5, opacity: 0, duration: 0.3 }, '<0.1');
    }
  );

  const animateReset = contextSafe((target: HTMLElement) => {
    gsap.to(target, {
      clearProps: 'all',
      duration: 0.3,
    });
  });

  const handleDownload = async () => {
    if (status === 'loading') return;
    if (!containerRef.current) return;

    animateClick(containerRef.current);
    setStatus('loading');

    // 2. Kirim parameter tanggal ke Server Action ✅
    // Pastikan konversi null -> undefined jika nuqs return null
    const res = await exportTransactionsAction(
      from || undefined,
      to || undefined
    );

    if (res.success && res.data) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.data}`;
      link.download = res.filename || 'laporan-transaksi.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus('success');
      toast.success('Download Berhasil', {
        description: 'Laporan transaksi telah disimpan.',
      });

      // Pass ref.current ke fungsi animasi
      if (iconRef.current && labelRef.current) {
        animateSuccess(iconRef.current, labelRef.current);
      }

      setTimeout(() => {
        setStatus('idle');
        if (containerRef.current) animateReset(containerRef.current);
      }, 3000);
    } else {
      setStatus('idle');
      toast.error('Gagal Export', { description: res.message });
    }
  };

  return (
    <Button
      ref={containerRef}
      variant="outline"
      onClick={handleDownload}
      disabled={status === 'loading'}
      className="group relative overflow-hidden border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 transition-colors"
    >
      <div ref={iconRef} className="mr-2 relative z-10">
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
        ) : status === 'success' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 text-zinc-700 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
        )}
      </div>

      <span ref={labelRef} className="relative z-10 font-medium">
        {status === 'loading'
          ? 'Memproses...'
          : status === 'success'
          ? 'Selesai!'
          : 'Export Excel'}
      </span>

      {status === 'loading' && (
        <div className="absolute inset-0 bg-zinc-100/50 dark:bg-zinc-800/50 w-full h-full origin-left animate-[progress_2s_ease-in-out_infinite]" />
      )}

      {status === 'success' && (
        <div className="absolute inset-0 bg-green-50 dark:bg-green-900/20 w-full h-full" />
      )}
    </Button>
  );
}
