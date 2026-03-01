export default function SnapshotsLoading() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="flex-1 p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
