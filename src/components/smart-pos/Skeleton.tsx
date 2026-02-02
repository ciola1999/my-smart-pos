export default function SmartPosSkeleton() {
  return (
    <div className="min-h-screen bg-[#0f1014] text-white overflow-hidden flex flex-col">
      {/* 1. Navbar Skeleton (Biar layout tidak goyang) */}
      <div className="h-[80px] border-b border-white/5 px-6 flex items-center justify-between">
        {/* Logo Placeholder */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
            <div className="h-2 w-16 bg-white/5 rounded animate-pulse" />
          </div>
        </div>

        {/* Menu Placeholder */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 w-24 bg-white/5 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* 2. Content Skeleton */}
      <div className="p-8 max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-6 h-[calc(100vh-80px)]">
        {/* Kiri: Grid Produk (8 kolom) */}
        <div className="col-span-8">
          <div className="flex gap-4 mb-6 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 w-32 bg-white/10 rounded-full animate-pulse"
              />
            ))}
          </div>
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-2xl bg-white/5 border border-white/5 animate-pulse flex flex-col p-4 space-y-3"
              >
                <div className="flex-1 bg-white/5 rounded-xl" />
                <div className="h-4 w-3/4 bg-white/10 rounded" />
                <div className="h-4 w-1/2 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Kanan: Cart / Detail (4 kolom) */}
        <div className="col-span-4 h-full bg-white/5 rounded-2xl border border-white/5 p-6 animate-pulse flex flex-col gap-4">
          <div className="h-8 w-1/2 bg-white/10 rounded mb-4" />
          <div className="space-y-4 flex-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full bg-white/5 rounded-xl" />
            ))}
          </div>
          <div className="h-24 w-full bg-white/10 rounded-xl mt-auto" />
        </div>
      </div>
    </div>
  );
}
