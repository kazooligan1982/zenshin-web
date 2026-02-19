"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SnapshotViewer } from "./snapshot-viewer";
import {
  Camera,
  Pin,
  PinOff,
  Plus,
  Minus,
  Edit,
  ArrowRight,
  GitCompare,
  X,
  Check,
  Save,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Snapshot {
  id: string;
  chart_id: string;
  created_at: string;
  snapshot_type: string;
  description: string | null;
  is_pinned: boolean;
  data: any;
}

interface Comparison {
  id: string;
  snapshot_before_id: string;
  snapshot_after_id: string;
  title: string;
  description: string | null;
  diff_summary: any;
  created_at: string;
}

const INITIAL_DISPLAY_COUNT = 20;
const LOAD_MORE_COUNT = 20;

export default function SnapshotsPage() {
  const t = useTranslations("snapshot");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const params = useParams();
  const projectId = params?.id as string;

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [compareSnapshot1, setCompareSnapshot1] = useState<Snapshot | null>(null);
  const [compareSnapshot2, setCompareSnapshot2] = useState<Snapshot | null>(null);
  const [diffs, setDiffs] = useState<any[]>([]);
  const [showDiffs, setShowDiffs] = useState(false);
  const [saveComparisonDialog, setSaveComparisonDialog] = useState(false);
  const [comparisonTitle, setComparisonTitle] = useState("");
  const [comparisonDescription, setComparisonDescription] = useState("");
  const [activeTab, setActiveTab] = useState<"snapshots" | "comparisons">("snapshots");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const fetchData = async () => {
      setLoading(true);

      const { data: snapshotData, error: snapshotError, count } = await supabase
        .from("snapshots")
        .select("*", { count: "exact" })
        .eq("chart_id", projectId)
        .order("created_at", { ascending: false });


      if (snapshotData) {
        const sorted = [...snapshotData].sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setSnapshots(sorted as Snapshot[]);
      }

      const { data: comparisonData } = await supabase
        .from("snapshot_comparisons")
        .select("*")
        .order("created_at", { ascending: false });

      if (comparisonData) setComparisons(comparisonData as Comparison[]);
      setLoading(false);
    };

    fetchData();
  }, [projectId]);

  const togglePin = async (snapshot: Snapshot) => {
    const newPinned = !snapshot.is_pinned;
    const { error } = await supabase
      .from("snapshots")
      .update({ is_pinned: newPinned })
      .eq("id", snapshot.id);

    if (!error) {
      setSnapshots((prev) =>
        prev
          .map((s) => (s.id === snapshot.id ? { ...s, is_pinned: newPinned } : s))
          .sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
      );
    }
  };

  const saveDescription = async (snapshotId: string) => {
    const { error } = await supabase
      .from("snapshots")
      .update({ description: editDescription })
      .eq("id", snapshotId);

    if (!error) {
      setSnapshots((prev) =>
        prev.map((s) => (s.id === snapshotId ? { ...s, description: editDescription } : s))
      );
      setEditingId(null);
    }
  };

  const startEdit = (snapshot: Snapshot) => {
    setEditingId(snapshot.id);
    setEditDescription(snapshot.description || "");
  };

  const deleteSnapshot = async (snapshotId: string) => {
    const { error } = await supabase.from("snapshots").delete().eq("id", snapshotId);
    if (!error) {
      setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
    }
    setDeleteTargetId(null);
  };

  const saveComparison = async () => {

    if (!compareSnapshot1 || !compareSnapshot2) {
      console.error("[saveComparison] Missing snapshots");
      alert(t("saveComparisonSelectSnapshots"));
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const diffSummary = {
        added: diffs.filter((d) => d.type === "added").length,
        modified: diffs.filter((d) => d.type === "modified").length,
        removed: diffs.filter((d) => d.type === "removed").length,
      };

      const insertData = {
        snapshot_before_id: compareSnapshot1.id,
        snapshot_after_id: compareSnapshot2.id,
        title:
          comparisonTitle ||
          `比較: ${format(new Date(compareSnapshot1.created_at), "MM/dd")} → ${format(
            new Date(compareSnapshot2.created_at),
            "MM/dd"
          )}`,
        description: comparisonDescription || null,
        diff_summary: diffSummary,
        diff_details: diffs,
        created_by: user?.id || null,
      };


      const { data, error } = await supabase
        .from("snapshot_comparisons")
        .insert(insertData)
        .select()
        .single();


      if (error) {
        console.error("[saveComparison] Error:", error);
        alert(t("saveComparisonFailed") + ": " + error.message);
        return;
      }

      if (data) {
        setComparisons((prev) => [data as Comparison, ...prev]);
        setSaveComparisonDialog(false);
        setComparisonTitle("");
        setComparisonDescription("");
        alert(t("saveComparisonSuccess"));
      }
    } catch (err) {
      console.error("[saveComparison] Exception:", err);
      alert(t("errorOccurred"));
    }
  };

  const calculateDiffs = () => {
    if (!compareSnapshot1 || !compareSnapshot2) return;

    const diffResults: any[] = [];
    const [before, after] =
      new Date(compareSnapshot1.created_at) < new Date(compareSnapshot2.created_at)
        ? [compareSnapshot1, compareSnapshot2]
        : [compareSnapshot2, compareSnapshot1];

    ["visions", "realities", "tensions", "actions"].forEach((category) => {
      const items1 = before.data?.[category] || [];
      const items2 = after.data?.[category] || [];

      items2.forEach((item2: any) => {
        const found = items1.find((item1: any) => item1.id === item2.id);
        if (!found) {
          diffResults.push({ type: "added", category, item: item2 });
        } else if (JSON.stringify(found) !== JSON.stringify(item2)) {
          diffResults.push({ type: "modified", category, before: found, after: item2, item: item2 });
        }
      });

      items1.forEach((item1: any) => {
        if (!items2.find((item2: any) => item2.id === item1.id)) {
          diffResults.push({ type: "removed", category, item: item1 });
        }
      });
    });

    setDiffs(diffResults);
    setShowDiffs(true);
  };

  const handleSnapshotClick = (snapshot: Snapshot) => {
    if (!compareMode) return;
    if (!compareSnapshot1) {
      setCompareSnapshot1(snapshot);
    } else if (!compareSnapshot2 && snapshot.id !== compareSnapshot1.id) {
      setCompareSnapshot2(snapshot);
    } else if (snapshot.id === compareSnapshot1.id) {
      setCompareSnapshot1(null);
    } else if (snapshot.id === compareSnapshot2?.id) {
      setCompareSnapshot2(null);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setCompareSnapshot1(null);
    setCompareSnapshot2(null);
    setDiffs([]);
    setShowDiffs(false);
  };

  const isSelected = (snapshot: Snapshot) =>
    compareSnapshot1?.id === snapshot.id || compareSnapshot2?.id === snapshot.id;

  const getSelectionNumber = (snapshot: Snapshot) => {
    if (compareSnapshot1?.id === snapshot.id) return 1;
    if (compareSnapshot2?.id === snapshot.id) return 2;
    return null;
  };

  const displayedSnapshots = snapshots.slice(0, displayCount);
  const hasMore = snapshots.length > displayCount;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>

        <div className="flex items-center gap-2">
          {compareMode ? (
            <>
              <Button variant="outline" onClick={exitCompareMode}>
                <X className="w-4 h-4 mr-2" />
                {tCommon("cancel")}
              </Button>
              <Button onClick={calculateDiffs} disabled={!compareSnapshot1 || !compareSnapshot2}>
                <GitCompare className="w-4 h-4 mr-2" />
                {t("compare")}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setCompareMode(true)}>
              <GitCompare className="w-4 h-4 mr-2" />
              {t("comparisonMode")}
            </Button>
          )}
        </div>
      </div>

      {compareMode && !showDiffs && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <p className="text-sm text-blue-800">
              {t("compareSelectHint")}
              {compareSnapshot1 && !compareSnapshot2 && t("oneMoreSelect")}
            </p>
          </CardContent>
        </Card>
      )}

      {showDiffs && (
        <div className="mb-8 space-y-4">
          <Card className="bg-gray-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-500">{t("before")}</p>
                    <p className="font-medium">
                      {format(new Date(compareSnapshot1!.created_at), "yyyy/MM/dd HH:mm", {
                        locale: ja,
                      })}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">{t("after")}</p>
                    <p className="font-medium">
                      {format(new Date(compareSnapshot2!.created_at), "yyyy/MM/dd HH:mm", {
                        locale: ja,
                      })}
                    </p>
                  </div>
                </div>
                <Button onClick={() => setSaveComparisonDialog(true)} size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  {t("saveComparison")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-600" />
                  <span className="font-medium">{diffs.filter((d) => d.type === "added").length} {t("added")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium">{diffs.filter((d) => d.type === "modified").length} {t("modified")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Minus className="w-5 h-5 text-red-600" />
                  <span className="font-medium">{diffs.filter((d) => d.type === "removed").length} {t("removed")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {diffs.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {diffs.map((diff, index) => (
                <Card
                  key={index}
                  className={`border-l-4 ${
                    diff.type === "added"
                      ? "border-l-green-500"
                      : diff.type === "removed"
                        ? "border-l-red-500"
                        : "border-l-yellow-500"
                  }`}
                >
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      {diff.type === "added" && <Plus className="w-4 h-4 text-green-600 mt-0.5" />}
                      {diff.type === "removed" && <Minus className="w-4 h-4 text-red-600 mt-0.5" />}
                      {diff.type === "modified" && <Edit className="w-4 h-4 text-yellow-600 mt-0.5" />}
                      <div className="flex-1">
                        <Badge variant="outline" className="text-xs mb-1">
                          {diff.category}
                        </Badge>
                        <p className="text-sm">
                          {diff.item?.content || diff.item?.title || t("noContent")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">{t("noDiffs")}</CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={() => setShowDiffs(false)} className="w-full">
            {t("closeDiffs")}
          </Button>
        </div>
      )}

      {!showDiffs && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "snapshots" | "comparisons")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="snapshots" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              {t("title")} ({snapshots.length})
            </TabsTrigger>
            <TabsTrigger value="comparisons" className="flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              {t("comparisonHistory")} ({comparisons.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="snapshots" className="space-y-3">
            {snapshots.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">{t("noSnapshots")}</CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  {displayedSnapshots.map((snapshot) => (
                    <Card
                      key={snapshot.id}
                      className={`transition-all ${compareMode ? "cursor-pointer hover:shadow-md" : ""} ${
                        isSelected(snapshot) ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => compareMode && handleSnapshotClick(snapshot)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            {compareMode && getSelectionNumber(snapshot) && (
                              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium shrink-0">
                                {getSelectionNumber(snapshot)}
                              </div>
                            )}
                            {snapshot.is_pinned && <Pin className="w-4 h-4 text-yellow-500 shrink-0 mt-1" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">
                                  {format(new Date(snapshot.created_at), "yyyy/MM/dd HH:mm", { locale: ja })}
                                </p>
                                <Badge
                                  variant={snapshot.snapshot_type === "manual" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {snapshot.snapshot_type === "manual" ? t("manual") : t("auto")}
                                </Badge>
                              </div>
                              {editingId === snapshot.id ? (
                                <div className="flex items-center gap-2 mt-2">
                                  <Input
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder={t("descriptionPlaceholder")}
                                    className="flex-1 h-8 text-sm"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveDescription(snapshot.id);
                                    }}
                                  >
                                    <Check className="w-4 h-4 text-green-600" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingId(null);
                                    }}
                                  >
                                    <X className="w-4 h-4 text-gray-400" />
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 truncate">
                                  {snapshot.description || t("addDescription")}
                                </p>
                              )}
                            </div>
                          </div>

                          {!compareMode && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(snapshot);
                                }}
                              >
                                <Pencil className="w-4 h-4 text-gray-400" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePin(snapshot);
                                }}
                              >
                                {snapshot.is_pinned ? (
                                  <PinOff className="w-4 h-4 text-yellow-500" />
                                ) : (
                                  <Pin className="w-4 h-4 text-gray-400" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTargetId(snapshot.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                              </Button>
                              <div onClick={(e) => e.stopPropagation()}>
                                <SnapshotViewer snapshot={snapshot} />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {hasMore && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setDisplayCount((prev) => prev + LOAD_MORE_COUNT)}
                  >
                    <ChevronDown className="w-4 h-4 mr-2" />
                    {tDashboard("loadMore", { count: snapshots.length - displayCount })}
                  </Button>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="comparisons" className="space-y-3">
            {comparisons.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <GitCompare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>{t("noComparisons")}</p>
                  <p className="text-sm mt-1">
                    {t("comparisonHint")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              comparisons.map((comp) => (
                <Card key={comp.id} className="hover:bg-gray-50 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{comp.title}</p>
                        {comp.description && <p className="text-sm text-gray-500 mt-1">{comp.description}</p>}
                        <p className="text-xs text-gray-400 mt-2">
                          {format(new Date(comp.created_at), "yyyy/MM/dd HH:mm", { locale: ja })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm ml-4">
                        <span className="flex items-center gap-1 text-green-600">
                          <Plus className="w-4 h-4" />
                          {comp.diff_summary?.added || 0}
                        </span>
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Edit className="w-4 h-4" />
                          {comp.diff_summary?.modified || 0}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <Minus className="w-4 h-4" />
                          {comp.diff_summary?.removed || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={saveComparisonDialog} onOpenChange={setSaveComparisonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("saveComparisonTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{t("titleLabel")}</label>
              <Input
                value={comparisonTitle}
                onChange={(e) => setComparisonTitle(e.target.value)}
                placeholder={`比較: ${
                  compareSnapshot1 ? format(new Date(compareSnapshot1.created_at), "MM/dd") : ""
                } → ${compareSnapshot2 ? format(new Date(compareSnapshot2.created_at), "MM/dd") : ""}`}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("memoLabel")}</label>
              <Textarea
                value={comparisonDescription}
                onChange={(e) => setComparisonDescription(e.target.value)}
                placeholder={t("memoPlaceholder")}
                rows={3}
              />
            </div>
            <Button onClick={saveComparison} className="w-full">
              {tCommon("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="rounded-2xl border-gray-200 shadow-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-zenshin-navy">
              {t("deleteConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {t("deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg px-4 py-2 text-sm">
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600"
              onClick={() => deleteTargetId && deleteSnapshot(deleteTargetId)}
            >
              {t("deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

