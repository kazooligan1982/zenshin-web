import { UserCircle } from "lucide-react";

export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6 animate-pulse">
      <div className="flex items-center gap-3 mb-8">
        <UserCircle className="w-7 h-7 text-zenshin-navy/20" />
        <div>
          <div className="h-7 w-36 bg-zenshin-navy/10 rounded-lg" />
          <div className="h-4 w-56 bg-zenshin-navy/6 rounded mt-2" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 bg-zenshin-navy/8 rounded-full" />
          <div className="h-4 w-56 bg-zenshin-navy/6 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 bg-zenshin-navy/8 rounded" />
          <div className="h-10 w-full bg-zenshin-navy/5 rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-zenshin-navy/8 rounded" />
          <div className="h-10 w-full bg-zenshin-navy/5 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
