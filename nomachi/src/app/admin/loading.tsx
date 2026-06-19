function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 ${className}`} />;
}

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#F7F8FB] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 xl:grid-cols-[280px_1fr]">
        <aside className="hidden xl:flex flex-col gap-6 border-r border-slate-200 bg-white px-6 py-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-3 w-32" />
              </div>
            </div>
            <div className="space-y-2 pt-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-11 w-full rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="mt-auto space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-20 w-full rounded-2xl" />
          </div>
        </aside>

        <main className="flex flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-8 w-56" />
              </div>
              <div className="flex gap-3">
                <SkeletonBlock className="h-10 w-24 rounded-full" />
                <SkeletonBlock className="h-10 w-28 rounded-full" />
              </div>
            </div>
          </div>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <article key={index} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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

          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-8 w-24 rounded-full" />
              </div>
              <div className="mt-5 space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4">
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
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SkeletonBlock className="h-4 w-32" />
                <div className="mt-4 space-y-3">
                  <SkeletonBlock className="h-3 w-full" />
                  <SkeletonBlock className="h-3 w-11/12" />
                  <SkeletonBlock className="h-3 w-4/5" />
                  <SkeletonBlock className="h-24 w-full rounded-2xl" />
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SkeletonBlock className="h-4 w-40" />
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
  );
}
