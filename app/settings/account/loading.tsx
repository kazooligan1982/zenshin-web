import { Shield } from "lucide-react";

export default function AccountLoading() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6 animate-pulse">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-7 h-7 text-zenshin-navy/20" />
        <div>
          <div className="h-7 w-36 bg-zenshin-navy/10 rounded-lg" />
          <div className="h-4 w-56 bg-zenshin-navy/6 rounded mt-2" />
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6">
          <div className="h-5 w-24 bg-zenshin-navy/10 rounded mb-4" />
          <div className="h-16 bg-zenshin-navy/5 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6">
          <div className="h-5 w-32 bg-zenshin-navy/10 rounded mb-4" />
          <div className="space-y-3">
            <div className="h-10 w-full bg-zenshin-navy/5 rounded-lg" />
            <div className="h-10 w-full bg-zenshin-navy/5 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
