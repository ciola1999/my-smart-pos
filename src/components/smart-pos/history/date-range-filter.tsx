'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { parseAsIsoDate, useQueryState } from 'nuqs';

import { cn } from '@/lib/utils'; // Helper standard shadcn
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function DateRangeFilter({ className }: { className?: string }) {
  // 1. Nuqs Hooks (Magic happens here 🪄)
  // parseAsIsoDate otomatis handle string ISO (YYYY-MM-DD) di URL
  const [from, setFrom] = useQueryState('from', parseAsIsoDate);
  const [to, setTo] = useQueryState('to', parseAsIsoDate);

  // Mapping state nuqs ke format yang dimengerti React Day Picker
  const date: DateRange | undefined = React.useMemo(() => {
    return {
      from: from || undefined,
      to: to || undefined,
    };
  }, [from, to]);

  // Handle perubahan tanggal
  const setDate = (range: DateRange | undefined) => {
    if (!range) {
      setFrom(null);
      setTo(null);
      return;
    }
    // Update URL via Nuqs
    if (range.from) setFrom(range.from);
    if (range.to) setTo(range.to);
    // Jika user reset selection (klik ulang), hapus to
    if (!range.from && !range.to) {
      setFrom(null);
      setTo(null);
    }
  };

  // Helper untuk reset filter
  const resetFilter = (e: React.MouseEvent) => {
    e.stopPropagation(); // Supaya popover gak kebuka
    setFrom(null);
    setTo(null);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal relative group',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />

            {/* Logic Label */}
            {from ? (
              to ? (
                <>
                  {format(from, 'dd MMM', { locale: id })} -{' '}
                  {format(to, 'dd MMM yyyy', { locale: id })}
                </>
              ) : (
                format(from, 'dd MMM yyyy', { locale: id })
              )
            ) : (
              <span>Filter Tanggal</span>
            )}

            {/* Tombol Clear (Muncul jika ada filter) */}
            {(from || to) && (
              <div
                role="button"
                onClick={resetFilter}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3 text-zinc-500" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            locale={id}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
