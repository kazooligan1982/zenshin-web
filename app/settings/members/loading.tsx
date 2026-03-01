import { Users } from "lucide-react";

export default function MembersLoading() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6 animate-pulse">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-7 h-7 text-zenshin-navy/20" />
        <div className="h-7 w-32 bg-zenshin-navy/10 rounded-lg" />
      </div>
      <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6 mb-6">
        <div className="h-5 w-36 bg-zenshin-navy/10 rounded mb-2" />
        <div className="h-4 w-64 bg-zenshin-navy/6 rounded mb-4" />
        <div className="h-10 w-36 bg-zenshin-navy/8 rounded-lg" />
      </div>
      <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6">
        <div className="h-5 w-40 bg-zenshin-navy/10 rounded mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-4 border-b border-zenshin-navy/5 last:border-0">
            <div className="h-10 w-10 bg-zenshin-navy/8 rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 bg-zenshin-navy/10 rounded" />
              <div className="h-3 w-48 bg-zenshin-navy/6 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
