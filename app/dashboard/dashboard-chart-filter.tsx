"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DashboardChartFilterProps = {
  charts: { id: string; title: string }[];
  selectedChartId: string;
};

export function DashboardChartFilter({
  charts,
  selectedChartId,
}: DashboardChartFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("chartId");
    } else {
      params.set("chartId", value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <Select value={selectedChartId} onValueChange={handleChange}>
      <SelectTrigger className="w-[220px] border-zenshin-navy/15 text-zenshin-navy [&>span]:truncate">
        <SelectValue placeholder="全体" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全体</SelectItem>
        {charts.map((chart) => (
          <SelectItem key={chart.id} value={chart.id}>
            {chart.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
