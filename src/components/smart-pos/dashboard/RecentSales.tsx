// E:\Belajar Javascript\.vscode\Project-Freelance\nexlanding\frontend\src\features\smart-pos\_components\RecentSales.tsx

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge'; // ✅ Kita pakai Badge sekarang
import { ScrollArea } from '@/components/ui/scroll-area'; // ✅ Kita pakai ScrollArea
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { CreditCard, Banknote, QrCode, ShoppingBag } from 'lucide-react';
import { DashboardData } from '@/services/dashboard.service';

interface RecentSalesProps {
  data: DashboardData['recentOrders'];
}

export function RecentSales({ data }: RecentSalesProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
        <ShoppingBag className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Belum ada transaksi hari ini.</p>
      </div>
    );
  }

  // ✅ Bungkus list dengan ScrollArea setinggi 300-400px
  return (
    <ScrollArea className="h-[400px] w-full pr-4">
      <div className="space-y-4">
        {data.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border border-white/10">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${order.customerName}`}
                />
                <AvatarFallback className="bg-[#dfff4f] text-black font-bold">
                  {order.customerName
                    ? order.customerName.substring(0, 2).toUpperCase()
                    : 'GS'}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <p className="text-sm font-medium leading-none text-white">
                  {order.customerName || 'Guest Customer'}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {/* ✅ Gunakan Badge untuk status pembayaran */}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 border-white/20 text-gray-400 capitalize h-5"
                  >
                    {order.status === 'cash' && (
                      <Banknote size={10} className="mr-1" />
                    )}
                    {order.status === 'qris' && (
                      <QrCode size={10} className="mr-1" />
                    )}
                    {order.status === 'debit' && (
                      <CreditCard size={10} className="mr-1" />
                    )}
                    {order.status}
                  </Badge>
                  <span>{order.itemsCount} Items</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-bold text-white font-mono">
                +
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0,
                }).format(order.totalAmount)}
              </p>
              <p className="text-xs text-gray-500 group-hover:text-[#dfff4f] transition-colors">
                {formatDistanceToNow(new Date(order.createdAt), {
                  addSuffix: true,
                  locale: id,
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
