'use client';

import * as React from 'react';
import {
  useMemo,
  useTransition,
  useEffect,
  useRef,
  useCallback,
  useState,
} from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useReactToPrint } from 'react-to-print';
import { AnimatePresence, motion } from 'framer-motion'; // Untuk animasi halus

// --- ICONS ---
import {
  Trash2,
  Plus,
  Minus,
  Search,
  Loader2,
  ShoppingCart,
  PackageOpen,
  User,
  CheckCircle2,
  ArrowRight,
  ShoppingBag,
  Banknote,
  CreditCard,
  Printer,
  MessageCircle,
  Utensils,
  TicketPercent,
  X,
} from 'lucide-react';

// --- COMPONENTS & UTILS ---
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn, formatRupiah } from '@/lib/utils';
import { processCheckout } from '@/actions/transaction';

import { MemberSelector } from './member-selector'; // Pastikan path sesuai
import { validateDiscount } from '@/actions/action'; // Server Action
import { type Member, type Discount } from '@/db/schema'; // Type DB

// --- TYPES (Strict Type-Safety) ---
import type { Products, CartItem } from '@/types';
import type { Order, StoreSetting, Tax } from '@/db/schema';
import { ReceiptTemplate } from './ReceiptTemplate';

// Interface Props
interface POSInterfaceProps {
  initialProducts: Products[];
  storeSettings: StoreSetting | null;
  taxesData?: Tax[];
}

// State Form Customer
interface CustomerFormState {
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  orderType: 'dine_in' | 'take_away';
  paymentMethod: 'cash' | 'debit' | 'qris';
}

// Payment Item untuk Split Bill
interface PaymentItem {
  method: 'cash' | 'debit' | 'qris';
  amount: number;
  referenceId: string;
}

// 🔥 BARU: Interface untuk State Data Sukses (Struk)
interface SuccessTransactionState {
  order: Order; // (Idealnya gunakan type 'Order' dari schema, tapi 'any' sementara aman)
  items: {
    id: number;
    name: string; // Pastikan CartItem kamu punya field name
    quantity: number;
    price: number;
  }[];
  cashReceived: number;
  change: number;
  payments: PaymentItem[];

  // 🔥 FIELD TAMBAHAN (Solusi Error Kamu)
  member?: Member | null;
  discountAmount?: number;
}

export default function POSInterface({
  initialProducts,
  storeSettings,
  taxesData = [],
}: POSInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // --- CORE STATE ---
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isPending, startTransition] = useTransition();
  const [isInitialized, setIsInitialized] = React.useState(false);

  // --- UI STATE ---
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [isCartSheetOpen, setIsCartSheetOpen] = React.useState(false);
  const [isSplitMode, setIsSplitMode] = React.useState(false);

  // --- FORM STATE ---
  const [customerForm, setCustomerForm] = React.useState<CustomerFormState>({
    tableNumber: '',
    customerName: '',
    customerPhone: '',
    orderType: 'dine_in',
    paymentMethod: 'cash',
  });

  const [debitForm, setDebitForm] = React.useState({
    bankName: '',
    lastFourDigits: '',
    approvalCode: '',
  });

  // State Keuangan
  const [cashGiven, setCashGiven] = React.useState<number | ''>(''); // Allow empty string for better UX
  const [splitPayments, setSplitPayments] = React.useState<PaymentItem[]>([]);

  // Result State (Untuk Dialog Sukses)
  // Pastikan type 'Member' sudah diimport di paling atas file
  // import type { Member } from '@/db/schema';

  const [successData, setSuccessData] =
    useState<SuccessTransactionState | null>(null);

  // --- CALCULATIONS (TOP LEVEL - JANGAN DI DALAM FUNGSI LAIN) ---

  // ... State Member & Diskon yang sudah kamu tulis (Pertahankan ini)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeDiscount, setActiveDiscount] = useState<Discount | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [isCheckingVoucher, startCheckVoucher] = useTransition();

  // 1. Hitung Rate Pajak (Tetap sama)
  const taxRate = useMemo(
    () => (taxesData.length > 0 ? parseFloat(taxesData[0].rate) : 0),
    [taxesData]
  );
  const taxName = useMemo(
    () => (taxesData.length > 0 ? taxesData[0].name : 'Pajak'),
    [taxesData]
  );

  // 2. 🔥 UPDATE LOGIC: Subtotal -> Diskon -> Pajak -> Total
  const { subtotal, discountAmount, taxAmount, finalTotal } = useMemo(() => {
    // A. Hitung Subtotal Murni
    const sub = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // B. Hitung Nominal Diskon
    let disc = 0;
    if (activeDiscount) {
      if (activeDiscount.type === 'PERCENTAGE') {
        // Rumus: Subtotal * (Nilai% / 100)
        disc = Math.round(sub * (Number(activeDiscount.value) / 100));
      } else {
        // Rumus: Potongan Tetap (Fixed)
        disc = Math.round(Number(activeDiscount.value));
      }

      // Safety: Jangan sampai diskon lebih besar dari harga barang
      if (disc > sub) disc = sub;
    }

    // C. Hitung DPP (Dasar Pengenaan Pajak) / Taxable Amount
    const taxableAmount = sub - disc;

    // D. Hitung Pajak (Dari harga yang sudah didiskon)
    // Rumus: DPP * (Rate / 100)
    const tax = Math.round((taxableAmount * taxRate) / 100);

    return {
      subtotal: sub,
      discountAmount: disc, // Return variable baru ini
      taxAmount: tax,
      finalTotal: taxableAmount + tax, // Total yang harus dibayar
    };
  }, [cart, taxRate, activeDiscount]); // Tambahkan activeDiscount ke dependency

  // 3. Hitung Split Bill (Tetap sama)
  const totalPaidSplit = useMemo(
    () => splitPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    [splitPayments]
  );

  // 4. 🔥 NEW: Handler Apply Voucher
  const handleApplyVoucher = () => {
    if (!voucherCode) return;

    startCheckVoucher(async () => {
      // Pastikan import validateDiscount dari actions.ts
      const res = await validateDiscount(voucherCode);

      if (res.success && res.data) {
        setActiveDiscount(res.data);
        toast.success('Voucher berhasil digunakan!');
        setVoucherCode(''); // Reset input
      } else {
        toast.error(res.error || 'Kode voucher tidak valid');
      }
    });
  };

  // Pastikan remaining tidak minus (Math.max)
  const remainingSplit = Math.max(0, finalTotal - totalPaidSplit);

  // --- INIT & LOCAL STORAGE SAFEGUARD (FIXED) ---
  useEffect(() => {
    // Kita bungkus dalam setTimeout agar tidak memblokir render pertama (Synchronous SetState Error Fix)
    const timer = setTimeout(() => {
      const savedCart = localStorage.getItem('nexpos-cart');

      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          // Validasi sederhana array sebelum set
          if (Array.isArray(parsedCart)) {
            setCart(parsedCart);
          }
        } catch (e) {
          console.error('Cart parse error', e);
          localStorage.removeItem('nexpos-cart');
        }
      }

      // Tandai inisialisasi selesai agar UI tidak berkedip
      setIsInitialized(true);
    }, 0);

    // Cleanup timer untuk mencegah memory leak jika komponen di-unmount cepat
    return () => clearTimeout(timer);
  }, []);

  // Sync Cart ke LocalStorage (Tetap sama)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('nexpos-cart', JSON.stringify(cart));
    }
  }, [cart, isInitialized]);

  // --- GSAP ANIMATION (Entry) ---
  useGSAP(
    () => {
      // Animasi Stagger halus saat produk dimuat
      gsap.fromTo(
        '.product-card',
        { y: 30, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.5,
          stagger: 0.04,
          ease: 'back.out(1.2)',
          clearProps: 'all',
        }
      );
    },
    { scope: containerRef, dependencies: [initialProducts, searchQuery] }
  );

  // --- ACTIONS ---

  // 1. Add to Cart (Optimized)
  const addToCart = useCallback((product: Products) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      // Animasi feedback visual (Micro interaction)
      const cardId = `#card-${product.id}`;
      gsap.to(cardId, { scale: 0.95, yoyo: true, repeat: 1, duration: 0.1 });

      if (existing) {
        if (existing.quantity + 1 > product.stock) {
          toast.error('Stok Maksimal Tercapai');
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      toast.success(`${product.name} ditambahkan`);
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  // 2. Update Qty
  const updateQuantity = useCallback((id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock) {
              toast.error(`Stok hanya tersedia ${item.stock}`);
              return item;
            }
            return { ...item, quantity: Math.max(0, newQty) };
          }
          return item;
        })
        .filter((i) => i.quantity > 0)
    );
  }, []);

  // 3. Print Action
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Struk-${new Date().getTime()}`,
  });

  // Filter Logic
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return initialProducts.filter(
      (p) =>
        p.isActive &&
        (p.name.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query))
    );
  }, [initialProducts, searchQuery]);

  // --- ACTIONS (LANJUTAN) ---

  // 4. Handle Checkout (Logic Inti)
  const handleCheckout = async () => {
    // A. Validasi Dasar
    if (
      customerForm.orderType === 'dine_in' &&
      !customerForm.tableNumber.trim()
    ) {
      toast.error('Nomor Meja Wajib Diisi untuk Dine In!');
      return;
    }

    let finalPayments: PaymentItem[] = [];
    const amountToPay =
      customerForm.paymentMethod === 'cash' ? Number(cashGiven) : finalTotal;

    // B. Logic Split Bill vs Single Payment
    if (isSplitMode) {
      if (remainingSplit > 100) {
        toast.error(`Pembayaran kurang ${formatRupiah(remainingSplit)}`);
        return;
      }
      if (splitPayments.length === 0) {
        toast.error('Belum ada pembayaran split dimasukkan');
        return;
      }
      finalPayments = splitPayments;
    } else {
      // Single Payment Logic
      if (customerForm.paymentMethod === 'cash' && amountToPay < finalTotal) {
        toast.error('Uang tunai kurang!', {
          description: `Kurang ${formatRupiah(finalTotal - amountToPay)}`,
        });
        return;
      }

      // Validasi Debit
      let refId = '';
      if (customerForm.paymentMethod === 'debit') {
        if (
          !debitForm.bankName ||
          debitForm.lastFourDigits.length < 4 ||
          !debitForm.approvalCode
        ) {
          toast.error(
            'Lengkapi data kartu debit (Bank, 4 Digit, Approval Code)'
          );
          return;
        }
        refId = `${debitForm.bankName.toUpperCase()}|${
          debitForm.lastFourDigits
        }|${debitForm.approvalCode}`;
      }

      finalPayments = [
        {
          method: customerForm.paymentMethod,
          amount: amountToPay,
          referenceId: refId,
        },
      ];
    }

    // C. Server Action
    startTransition(async () => {
      const res = await processCheckout(
        cart.map((i) => ({ id: i.id, quantity: i.quantity, price: i.price })),
        {
          ...customerForm,
          // 🔥 BARU: Kirim Data Member & Diskon ke Backend
          memberId: selectedMember?.id ?? null,
          discountId: activeDiscount?.id ?? null,

          payments: finalPayments,

          // 🔥 BARU: Kirim Rincian Angka Lengkap
          summary: {
            subtotal: subtotal,
            discountAmount: discountAmount, // Penting untuk laporan
            taxAmount: taxAmount,
            totalAmount: finalTotal,
          },
        }
      );

      if (res.success && res.data) {
        // Update data untuk ditampilkan di Struk/Success Dialog
        setSuccessData({
          order: res.data,
          items: [...cart],
          cashReceived: isSplitMode ? totalPaidSplit : Number(cashGiven),
          change: isSplitMode ? 0 : Number(cashGiven) - finalTotal,
          payments: finalPayments,
          // 🔥 BARU: Kirim info ini agar struk bisa print nama member & diskon
          member: selectedMember,
          discountAmount: discountAmount,
        });

        // Reset Semua State
        setCart([]);
        setCashGiven('');
        setIsSplitMode(false);
        setSplitPayments([]);

        // 🔥 BARU: Reset Member & Voucher
        setSelectedMember(null);
        setActiveDiscount(null);
        setVoucherCode('');

        setIsCheckoutOpen(false);
        setIsCartSheetOpen(false);
        setCustomerForm({
          tableNumber: '',
          customerName: '',
          customerPhone: '',
          orderType: 'dine_in',
          paymentMethod: 'cash',
        });
        toast.success('Transaksi Berhasil Disimpan!');
      } else {
        toast.error(res.message || 'Gagal memproses transaksi');
      }
    });
  };

  // 5. WhatsApp Generator
  const handleSendWhatsApp = () => {
    if (!successData?.order) return;
    const { order, items, payments } = successData;

    // --- 1. HEADER ---
    let text = `*STRUK PEMBAYARAN*\n`;
    text += `*${storeSettings?.name || 'NEXPOS'}*\n`;
    text += `--------------------------------\n`;
    text += `🆔 Order ID  : #${order.id}\n`;
    // Gunakan tanggal dari order (createdAt) biar akurat
    text += `📅 Tanggal   : ${new Date(
      order.createdAt || new Date()
    ).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}\n`;
    text += `👤 Pelanggan : ${order.customerName || 'Guest'}\n`;
    if (order.tableNumber) text += `🪑 Meja      : ${order.tableNumber}\n`;
    text += `--------------------------------\n\n`;

    // --- 2. LIST ITEMS ---
    items.forEach((item) => {
      // Potong nama barang jika terlalu panjang (opsional, misal max 25 char)
      const cleanName =
        item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name;

      text += `*${cleanName}*\n`;
      text += `   ${item.quantity} x ${formatRupiah(
        item.price
      )} = ${formatRupiah(item.price * item.quantity)}\n`;
    });

    text += `\n--------------------------------\n`;

    // --- 3. SUMMARY (SUBTOTAL, TAX, TOTAL) ---
    // Tampilkan subtotal jika ada (dari update backend tadi)
    if (order.subtotal && order.subtotal > 0) {
      text += `Subtotal    : ${formatRupiah(order.subtotal)}\n`;
    }

    // Tampilkan pajak jika ada
    if (order.taxAmount && order.taxAmount > 0) {
      text += `Pajak       : ${formatRupiah(order.taxAmount)}\n`;
    }

    // Total Akhir (Tebal)
    text += `*TOTAL       : ${formatRupiah(order.totalAmount)}*\n`;
    text += `--------------------------------\n`;

    // --- 4. DETAIL PEMBAYARAN ---
    if (order.paymentMethod === 'split' && payments) {
      text += `💳 *SPLIT PAYMENT:*\n`;
      payments.forEach(
        (p) =>
          (text += `   • ${p.method.toUpperCase()} : ${formatRupiah(
            p.amount
          )}\n`)
      );
    } else {
      // Single Payment
      text += `Metode      : ${order.paymentMethod?.toUpperCase()}\n`;

      // Jika Cash, tampilkan Bayar & Kembali (Ambil dari DB: amountPaid & change)
      if (order.paymentMethod === 'cash') {
        text += `Tunai       : ${formatRupiah(order.amountPaid || 0)}\n`;
        text += `Kembali     : ${formatRupiah(order.change || 0)}\n`;
      }
    }

    // --- 5. FOOTER ---
    text += `\n_Terima kasih telah berbelanja!_ 🙏\n`;
    text += `_Simpan struk ini sebagai bukti sah._`;

    // --- 6. KIRIM ---
    const phone = order.customerPhone || customerForm.customerPhone;
    const target = phone ? phone.replace(/\D/g, '').replace(/^0/, '62') : '';

    const url = target
      ? `https://wa.me/${target}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  // --- RENDER HELPERS (UI COMPONENTS) ---

  const renderCartList = () => (
    <div className="flex flex-col gap-3 pb-4">
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40 gap-4">
          <ShoppingBag size={56} strokeWidth={0.5} />
          <p className="text-sm font-medium">Keranjang Kosong</p>
        </div>
      ) : (
        cart.map((item) => (
          <div
            key={item.id}
            className="group flex gap-3 bg-card p-3 rounded-xl border border-border/40 hover:border-primary/40 transition-colors items-center shadow-sm"
          >
            {/* Image Thumbnail Kecil (Optional) */}
            <div className="h-10 w-10 bg-muted rounded-md overflow-hidden relative shrink-0">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <PackageOpen className="m-auto h-4 w-4 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-foreground">
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {formatRupiah(item.price)} x {item.quantity}
              </p>
            </div>

            {/* Qty Controls */}
            <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5 border border-border/50">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 rounded-md hover:bg-background hover:text-destructive"
                onClick={() => updateQuantity(item.id, -1)}
              >
                <Minus size={10} strokeWidth={3} />
              </Button>
              <span className="w-6 text-center text-xs font-bold tabular-nums">
                {item.quantity}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 rounded-md hover:bg-background hover:text-primary"
                onClick={() => updateQuantity(item.id, 1)}
              >
                <Plus size={10} strokeWidth={3} />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // --- RENDER HELPERS ---

  const renderCheckoutSummary = () => (
    <div className="space-y-4">
      <div className="space-y-1.5 pt-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono">{formatRupiah(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>
            {taxName} ({taxRate}%)
          </span>
          <span className="font-mono">{formatRupiah(taxAmount)}</span>
        </div>
        <div className="h-px bg-border/50 my-2" />
        <div className="flex justify-between text-base font-bold text-foreground">
          <span>Total Tagihan</span>
          <span className="text-primary font-mono text-lg">
            {formatRupiah(finalTotal)}
          </span>
        </div>
      </div>
      <Button
        className="w-full font-bold h-12 text-base shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-[0.98]"
        disabled={cart.length === 0}
        onClick={() => setIsCheckoutOpen(true)}
      >
        Bayar Sekarang <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  if (!isInitialized)
    return (
      <div className="h-dvh flex items-center justify-center text-primary">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );

  // --- MAIN RENDER ---
  return (
    <div
      ref={containerRef}
      className="flex flex-col h-dvh bg-muted/10 text-foreground overflow-hidden font-sans"
    >
      {/* 1. HEADER (Fixed Height) */}
      <header className="h-16 px-4 border-b border-border/40 flex items-center gap-4 shrink-0 bg-background/80 backdrop-blur-md z-20 sticky top-0">
        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            className="pl-9 h-10 bg-muted/40 border-transparent focus:bg-background focus:border-primary/50 transition-all rounded-full"
            placeholder="Cari menu, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* Mobile Search Trigger (Bisa dikembangkan nanti) */}
        <div className="sm:hidden flex-1">
          <span className="font-bold text-lg tracking-tight">NexPOS</span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <Badge
            variant="outline"
            className="hidden sm:flex border-green-500/30 text-green-600 bg-green-500/5 gap-1.5 py-1"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Online
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 bg-muted/50"
          >
            <User size={18} />
          </Button>
        </div>
      </header>

      {/* 2. CONTENT AREA (Split Layout) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT: PRODUCT GRID */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 lg:p-5 pb-32 lg:pb-5">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground opacity-60">
              <PackageOpen size={64} strokeWidth={1} />
              <p className="mt-4 font-medium">Produk tidak ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  id={`card-${product.id}`} // Untuk target animasi GSAP
                  onClick={() => product.stock > 0 && addToCart(product)}
                  className={cn(
                    'product-card group relative flex flex-col bg-card rounded-xl overflow-hidden border border-border/50 hover:border-primary/50 cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-[0.97]',
                    product.stock === 0 &&
                      'opacity-60 grayscale cursor-not-allowed pointer-events-none'
                  )}
                >
                  {/* Image Aspect Ratio Lock 4:3 */}
                  <div className="aspect-4/3 relative bg-muted w-full overflow-hidden">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, 20vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground/30">
                        <PackageOpen size={24} />
                      </div>
                    )}

                    {/* Stock Badge Overlay */}
                    {product.stock > 0 && product.stock <= 5 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 animate-pulse">
                        Sisa {product.stock}
                      </span>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                        <span className="text-white font-bold text-xs tracking-widest border border-white px-2 py-1">
                          HABIS
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5em] text-foreground/90">
                      {product.name}
                    </h3>

                    <div className="mt-auto flex items-end justify-between pt-3">
                      <span className="text-primary font-bold text-sm">
                        {formatRupiah(product.price)}
                      </span>
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Plus size={14} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: SIDEBAR (Desktop Only) */}
        <div className="hidden lg:flex w-95 border-l border-border/40 bg-card/50 flex-col shrink-0 h-full backdrop-blur-sm shadow-xl z-10">
          <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card/80">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                <ShoppingCart size={16} />
              </div>
              Current Order
            </div>
            <Badge variant="secondary" className="font-mono">
              {cart.length} Item
            </Badge>
          </div>

          <div className="flex-1 overflow-hidden relative bg-card">
            <ScrollArea className="h-full w-full">
              <div className="p-4 pb-20">
                {' '}
                {/* Tambah padding bawah agar item terakhir tidak ketutup bayangan */}
                {renderCartList()}
              </div>
            </ScrollArea>
          </div>

          <div className="p-4 border-t border-border bg-muted/20 shrink-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
            {renderCheckoutSummary()}
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING BAR (Sticky Bottom) */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
        <div className="bg-card/90 backdrop-blur-xl border border-primary/20 rounded-2xl p-3 shadow-2xl flex items-center justify-between">
          <div className="flex flex-col pl-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {cart.length} Item di Keranjang
            </span>
            <span className="text-lg font-extrabold text-primary leading-none">
              {formatRupiah(finalTotal)}
            </span>
          </div>
          <Button
            onClick={() => setIsCartSheetOpen(true)}
            className="font-bold rounded-xl shadow-lg shadow-primary/20"
          >
            Lihat Menu <ShoppingCart className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 3. MOBILE CART SHEET */}
      <Sheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col p-0 gap-0 border-l border-border/50"
        >
          <SheetHeader className="p-4 border-b border-border/40 bg-muted/5">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart size={18} /> Keranjang Pesanan
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {renderCartList()}
          </div>
          <div className="p-4 bg-muted/10 border-t border-border/40">
            {renderCheckoutSummary()}
          </div>
        </SheetContent>
      </Sheet>

      {/* DIALOG CHECKOUT (RE-DESIGNED: 2 Columns & Responsive) */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl h-[90vh] md:h-auto md:max-h-[90vh] p-0 bg-card border-border overflow-hidden flex flex-col md:flex-row gap-0">
          {/* KOLOM KIRI: DETAIL ITEM (Hanya muncul di Desktop / Tablet) */}
          <div className="hidden md:flex w-[40%] flex-col bg-muted/30 border-r border-border h-full">
            <div className="p-4 border-b border-border bg-muted/50">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <ShoppingCart className="h-4 w-4" /> Rincian Pesanan
              </h3>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1 border-b border-dashed border-border pb-2 last:border-0"
                  >
                    <div className="flex justify-between items-start gap-2 text-sm">
                      <span className="font-medium line-clamp-2 leading-snug">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-mono font-bold shrink-0">
                        {formatRupiah(item.price * item.quantity)}
                      </span>
                    </div>
                    {item.quantity > 1 && (
                      <span className="text-[10px] text-muted-foreground ml-4">
                        (@ {formatRupiah(item.price)})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-background/50 space-y-1">
              {/* 1. Subtotal */}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>

              {/* 2. Diskon (Hanya muncul jika ada) */}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 font-medium">
                  <span>Diskon ({activeDiscount?.code})</span>
                  <span>- {formatRupiah(discountAmount)}</span>
                </div>
              )}

              {/* 3. Pajak (CUKUP SATU KALI SAJA DI SINI) */}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Pajak ({taxRate}%)</span>
                <span>{formatRupiah(taxAmount)}</span>
              </div>

              {/* Separator */}
              <div className="h-px bg-border my-2" />

              {/* 4. Grand Total */}
              <div className="flex justify-between font-bold text-base">
                <span>Total Tagihan</span>
                <span className="text-primary">{formatRupiah(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: FORM PEMBAYARAN */}
          <div className="flex-1 flex flex-col h-[80vh] md:h-150 bg-card overflow-hidden">
            <DialogHeader className="p-4 border-b border-border shrink-0">
              <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
              <DialogDescription className="hidden md:block">
                Lengkapi data pelanggan dan metode pembayaran.
              </DialogDescription>
              {/* Tampilkan Total di Header Mobile saja */}
              <div className="md:hidden mt-2 p-2 bg-primary/10 rounded border border-primary/20 flex justify-between items-center font-bold">
                <span className="text-sm">Total</span>
                <span className="text-primary text-lg">
                  {formatRupiah(finalTotal)}
                </span>
              </div>
            </DialogHeader>

            {/* AREA FORM (SCROLLABLE) */}
            <div className="flex-1 overflow-hidden relative">
              <ScrollArea className="h-full w-full">
                <div className="p-4 grid gap-4">
                  {/* Tipe Pesanan */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() =>
                        setCustomerForm((p) => ({ ...p, orderType: 'dine_in' }))
                      }
                      className={cn(
                        'border rounded-lg p-3 flex flex-col items-center cursor-pointer transition-all hover:bg-muted/50',
                        customerForm.orderType === 'dine_in'
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'border-border'
                      )}
                    >
                      <Utensils className="mb-2 h-5 w-5" />
                      <span className="font-bold text-xs uppercase">
                        Makan di Tempat
                      </span>
                    </div>
                    <div
                      onClick={() =>
                        setCustomerForm((p) => ({
                          ...p,
                          orderType: 'take_away',
                        }))
                      }
                      className={cn(
                        'border rounded-lg p-3 flex flex-col items-center cursor-pointer transition-all hover:bg-muted/50',
                        customerForm.orderType === 'take_away'
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'border-border'
                      )}
                    >
                      <ShoppingBag className="mb-2 h-5 w-5" />
                      <span className="font-bold text-xs uppercase">
                        Bawa Pulang
                      </span>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="space-y-3">
                    {customerForm.orderType === 'dine_in' && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Nomor Meja
                        </label>
                        <Input
                          placeholder="Contoh: 12"
                          value={customerForm.tableNumber}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              tableNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Nama Pelanggan
                        </label>
                        <Input
                          placeholder="Nama (Opsional)"
                          value={customerForm.customerName}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              customerName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          WhatsApp (Opsional)
                        </label>
                        <Input
                          placeholder="0812..."
                          type="tel"
                          value={customerForm.customerPhone}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              customerPhone: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* [START] INSERT: INTEGRASI MEMBER & VOUCHER DI CHECKOUT */}
                  {/* ========================================================= */}
                  <div className="bg-muted/30 p-3 rounded-lg border border-dashed space-y-3">
                    {/* A. Selector Member */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Member / Pelanggan
                      </label>
                      <MemberSelector
                        selectedMember={selectedMember}
                        onSelect={(member) => {
                          setSelectedMember(member);
                          // OTOMATIS: Isi form nama & hp jika member dipilih
                          setCustomerForm((prev) => ({
                            ...prev,
                            customerName: member.name,
                            customerPhone: member.phone,
                          }));
                        }}
                      />
                    </div>

                    {/* B. Input Voucher */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Kode Promo
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <TicketPercent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Kode..."
                            className="pl-9 h-9 bg-background"
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value)}
                            disabled={!!activeDiscount}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant={activeDiscount ? 'destructive' : 'secondary'}
                          onClick={
                            activeDiscount
                              ? () => setActiveDiscount(null)
                              : handleApplyVoucher
                          }
                          disabled={isCheckingVoucher}
                        >
                          {isCheckingVoucher ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : activeDiscount ? (
                            <X className="h-3 w-3" />
                          ) : (
                            'Pakai'
                          )}
                        </Button>
                      </div>

                      {/* Info Voucher Aktif */}
                      <AnimatePresence>
                        {activeDiscount && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 p-2 rounded flex justify-between items-center">
                              <span className="font-bold flex items-center gap-1">
                                <TicketPercent className="h-3 w-3" />{' '}
                                {activeDiscount.code}
                              </span>
                              <span>
                                Hemat{' '}
                                {new Intl.NumberFormat('id-ID', {
                                  style: 'currency',
                                  currency: 'IDR',
                                  maximumFractionDigits: 0,
                                }).format(discountAmount)}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  {/* ========================================================= */}
                  {/* [END] INSERT */}
                  {/* ========================================================= */}

                  <div className="h-px bg-border/50" />

                  {/* Metode Pembayaran */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold">
                        Metode Pembayaran
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">
                          Split Bill?
                        </span>
                        <div
                          className={cn(
                            'w-8 h-4 rounded-full relative cursor-pointer transition-colors',
                            isSplitMode ? 'bg-primary' : 'bg-muted'
                          )}
                          onClick={() => {
                            setIsSplitMode(!isSplitMode);
                            if (!isSplitMode && splitPayments.length === 0) {
                              setSplitPayments([
                                {
                                  method: 'cash',
                                  amount: subtotal,
                                  referenceId: '',
                                },
                              ]);
                            }
                          }}
                        >
                          <div
                            className={cn(
                              'absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm',
                              isSplitMode ? 'left-4.5' : 'left-0.5'
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'cash', label: 'Tunai', icon: Banknote },
                        { id: 'qris', label: 'QRIS', icon: CheckCircle2 },
                        {
                          id: 'debit',
                          label: 'Debit/Kredit',
                          icon: CreditCard,
                        },
                      ].map((method) => (
                        <div
                          key={method.id}
                          onClick={() => {
                            // FIX: Casting ke tipe spesifik dari Interface, bukan any
                            if (!isSplitMode)
                              setCustomerForm((p) => ({
                                ...p,
                                paymentMethod:
                                  method.id as CustomerFormState['paymentMethod'],
                              }));
                          }}
                          className={cn(
                            'flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all',
                            !isSplitMode &&
                              customerForm.paymentMethod === method.id
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                              : 'border-border hover:bg-muted',
                            isSplitMode && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <method.icon size={18} className="mb-1" />
                          <span className="text-[10px] font-bold">
                            {method.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LOGIC INPUT UANG / SPLIT (Sama seperti sebelumnya, tapi layout dirapikan) */}
                  {isSplitMode ? (
                    <div className="p-3 bg-muted/30 rounded-lg border border-dashed space-y-3">
                      {/* ... (Kode Split Bill Sama, singkatnya render list) ... */}
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span>Rincian Split</span>
                        <span
                          className={
                            remainingSplit > 0
                              ? 'text-destructive'
                              : 'text-green-600'
                          }
                        >
                          Sisa: {formatRupiah(remainingSplit)}
                        </span>
                      </div>
                      {splitPayments.map((payment, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select
                            value={payment.method}
                            onChange={(e) => {
                              const newSplits = [...splitPayments];
                              // FIX: Casting ke tipe PaymentItem['method']
                              newSplits[idx].method = e.target
                                .value as PaymentItem['method'];
                              setSplitPayments(newSplits);
                            }}
                            className="h-9 bg-background text-xs rounded border px-1 w-20"
                          >
                            <option value="cash">Tunai</option>
                            <option value="debit">Debit</option>
                            <option value="qris">QRIS</option>
                          </select>
                          <Input
                            type="number"
                            value={payment.amount || ''}
                            onChange={(e) => {
                              const newSplits = [...splitPayments];
                              newSplits[idx].amount = Number(e.target.value);
                              setSplitPayments(newSplits);
                            }}
                            className="h-9 flex-1 text-xs"
                            placeholder="Jumlah"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() =>
                              setSplitPayments(
                                splitPayments.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                      {remainingSplit > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-8 border-dashed"
                          onClick={() =>
                            setSplitPayments([
                              ...splitPayments,
                              {
                                method: 'cash',
                                amount: remainingSplit,
                                referenceId: '',
                              },
                            ])
                          }
                        >
                          <Plus size={12} className="mr-1" /> Tambah Split
                        </Button>
                      )}
                    </div>
                  ) : (
                    customerForm.paymentMethod === 'cash' && (
                      <div className="space-y-2 pt-2">
                        <label className="text-sm font-medium">
                          Uang Diterima
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                            Rp
                          </span>
                          <Input
                            type="number"
                            placeholder="0"
                            className={cn(
                              'pl-10 text-xl font-bold h-12 transition-all',
                              (cashGiven || 0) > 0 &&
                                (cashGiven || 0) < finalTotal
                                ? 'border-destructive focus-visible:ring-destructive'
                                : ''
                            )}
                            value={cashGiven === 0 ? '' : cashGiven}
                            onChange={(e) =>
                              setCashGiven(
                                e.target.value === ''
                                  ? 0
                                  : parseFloat(e.target.value)
                              )
                            }
                            autoFocus
                          />
                        </div>
                        {/* Quick Amounts */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {[50000, 100000, finalTotal].map((amt) => (
                            <Button
                              key={amt}
                              variant="outline"
                              size="sm"
                              className="rounded-full text-xs shrink-0"
                              onClick={() => setCashGiven(Math.ceil(amt))}
                            >
                              {amt === finalTotal
                                ? 'Uang Pas'
                                : formatRupiah(amt)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {/* Form Debit (Jika dipilih) */}
                  {!isSplitMode && customerForm.paymentMethod === 'debit' && (
                    <div className="bg-blue-50/5 p-3 rounded border border-blue-500/20 space-y-2">
                      <Input
                        placeholder="Nama Bank"
                        className="h-8 text-xs"
                        value={debitForm.bankName}
                        onChange={(e) =>
                          setDebitForm({
                            ...debitForm,
                            bankName: e.target.value,
                          })
                        }
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="4 Digit Akhir"
                          maxLength={4}
                          className="h-8 text-xs"
                          value={debitForm.lastFourDigits}
                          onChange={(e) =>
                            setDebitForm({
                              ...debitForm,
                              lastFourDigits: e.target.value,
                            })
                          }
                        />
                        <Input
                          placeholder="Approval Code"
                          className="h-8 text-xs"
                          value={debitForm.approvalCode}
                          onChange={(e) =>
                            setDebitForm({
                              ...debitForm,
                              approvalCode: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* FOOTER (STICKY) */}
            <div className="p-4 border-t border-border bg-card shrink-0 z-10 shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
              {/* Info Kembalian Realtime */}
              {!isSplitMode && customerForm.paymentMethod === 'cash' && (
                <div className="flex justify-between items-center mb-3 text-sm">
                  <span className="text-muted-foreground">Kembali</span>
                  <span
                    className={cn(
                      'font-bold text-lg',
                      // FIX: Pastikan cashGiven diubah jadi 0 jika string kosong
                      (cashGiven === '' ? 0 : cashGiven) - finalTotal >= 0
                        ? 'text-green-500'
                        : 'text-destructive'
                    )}
                  >
                    {/* FIX: Gunakan logika yang sama untuk formatRupiah */}
                    {formatRupiah(
                      Math.max(
                        0,
                        (cashGiven === '' ? 0 : cashGiven) - finalTotal
                      )
                    )}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setIsCheckoutOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  className="flex-2 h-12 font-bold text-base shadow-lg shadow-primary/20"
                  disabled={
                    isPending ||
                    // FIX: Pastikan cashGiven diubah jadi 0 jika string kosong saat perbandingan
                    (!isSplitMode &&
                      customerForm.paymentMethod === 'cash' &&
                      (cashGiven === '' ? 0 : cashGiven) < finalTotal) ||
                    (isSplitMode && remainingSplit > 0)
                  }
                  onClick={handleCheckout}
                >
                  {isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    `Bayar ${formatRupiah(finalTotal)}`
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. SUCCESS / RECEIPT DIALOG */}
      <Dialog
        open={!!successData}
        onOpenChange={(open) => !open && setSuccessData(null)}
      >
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="mb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl text-center">
              Pembayaran Berhasil!
            </DialogTitle>
            <DialogDescription className="text-center">
              Transaksi telah tersimpan di sistem.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/30 p-4 rounded-xl space-y-3 mb-4 border border-border/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Tagihan</span>
              <span className="font-bold">
                {successData?.order
                  ? formatRupiah(successData.order.totalAmount)
                  : 0}
              </span>
            </div>
            {(successData?.change || 0) > 0 && (
              <div className="flex justify-between text-lg font-bold text-green-600 border-t border-dashed border-border pt-2 mt-2">
                <span>Kembalian</span>
                <span>{formatRupiah(successData?.change || 0)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 border-primary/30 hover:bg-primary/5 text-primary"
              onClick={handlePrint}
            >
              <Printer className="mr-2 w-4 h-4" /> Cetak Struk
            </Button>
            <Button
              variant="outline"
              className="h-12 border-green-500/30 hover:bg-green-50 text-green-600"
              onClick={handleSendWhatsApp}
            >
              <MessageCircle className="mr-2 w-4 h-4" /> Kirim WA
            </Button>
            <Button
              className="col-span-2 h-12 font-bold"
              onClick={() => setSuccessData(null)}
            >
              Transaksi Baru
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. HIDDEN PRINT COMPONENT */}
      <div className="hidden">
        {successData && storeSettings && (
          <ReceiptTemplate
            ref={receiptRef}
            orderId={successData.order.id}
            date={successData.order.createdAt || new Date()}
            storeName={storeSettings?.name || 'NexPOS'}
            storeAddress={storeSettings?.address || 'Alamat Toko'}
            storePhone={storeSettings?.phone || ''}
            receiptFooter={storeSettings?.receiptFooter || undefined}
            subtotal={successData.order.subtotal || 0}
            taxAmount={successData.order.taxAmount || 0}
            discountAmount={successData.order.discountAmount || 0}
            totalAmount={successData.order.totalAmount || 0}
            cashierName="Admin"
            customerName={successData.order.customerName || 'Pelanggan Umum'}
            tableNumber={successData.order.tableNumber || undefined}
            orderType={successData.order.orderType}
            items={successData.items.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            }))}
            paymentMethod={successData.order.paymentMethod}
            amountPaid={successData.order.amountPaid || 0}
            changeAmount={successData.order.change || 0}
            payments={successData.payments || []}
          />
        )}
      </div>
    </div>
  );
}
