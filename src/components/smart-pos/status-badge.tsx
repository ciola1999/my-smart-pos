// E:\Belajar Javascript\.vscode\Project-Freelance\nexlanding\frontend\src\features\smart-pos\_components\status-badge.tsx

'use client';

import { useEffect, useState } from 'react';
import { checkDatabaseConnection } from '@/actions/system';

export default function StatusBadge() {
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>(
    'loading'
  );
  const [latency, setLatency] = useState<number>(0);

  useEffect(() => {
    // Fungsi untuk cek koneksi
    const verifyConnection = async () => {
      const result = await checkDatabaseConnection();
      if (result.success) {
        setStatus('online');
        setLatency(result.latency);
      } else {
        setStatus('offline');
      }
    };

    verifyConnection();
  }, []);

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
      <div className="flex flex-col">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          Database Status
        </span>
        <div className="flex items-center gap-2 mt-1">
          {/* Indikator Dot */}
          <span className={`relative flex h-3 w-3`}>
            {status === 'online' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                status === 'loading'
                  ? 'bg-yellow-400'
                  : status === 'online'
                  ? 'bg-emerald-500'
                  : 'bg-red-500'
              }`}
            ></span>
          </span>

          {/* Teks Status */}
          <span className="text-sm font-semibold text-gray-700">
            {status === 'loading' && 'Checking...'}
            {status === 'online' && `Online (${latency}ms)`}
            {status === 'offline' && 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
