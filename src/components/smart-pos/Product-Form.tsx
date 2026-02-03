// Project\smart-pos-v2\src\components\smart-pos\Product-Form.tsx

'use client';

import { useRef, useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  Save,
  Calculator,
  AlertCircle,
  X,
  Loader2,
  ImagePlus,
  ScanBarcode,
  Package,
} from 'lucide-react';
import { upsertProduct } from '@/actions/products'; // ✅ Update Import
import Image from 'next/image';
import { toast } from 'sonner';

// Tipe data untuk Edit Mode (Sesuai dengan return backend)
type ProductData = {
  id?: number;
  name?: string;
  sku?: string | null;
  barcode?: string | null;
  price?: string; // Decimal string dari DB
  costPrice?: string;
  stock?: number;
  minStock?: number;
  imageUrl?: string | null;
  description?: string | null;
  categoryId?: number | null;
  isActive?: boolean;
};

// --- SUB-COMPONENT: TOMBOL SUBMIT ---
function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2.5 rounded-lg bg-[#dfff4f] text-black text-sm font-bold hover:bg-[#ccee2e] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(223,255,79,0.3)]"
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          {isEdit ? 'Menyimpan...' : 'Membuat...'}
        </>
      ) : (
        <>
          <Save size={16} />
          {isEdit ? 'Simpan Perubahan' : 'Buat Produk'}
        </>
      )}
    </button>
  );
}

// --- COMPONENT UTAMA ---
export default function ProductForm({
  onClose,
  initialData, // ✅ Tambah prop ini untuk mode EDIT
}: {
  onClose: () => void;
  initialData?: ProductData | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!initialData?.id; // Cek mode edit atau create

  // REACT 19 Action State
  const [state, formAction] = useActionState(upsertProduct, {
    message: '',
    success: false,
  });

  // State Kalkulator & Preview
  const [cost, setCost] = useState<number>(Number(initialData?.costPrice) || 0);
  const [price, setPrice] = useState<number>(Number(initialData?.price) || 0);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.imageUrl || null
  );

  const profit = (price || 0) - (cost || 0);
  const marginRaw = price > 0 ? (profit / price) * 100 : 0;
  const margin = parseFloat(marginRaw.toFixed(2));

  // ✅ Pindahkan Side Effect ke useEffect (Best Practice)
  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      // Tutup modal sedikit lebih cepat agar terasa snappy
      const timer = setTimeout(() => {
        onClose();
      }, 500);
      return () => clearTimeout(timer);
    } else if (state.message && !state.errors) {
      // Jika error global (bukan validasi per field)
      toast.error(state.message);
    }
  }, [state, onClose]);

  // Animasi Masuk
  useGSAP(() => {
    gsap.fromTo(
      formRef.current,
      { y: 30, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' }
    );
  }, []);

  // Animasi Margin Bar
  useGSAP(() => {
    const color = margin < 15 ? '#ef4444' : margin < 30 ? '#eab308' : '#22c55e';
    gsap.to('#margin-indicator', { color: color, duration: 0.5 });
    gsap.to('#margin-bar', {
      width: `${Math.min(Math.max(margin, 0), 100)}%`,
      backgroundColor: color,
      duration: 0.5,
    });
  }, [margin]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB Limit
        toast.error('File terlalu besar! Maksimal 2MB.');
        e.target.value = '';
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  // Helper untuk menampilkan error validasi Zod di bawah input
  const getError = (field: string) => {
    return state.errors?.[field] ? (
      <span className="text-red-400 text-[10px] mt-1 flex items-center gap-1">
        <AlertCircle size={10} /> {state.errors[field][0]}
      </span>
    ) : null;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form
        ref={formRef}
        action={formAction}
        className="bg-[#121212] border border-white/10 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* --- HEADER --- */}
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#181818]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}
              {isEdit && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">
                  EDIT MODE
                </span>
              )}
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Manajemen inventori & penetapan harga cerdas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
          {/* Hidden Inputs untuk ID & URL Gambar Lama (Penting saat Edit) */}
          {isEdit && (
            <>
              <input type="hidden" name="id" value={initialData.id} />
              <input
                type="hidden"
                name="existingImageUrl"
                value={initialData.imageUrl || ''}
              />
            </>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* --- KOLOM KIRI: IMAGE & BASIC INFO (4 Columns) --- */}
            <div className="lg:col-span-4 space-y-6">
              {/* Image Upload */}
              <div className="flex flex-col items-center">
                <label
                  htmlFor="image-upload"
                  className="group relative w-full aspect-square max-w-[240px] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-[#dfff4f] hover:bg-white/5 transition-all overflow-hidden bg-black/20"
                >
                  {imagePreview ? (
                    <>
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                        <div className="bg-[#dfff4f] text-black p-2 rounded-full">
                          <ImagePlus size={24} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#dfff4f] group-hover:text-black transition-colors text-gray-400">
                        <ImagePlus size={24} />
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        Klik untuk upload
                      </span>
                    </div>
                  )}
                  <input
                    id="image-upload"
                    name="image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
                {getError('imageUrl')}
              </div>

              {/* Status Switch */}
              <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between border border-white/5">
                <span className="text-sm text-gray-300 font-medium">
                  Status Aktif
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={initialData?.isActive ?? true} // Default true
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#dfff4f] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#dfff4f]"></div>
                </label>
              </div>
            </div>

            {/* --- KOLOM TENGAH: DETAIL PRODUK (4 Columns) --- */}
            <div className="lg:col-span-4 space-y-5">
              <div>
                <Label>Nama Produk</Label>
                <input
                  name="name"
                  defaultValue={initialData?.name}
                  required
                  type="text"
                  placeholder="Contoh: Kopi Susu Aren"
                  className="smart-input w-full"
                />
                {getError('name')}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kategori (ID)</Label>
                  {/* TODO: Ganti Select jika ada data kategori */}
                  <input
                    name="categoryId"
                    type="number"
                    defaultValue={initialData?.categoryId || ''}
                    placeholder="1"
                    className="smart-input w-full"
                  />
                </div>
                <div>
                  <Label icon={<Package size={12} />}>Min. Stok</Label>
                  <input
                    name="minStock"
                    type="number"
                    defaultValue={initialData?.minStock ?? 5}
                    className="smart-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SKU</Label>
                  <input
                    name="sku"
                    defaultValue={initialData?.sku || ''}
                    type="text"
                    placeholder="AUTO"
                    className="smart-input w-full"
                  />
                  {getError('sku')}
                </div>
                <div>
                  <Label icon={<ScanBarcode size={12} />}>Barcode</Label>
                  <input
                    name="barcode"
                    defaultValue={initialData?.barcode || ''}
                    type="text"
                    placeholder="Scan..."
                    className="smart-input w-full"
                  />
                  {getError('barcode')}
                </div>
              </div>

              <div>
                <Label>Stok Saat Ini</Label>
                <input
                  name="stock"
                  defaultValue={initialData?.stock ?? 0}
                  type="number"
                  className="smart-input w-full bg-white/5"
                />
              </div>

              <div>
                <Label>Deskripsi</Label>
                <textarea
                  name="description"
                  defaultValue={initialData?.description || ''}
                  rows={3}
                  className="smart-input w-full resize-none"
                  placeholder="Keterangan singkat produk..."
                />
              </div>
            </div>

            {/* --- KOLOM KANAN: HARGA & MARGIN (4 Columns) --- */}
            <div className="lg:col-span-4 flex flex-col h-full">
              <div className="bg-[#1a1b20] border border-white/10 rounded-2xl p-5 flex-1 flex flex-col justify-between shadow-inner">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2 text-[#dfff4f]">
                    <Calculator size={18} />
                    <h3 className="font-bold text-sm uppercase tracking-wider">
                      Kalkulator Harga
                    </h3>
                  </div>

                  <div>
                    <Label>Harga Pokok (HPP)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        Rp
                      </span>
                      <input
                        name="costPrice"
                        type="number"
                        required
                        defaultValue={initialData?.costPrice}
                        min="0"
                        onChange={(e) => setCost(Number(e.target.value))}
                        className="smart-input w-full pl-10 text-yellow-400 font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Harga Jual</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        Rp
                      </span>
                      <input
                        name="price"
                        type="number"
                        required
                        defaultValue={initialData?.price}
                        min="0"
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="smart-input w-full pl-10 text-[#dfff4f] font-mono text-lg font-bold"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* MARGIN VISUALIZATION */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 text-xs font-medium">
                      Margin Keuntungan
                    </span>
                    <span
                      id="margin-indicator"
                      className="text-2xl font-bold font-mono"
                    >
                      {margin}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mb-4 border border-white/5">
                    <div
                      id="margin-bar"
                      className="h-full w-0 rounded-full transition-all duration-500"
                    ></div>
                  </div>

                  <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="text-xs text-gray-500">
                      Profit per Unit
                    </span>
                    <span className="font-mono text-white font-bold text-sm">
                      Rp {profit.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="p-6 border-t border-white/5 bg-[#181818] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Batal
          </button>
          <SubmitButton isEdit={isEdit} />
        </div>
      </form>

      {/* Styles */}
      <style jsx>{`
        .smart-input {
          @apply bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#dfff4f]/50 focus:ring-1 focus:ring-[#dfff4f]/50 focus:outline-none transition-all placeholder:text-gray-600;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}

// Helper Component Kecil untuk Label
function Label({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 flex items-center gap-1.5 tracking-wider">
      {icon} {children}
    </label>
  );
}
