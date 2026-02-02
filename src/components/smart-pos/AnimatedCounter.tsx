//Untuk animasi di dashboard
// E:\Belajar Javascript\.vscode\Project-Freelance\nexlanding\frontend\src\features\smart-pos\_components\AnimatedCounter.tsx
'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface AnimatedCounterProps {
  value: number;
  prefix?: string; // misal "Rp "
  suffix?: string;
  isCurrency?: boolean;
}

export default function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  isCurrency = false,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;

    // Objek dummy untuk di-tween nilainya
    const obj = { val: 0 };

    gsap.to(obj, {
      val: value,
      duration: 1.5, // Durasi animasi
      ease: 'power2.out',
      onUpdate: () => {
        // Format saat animasi berjalan
        if (isCurrency) {
          el.innerText = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
          }).format(obj.val);
        } else {
          el.innerText = prefix + Math.round(obj.val).toString() + suffix;
        }
      },
    });
  }, [value]);

  // Render awal (akan ditimpa oleh GSAP)
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}0{suffix}
    </span>
  );
}
