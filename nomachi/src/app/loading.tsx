function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#E9E1D6] ${className}`} />;
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#1f1a17]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-[#e7e1d5]/70 bg-white/90 px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-28" />
                <SkeletonBlock className="h-3 w-40" />
              </div>
            </div>
            <div className="hidden gap-3 sm:flex">
              <SkeletonBlock className="h-10 w-24 rounded-full" />
              <SkeletonBlock className="h-10 w-28 rounded-full" />
            </div>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[32px] border border-[#e7e1d5]/70 bg-white p-5 shadow-sm">
              <SkeletonBlock className="h-72 w-full rounded-[24px] sm:h-96" />
              <div className="mt-5 space-y-3">
                <SkeletonBlock className="h-5 w-3/5" />
                <SkeletonBlock className="h-4 w-1/3" />
                <div className="flex gap-3 pt-3">
                  <SkeletonBlock className="h-10 w-28 rounded-full" />
                  <SkeletonBlock className="h-10 w-24 rounded-full" />
                  <SkeletonBlock className="h-10 w-24 rounded-full" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[24px] border border-[#e7e1d5]/70 bg-white p-4 shadow-sm">
                  <SkeletonBlock className="h-40 w-full rounded-[18px]" />
                  <div className="mt-4 space-y-2">
                    <SkeletonBlock className="h-4 w-4/5" />
                    <SkeletonBlock className="h-3 w-2/3" />
                    <div className="flex items-center justify-between pt-2">
                      <SkeletonBlock className="h-4 w-20" />
                      <SkeletonBlock className="h-4 w-14" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[28px] border border-[#e7e1d5]/70 bg-white p-5 shadow-sm">
              <SkeletonBlock className="h-4 w-24" />
              <div className="mt-4 space-y-3">
                <SkeletonBlock className="h-12 w-full rounded-xl" />
                <SkeletonBlock className="h-12 w-full rounded-xl" />
                <SkeletonBlock className="h-12 w-full rounded-xl" />
                <SkeletonBlock className="h-12 w-full rounded-xl" />
              </div>
            </div>

            <div className="rounded-[28px] border border-[#e7e1d5]/70 bg-white p-5 shadow-sm">
              <SkeletonBlock className="h-4 w-36" />
              <div className="mt-4 space-y-3">
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-5/6" />
                <SkeletonBlock className="h-3 w-2/3" />
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
