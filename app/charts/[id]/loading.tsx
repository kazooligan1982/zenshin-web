export default function ChartDetailLoading() {
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* エリアタブ */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <div className="h-7 w-16 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-7 w-20 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-7 w-20 bg-gray-200 rounded-full animate-pulse" />
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-hidden px-4 py-4 space-y-6">
        {/* Vision セクション */}
        <div className="space-y-2">
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-10 w-3/4 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>

        {/* Reality セクション */}
        <div className="space-y-2">
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-10 w-5/6 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>

        {/* Tension & Action セクション */}
        <div className="space-y-2">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="border rounded-lg p-3 space-y-2">
              <div className="h-5 w-2/3 bg-gray-100 rounded animate-pulse" />
              <div className="h-8 w-full bg-gray-50 rounded animate-pulse" />
              <div className="h-8 w-full bg-gray-50 rounded animate-pulse" />
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="h-5 w-1/2 bg-gray-100 rounded animate-pulse" />
              <div className="h-8 w-full bg-gray-50 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
