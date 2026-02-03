import * as React from 'react';

// ✅ 1. Helper Format Rupiah (Lokal di file ini biar aman)
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ✅ 2. Interface (Sesuai dengan pos-interface.tsx)
interface ReceiptProps {
  storeName: string;
  storeAddress: string;
  storePhone?: string;
  receiptFooter?: string;

  // Data Keuangan (Terima angka matang/Number)
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;

  // Pembayaran
  amountPaid: number; 
  changeAmount: number; 
  paymentMethod: string;
  // 🔥 Ubah 'method' jadi 'paymentMethod' biar konsisten sama DB
  payments?: { paymentMethod: string; amount: number }[]; 

  // Metadata Transaksi
  date: Date | string;
  orderId: string | number;
  cashierName: string;
  customerName: string;
  tableNumber?: string; 
  orderType: string; 

  // Items
  items: {
    id: number;
    name: string;
    quantity: number;
    price: number;
  }[];
}

export const ReceiptTemplate = React.forwardRef<HTMLDivElement, ReceiptProps>(
  (props, ref) => {
    
    // Safety check untuk tanggal
    const dateObj = new Date(props.date);

    return (
      <div
        ref={ref}
        className="w-[80mm] mx-auto bg-white text-black font-mono text-[11px] leading-tight p-2 pb-4"
        style={{ color: 'black' }} // Paksa warna hitam untuk printer thermal
      >
        {/* --- HEADER --- */}
        <div className="flex flex-col items-center justify-center text-center mb-2">
          <h1 className="font-bold text-lg uppercase">{props.storeName}</h1>
          <p className="text-[10px] mt-1 text-gray-600">{props.storeAddress}</p>
          {props.storePhone && (
            <p className="text-[10px]">{props.storePhone}</p>
          )}
          <div className="border-b border-black w-full border-dashed my-2" />
        </div>

        {/* --- INFO TRANSAKSI --- */}
        <div className="flex flex-col gap-1 mb-3 text-[10px]">
          <div className="flex justify-between">
            <span>{dateObj.toLocaleDateString('id-ID')}</span>
            <span>
              {dateObj.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>No: #{props.orderId}</span>
            <span>Kasir: {props.cashierName}</span>
          </div>
          <div className="flex justify-between">
            <span>Pelanggan:</span>
            <span className="font-bold truncate max-w-30">
              {props.customerName}
            </span>
          </div>
          {props.tableNumber && (
            <div className="flex justify-between">
              <span>Meja:</span>
              <span className="font-bold">{props.tableNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tipe:</span>
            <span className="uppercase">
              {props.orderType === 'dine_in' ? 'Makan Ditempat' : 'Bungkus'}
            </span>
          </div>
        </div>
        <div className="border-b border-black border-dashed w-full mb-2" />

        {/* --- LIST ITEM --- */}
        <div className="flex flex-col gap-2 mb-2">
          {props.items.map((item, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="font-bold truncate">{item.name}</span>
              <div className="flex justify-between pl-2 text-gray-700">
                <span>
                  {item.quantity} x {formatRupiah(item.price).replace('Rp', '')}
                </span>
                <span className="font-medium text-black">
                    {formatRupiah(item.quantity * item.price)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-b border-black border-dashed w-full my-2" />

        {/* --- TOTAL & KEUANGAN --- */}
        <div className="flex flex-col gap-1 text-[12px]">
          {/* Subtotal */}
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>Subtotal</span>
            <span>{formatRupiah(props.subtotal)}</span>
          </div>

          {/* Diskon (Hanya tampil jika > 0) */}
          {props.discountAmount && props.discountAmount > 0 ? (
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>Diskon</span>
              <span>-{formatRupiah(props.discountAmount)}</span>
            </div>
          ) : null}

          {/* Pajak (Hanya tampil jika > 0) */}
          {props.taxAmount > 0 && (
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>Pajak (Tax)</span>
              <span>{formatRupiah(props.taxAmount)}</span>
            </div>
          )}

          {/* TOTAL FINAL */}
          <div className="flex justify-between font-bold text-sm mt-1 border-t border-black border-dashed pt-1">
            <span>TOTAL</span>
            <span>{formatRupiah(props.totalAmount)}</span>
          </div>

          {/* --- PEMBAYARAN --- */}
          {props.paymentMethod === 'split' &&
          props.payments &&
          props.payments.length > 0 ? (
            <div className="mt-1 flex flex-col gap-1 border-t border-dashed border-gray-400 pt-1">
              <span className="italic text-[10px]">Split Payment:</span>
              {props.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  {/* 🔥 Akses p.paymentMethod */}
                  <span className="uppercase">- {p.paymentMethod}</span>
                  <span>{formatRupiah(p.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between mt-1 text-[11px]">
              <span className="uppercase">Bayar ({props.paymentMethod})</span>
              <span>{formatRupiah(props.amountPaid)}</span>
            </div>
          )}

          {/* KEMBALIAN */}
          <div className="flex justify-between mt-1 pt-1 border-t border-dotted border-gray-400 font-bold">
            <span>KEMBALI</span>
            <span>{formatRupiah(props.changeAmount)}</span>
          </div>
        </div>

        <div className="border-b border-black border-dashed w-full my-4" />

        {/* --- FOOTER --- */}
        <div className="text-center text-[10px] space-y-1">
          <p className="whitespace-pre-wrap leading-snug">
            {props.receiptFooter || 'Terima Kasih atas Kunjungan Anda'}
          </p>
          <p className="mt-2 text-[9px] text-gray-400">
            Powered by Junior Freelance
          </p>
        </div>
      </div>
    );
  }
);

ReceiptTemplate.displayName = 'ReceiptTemplate';