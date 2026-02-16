"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface Snapshot {
  id: string;
  created_at: string;
  snapshot_type: string;
  description?: string | null;
  versionNumber?: string;
}

interface SnapshotViewerProps {
  snapshot: Snapshot;
}

interface SnapshotDetail {
  id: string;
  chart_id: string;
  created_at: string;
  snapshot_type: string;
  description?: string | null;
  data: {
    visions?: any[];
    realities?: any[];
    tensions?: any[];
    tension_visions?: any[];
    tension_realities?: any[];
    actions?: any[];
  };
}

export function SnapshotViewer({ snapshot }: SnapshotViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [detailData, setDetailData] = useState<SnapshotDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    setDetailData(null);

    try {
      const { data, error } = await supabase
        .from("snapshots")
        .select("*")
        .eq("id", snapshot.id)
        .single();

      if (error) {
        console.error("[SnapshotViewer] Error fetching detail:", error);
        setError(error.message);
        return;
      }

      setDetailData(data as SnapshotDetail);
    } catch (err) {
      console.error("[SnapshotViewer] Error fetching detail:", err);
      setError(err instanceof Error ? err.message : "データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setDetailData(null);
    setError(null);
  };

  const getStats = () => {
    if (!detailData?.data) return null;

    const { visions, realities, tensions, actions } = detailData.data;
    return {
      visions: visions?.length || 0,
      realities: realities?.length || 0,
      tensions: tensions?.length || 0,
      actions: actions?.length || 0,
    };
  };

  const stats = getStats();

  return (
    <>
      <Button
        onClick={handleOpen}
        className="text-xs bg-black text-white px-3 py-1.5 rounded-full hover:bg-gray-800 transition-colors"
      >
        View Data
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {snapshot.versionNumber && (
                <span className="font-mono font-bold text-gray-900">
                  #{snapshot.versionNumber}
                </span>
              )}
              <span>Snapshot Details</span>
            </DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">データを読み込んでいます...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              <p className="text-sm font-medium">エラー</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}

          {detailData && !isLoading && !error && (
            <div className="space-y-4">
              {/* メタデータセクション */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">取得日時</p>
                  <p className="text-lg font-bold text-gray-800">
                    {format(new Date(snapshot.created_at), "yyyy/MM/dd HH:mm")}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">取得方法</p>
                  <Badge
                    variant="outline"
                    className={
                      snapshot.snapshot_type === "manual"
                        ? "bg-blue-100 text-blue-700 border-blue-300 uppercase tracking-wide"
                        : "bg-green-100 text-green-700 border-green-300 uppercase tracking-wide"
                    }
                  >
                    {snapshot.snapshot_type}
                  </Badge>
                </div>

                {/* 統計情報 */}
                {stats && (
                  <div className="col-span-1 md:col-span-2 space-y-1 mt-2">
                    <p className="text-xs text-gray-500 font-medium">チャート概要</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                        Visions: {stats.visions}
                      </Badge>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                        Realities: {stats.realities}
                      </Badge>
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                        Tensions: {stats.tensions}
                      </Badge>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        Actions: {stats.actions}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* メモ（Description） */}
                {snapshot.description && (
                  <div className="col-span-1 md:col-span-2 space-y-1 mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">メモ</p>
                    <p className="text-sm text-gray-700 italic bg-white p-2 rounded border border-gray-200">
                      {snapshot.description}
                    </p>
                  </div>
                )}
              </div>

              {/* JSONデータ */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Raw Data (JSON)</h3>
                <div className="rounded-md bg-muted p-4 overflow-auto max-h-[400px] w-full border border-gray-200">
                  <pre className="text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(detailData.data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

