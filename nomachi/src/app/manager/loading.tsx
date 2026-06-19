function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#E9E1D6] ${className}`} />;
}

export default function ManagerLoading() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#1f1a17]">
      <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid min-h-[calc(100vh-2.5rem)] gap-6 xl:grid-cols-[280px_1fr]">
          <aside className="hidden rounded-[28px] border border-[#e7e1d5]/70 bg-white p-5 shadow-sm xl:flex xl:flex-col">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="h-3 w-32" />
                </div>
              </div>
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-11 w-full rounded-2xl" />
                ))}
              </div>
            </div>
            <div className="mt-auto rounded-3xl border border-[#e7e1d5]/60 bg-[#FAF8F4] p-4">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="mt-3 h-16 w-full rounded-2xl" />
            </div>
          </aside>

          <main className="space-y-6">
            <div className="rounded-[28px] border border-[#e7e1d5]/70 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-2">
                  <SkeletonBlock className="h-3 w-20" />
                  <SkeletonBlock className="h-7 w-48" />
                </div>
                <div className="flex gap-3">
                  <SkeletonBlock className="h-10 w-24 rounded-full" />
                  <SkeletonBlock className="h-10 w-24 rounded-full" />
                  <SkeletonBlock className="h-10 w-32 rounded-full" />
                </div>
              </div>
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <article key={index} className="rounded-[24px] border border-[#e7e1d5]/70 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    <SkeletonBlock className="h-14 w-14 rounded-full" />
                    <div className="space-y-2">
                      <SkeletonBlock className="h-3 w-24" />
                      <SkeletonBlock className="h-8 w-16" />
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
              <div className="rounded-[28px] border border-[#e7e1d5]/70 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <SkeletonBlock className="h-4 w-40" />
                  <SkeletonBlock className="h-8 w-24 rounded-full" />
                </div>
                <div className="mt-5 space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4 rounded-2xl border border-[#eee7dc] p-4">
                      <SkeletonBlock className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <SkeletonBlock className="h-3 w-2/5" />
                        <SkeletonBlock className="h-3 w-3/5" />
                      </div>
                      <SkeletonBlock className="h-8 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-[#e7e1d5]/70 bg-white p-5 shadow-sm">
                  <SkeletonBlock className="h-4 w-32" />
                  <div className="mt-4 space-y-3">
                    <SkeletonBlock className="h-3 w-full" />
                    <SkeletonBlock className="h-3 w-11/12" />
                    <SkeletonBlock className="h-3 w-4/5" />
                    <SkeletonBlock className="h-20 w-full rounded-2xl" />
                  </div>
                </div>
                <div className="rounded-[28px] border border-[#e7e1d5]/70 bg-white p-5 shadow-sm">
                  <SkeletonBlock className="h-4 w-36" />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <SkeletonBlock className="h-16 rounded-2xl" />
                    <SkeletonBlock className="h-16 rounded-2xl" />
                    <SkeletonBlock className="h-16 rounded-2xl" />
                    <SkeletonBlock className="h-16 rounded-2xl" />
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
