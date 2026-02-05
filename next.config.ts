import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Wajib untuk Tauri
  output: 'export', 
  
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'egzgoewvdgqukeschevz.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  reactCompiler: true,
};

export default nextConfig;