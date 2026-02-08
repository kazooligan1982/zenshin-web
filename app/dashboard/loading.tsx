export default function DashboardLoading() {
  return (
    <div className="py-8 px-6 lg:px-10 min-h-screen animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-44 bg-zenshin-navy/10 rounded-lg" />
          <div className="h-4 w-52 bg-zenshin-navy/8 rounded mt-2" />
        </div>
        <div className="h-9 w-48 bg-zenshin-navy/8 rounded-lg" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-zenshin-navy/8 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-16 bg-zenshin-navy/8 rounded" />
              <div className="h-4 w-4 bg-zenshin-navy/8 rounded" />
            </div>
            <div className="h-9 w-16 bg-zenshin-navy/10 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5 mb-8">
        <div className="h-5 w-32 bg-zenshin-navy/8 rounded mb-4" />
        <div className="h-4 w-full bg-zenshin-navy/6 rounded-full" />
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-zenshin-navy/8 p-5"
          >
            <div className="h-5 w-36 bg-zenshin-navy/8 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-12 bg-zenshin-navy/4 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
