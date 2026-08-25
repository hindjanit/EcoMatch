export function ProductCardSkeleton() {
  return (
    <div className="rounded-3xl border border-emerald-500/15 bg-[#061e16]/60 p-4 shadow-xl backdrop-blur-md">
      <div className="shimmer-box aspect-video w-full rounded-2xl" />
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="shimmer-box h-4 w-20 rounded-md" />
          <div className="shimmer-box h-4 w-12 rounded-md" />
        </div>
        <div className="shimmer-box h-6 w-3/4 rounded-md" />
        <div className="shimmer-box h-4 w-1/2 rounded-md" />
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
          <div className="shimmer-box h-6 w-24 rounded-md" />
          <div className="shimmer-box h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DealSkeleton() {
  return (
    <div className="rounded-3xl border border-emerald-500/15 bg-[#061e16]/60 p-6 space-y-4">
      <div className="flex justify-between">
        <div className="shimmer-box h-6 w-32 rounded-md" />
        <div className="shimmer-box h-6 w-20 rounded-full" />
      </div>
      <div className="shimmer-box h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        <div className="shimmer-box h-12 rounded-xl" />
        <div className="shimmer-box h-12 rounded-xl" />
        <div className="shimmer-box h-12 rounded-xl" />
      </div>
    </div>
  );
}
