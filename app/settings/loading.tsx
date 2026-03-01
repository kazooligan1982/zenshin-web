import { Archive } from "lucide-react";

export default function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6 animate-pulse">
      <div className="flex items-center gap-3 mb-8">
        <Archive className="w-7 h-7 text-zenshin-navy/20" />
        <div className="h-7 w-56 bg-zenshin-navy/10 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-zenshin-navy/8 p-4 flex items-center gap-4">
            <div className="h-5 w-5 bg-zenshin-navy/8 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 bg-zenshin-navy/10 rounded" />
              <div className="h-4 w-32 bg-zenshin-navy/6 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
