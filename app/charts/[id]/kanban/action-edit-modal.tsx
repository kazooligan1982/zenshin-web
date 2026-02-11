"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  updateActionPlanItem,
  fetchActionComments,
  checkIncompleteTelescopeActions,
} from "../actions";
import {
  Loader2,
  AlertTriangle,
  Circle,
  Clock,
  CheckCircle2,
  Pause,
  XCircle,
  MessageSquare,
  Target,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Timeline } from "@/components/action-timeline/Timeline";
import { supabase } from "@/lib/supabase";
import { getCurrentWorkspaceId } from "@/lib/workspace";
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

interface Action {
  id: string;
  title: string;
  due_date: string | null;
  assignee: string | null;
  status: "todo" | "in_progress" | "done" | "pending" | "canceled" | null;
  is_completed: boolean | null;
  tension_id: string | null;
  child_chart_id?: string | null;
  vision_tags?: string[];
  description?: string | null;
}

interface ActionEditModalProps {
  action: Action | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAction?: {
    id: string;
    title?: string;
    status?: string;
    assignee?: string | null;
    due_date?: string | null;
    is_completed?: boolean | null;
  }) => void;
  projectId: string;
}

export function ActionEditModal({
  action,
  isOpen,
  onClose,
  onSave,
  projectId,
}: ActionEditModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"todo" | "in_progress" | "done" | "pending" | "canceled">("todo");
  const [assignee, setAssignee] = useState<string>("unassigned");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionComments, setActionComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    email: string;
    name?: string;
    avatar_url?: string | null;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    actionTitle: string;
    incompleteCount: number;
    incompleteActions: { id: string; title: string; status: string }[];
    nextStatus: "done" | "canceled";
  } | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      getCurrentWorkspaceId().then((id) => setWorkspaceId(id ?? ""));
    }
  }, [isOpen]);

  useEffect(() => {
    if (action) {
      setTitle(action.title || "");
      setStatus(
        (action.status as "todo" | "in_progress" | "done" | "pending" | "canceled") ||
        (action.is_completed ? "done" : "todo")
      );
      setAssignee(action.assignee || "unassigned");
      setDueDate(action.due_date || null);
      setDescription(action.description || "");
    }
  }, [action]);

  useEffect(() => {
    const loadUser = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id || "";
      setCurrentUserId(userId);
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email, name, avatar_url")
          .eq("id", userId)
          .single();
        if (profile) {
          setCurrentUser(profile);
        }
      }
    };
    if (isOpen) {
      void loadUser();
    }
  }, [isOpen]);

  const loadActionComments = useCallback(async () => {
    if (!action?.id) return;
    setIsLoadingComments(true);
    try {
      const comments = await fetchActionComments(action.id);
      setActionComments(comments);
    } catch (error) {
      console.error("コメントの取得に失敗しました:", error);
      setActionComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  }, [action?.id]);

  useEffect(() => {
    if (isOpen && action?.id) {
      void loadActionComments();
    }
  }, [isOpen, action?.id, loadActionComments]);

  const performSave = async (skipCheck: boolean) => {
    if (!action) return;
      setIsSaving(true);
      try {
        const { updateActionStatus } = await import("../actions");

        const currentStatus =
          action.status || (action.is_completed ? "done" : "todo");
        const nextStatus = status as "done" | "canceled" | "todo" | "in_progress" | "pending";

        if (
          !skipCheck &&
          (nextStatus === "done" || nextStatus === "canceled") &&
          action.child_chart_id
        ) {
          const result = await checkIncompleteTelescopeActions(action.id);
          if (result.hasIncomplete) {
            setConfirmDialog({
              open: true,
              actionTitle: action.title,
              incompleteCount: result.incompleteCount,
              incompleteActions: result.incompleteActions,
              nextStatus,
            });
            setIsSaving(false);
            return;
          }
        }

        if (status !== currentStatus) {
          await updateActionStatus(action.id, status);
        }

        if (title !== action.title) {
          await updateActionPlanItem(action.id, action.tension_id || null, "title", title, projectId);
        }
        const assigneeValue = assignee === "unassigned" ? null : assignee;
        const currentAssignee = action.assignee || null;
        if (assigneeValue !== currentAssignee) {
          await updateActionPlanItem(action.id, action.tension_id || null, "assignee", assigneeValue || "", projectId);
        }
        if (dueDate !== (action.due_date || "")) {
          await updateActionPlanItem(
            action.id,
            action.tension_id || null,
            "dueDate",
            dueDate || "",
            projectId
          );
        }

        const currentDescription = action.description || "";
        const newDescription = description.trim();
        if (newDescription !== currentDescription) {
          const descriptionValue = newDescription === "" ? null : newDescription;
          await updateActionPlanItem(action.id, action.tension_id || null, "description", descriptionValue || "", projectId);
        }

        toast.success("アクションを更新しました", { duration: 3000 });
        onSave({
          id: action.id,
          title,
          status,
          assignee: assigneeValue,
          due_date: dueDate || null,
          is_completed: status === "done",
        });
        router.refresh();
        onClose();
      } catch (error) {
        console.error("Error updating action:", error);
        toast.error("更新に失敗しました", { duration: 5000 });
      } finally {
        setIsSaving(false);
      }
  };

  const handleSave = async () => {
    await performSave(false);
  };

  const handleConfirmStatusChange = async () => {
    setConfirmDialog(null);
    await performSave(true);
  };

  if (!action) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-zenshin-teal" />
              アクションを編集
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
          <div className="space-y-2">
              <Label className="text-sm font-medium">タイトル</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトルを入力"
                className="h-10"
            />
          </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-zenshin-navy/50">ステータス</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="w-full h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">
                    <div className="flex items-center gap-2">
                      <Circle className="w-3 h-3 text-zenshin-navy/30" />
                      未着手
                    </div>
                  </SelectItem>
                  <SelectItem value="in_progress">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-blue-500" />
                      進行中
                    </div>
                  </SelectItem>
                  <SelectItem value="done">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      完了
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Pause className="w-3 h-3 text-amber-500" />
                      保留
                    </div>
                  </SelectItem>
                  <SelectItem value="canceled">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-3 h-3 text-zenshin-navy/30" />
                      中止
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-zenshin-navy/50">期限</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal bg-background",
                        !dueDate && "text-zenshin-navy/40"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate
                        ? format(new Date(dueDate), "yyyy/MM/dd", { locale: ja })
                        : "未設定"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate ? new Date(dueDate) : undefined}
                      onSelect={(date) =>
                        setDueDate(date ? date.toISOString() : null)
                      }
                      locale={ja}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-zenshin-navy/50">担当者</Label>
                <Input
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="担当者名を入力"
                  className="w-full h-10 bg-background"
                />
              </div>
            </div>

          {action.vision_tags && action.vision_tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {action.vision_tags.map((tag) => (
                <Badge key={tag} variant="outline" className="bg-zenshin-teal/10 text-zenshin-teal">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">詳細</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="詳細や要件を入力..."
                className="min-h-[100px] resize-none"
              />
            </div>

          {/* タイムライン */}
            <div className="space-y-2 border-t pt-6">
              <Label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zenshin-navy/50" />
              アクティビティ
            </Label>
            {isLoadingComments && (
              <div className="text-sm text-zenshin-navy/40">コメントを読み込み中...</div>
            )}
            <Timeline
              type="action"
              itemId={action.id}
              initialComments={actionComments}
              currentUserId={currentUserId}
              currentUser={currentUser}
              chartId={projectId}
              workspaceId={workspaceId}
              onCommentAdded={loadActionComments}
            />
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-zenshin-orange hover:bg-zenshin-orange/90 text-white">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {confirmDialog && (
        <AlertDialog open={confirmDialog.open} onOpenChange={() => setConfirmDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="w-5 h-5" />
                未完了のアクションがあります
              </AlertDialogTitle>
              <AlertDialogDescription>
                「{confirmDialog.actionTitle}」のテレスコープ先に、
                <span className="font-bold text-red-600">
                  {confirmDialog.incompleteCount}件
                </span>
                の未完了アクションがあります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            {confirmDialog.incompleteActions.length > 0 && (
              <div className="bg-zenshin-cream/50 rounded-lg p-3">
                <p className="text-xs text-zenshin-navy/50 mb-2">未完了のアクション:</p>
                <ul className="space-y-1">
                  {confirmDialog.incompleteActions.map((item) => (
                    <li key={item.id} className="text-sm text-zenshin-navy flex items-center gap-2">
                      <Circle className="w-3 h-3 text-zenshin-navy/40" />
                      {item.title}
                    </li>
                  ))}
                  {confirmDialog.incompleteCount > 5 && (
                    <li className="text-xs text-zenshin-navy/50">
                      他 {confirmDialog.incompleteCount - 5}件...
                    </li>
                  )}
                </ul>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDialog(null)}>
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-yellow-600 hover:bg-yellow-700"
                onClick={handleConfirmStatusChange}
              >
                完了にする
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
