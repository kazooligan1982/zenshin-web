"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import { MoreVertical, Edit2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  updateComment,
  deleteComment,
  updateVisionComment,
  deleteVisionComment,
  updateRealityComment,
  deleteRealityComment,
} from "@/app/charts/[id]/actions"
import { linkifyUrls } from "@/lib/utils"
import type { TimelineComment } from "@/types/database"

interface TimelineItemProps {
  comment: TimelineComment
  currentUserId: string
  chartId: string
  workspaceId?: string
  type: "action" | "vision" | "reality"
  onDelete?: (commentId: string) => void
  onDeleted?: (commentId: string) => void
  onRestore?: (comment: TimelineComment) => void
  onUpdated?: (commentId: string, newContent: string) => void
}

export function TimelineItem({
  comment,
  currentUserId,
  chartId,
  workspaceId,
  type,
  onDelete,
  onDeleted,
  onRestore,
  onUpdated,
}: TimelineItemProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  // TODO: 認証実装後に currentUserId 比較に戻す
  const isOwn = !currentUserId || comment.user_id === currentUserId
  const relativeTime = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: ja,
  })
  const userName = comment.profile?.name || comment.profile?.email || "Unknown"
  const userInitial = userName[0]?.toUpperCase() || "?"
  const avatarUrl = comment.profile?.avatar_url || null

  const handleUpdate = async () => {
    if (!editContent.trim() || editContent === comment.content) {
      setIsEditing(false)
      return
    }
    setIsLoading(true)
    const nextContent = editContent.trim()
    onUpdated?.(comment.id, nextContent)
    setIsEditing(false)
    let result
    switch (type) {
      case "vision":
        result = await updateVisionComment(comment.id, nextContent, chartId)
        break
      case "reality":
        result = await updateRealityComment(comment.id, nextContent, chartId)
        break
      case "action":
      default:
        result = await updateComment(comment.id, nextContent, chartId)
    }
    setIsLoading(false)
    if (result.success) {
      router.refresh()
    } else {
      onUpdated?.(comment.id, comment.content)
      setEditContent(comment.content)
      toast.error("更新に失敗しました", { duration: 5000 })
    }
  }

  const handleDelete = async () => {
    // 即座にUIから非表示（楽観的削除）
    setIsDeleted(true)
    onDelete?.(comment.id)

    // 15秒Undoトースト表示
    let undone = false
    toast("コメントを削除しました", {
      duration: 15000,
      action: {
        label: "元に戻す",
        onClick: () => {
          undone = true
          setIsDeleted(false)
          onRestore?.(comment)
        },
      },
    })

    // 15秒後に実際にDB削除（Undoされなかった場合）
    setTimeout(async () => {
      if (undone) return

      setIsLoading(true)
      let result
      switch (type) {
        case "vision":
          result = await deleteVisionComment(comment.id, chartId)
          break
        case "reality":
          result = await deleteRealityComment(comment.id, chartId)
          break
        case "action":
        default:
          result = await deleteComment(comment.id, chartId)
      }
      setIsLoading(false)

      if (!result.success) {
        setIsDeleted(false)
        onRestore?.(comment)
        toast.error("削除に失敗しました", { duration: 5000 })
        return
      }
      onDeleted?.(comment.id)
      router.refresh()
    }, 15000)
  }

  if (isDeleted) return null

  return (
    <div className="flex gap-3">
      <div className="shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={userName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-zenshin-teal flex items-center justify-center text-sm font-semibold text-white">
            {userInitial}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-zenshin-navy">{userName}</span>
          <span className="text-xs text-gray-400">{relativeTime}</span>
          {comment.updated_at !== comment.created_at && (
            <span className="text-xs text-gray-400">(編集済み)</span>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={isLoading}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                disabled={isLoading}
                className="px-3 py-1 bg-zenshin-teal text-white text-sm rounded hover:bg-zenshin-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "保存中..." : "保存"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(comment.content)
                }}
                disabled={isLoading}
                className="px-3 py-1 bg-zenshin-navy/10 text-sm rounded hover:bg-zenshin-navy/15 disabled:opacity-50 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div
            className="text-sm text-gray-700 prose prose-sm max-w-none [&_.mention]:bg-blue-100 [&_.mention]:text-blue-700 [&_.mention]:px-1 [&_.mention]:py-0.5 [&_.mention]:rounded [&_.mention]:text-xs [&_.mention]:font-medium [&_.mention]:cursor-pointer [&_.mention]:no-underline"
            dangerouslySetInnerHTML={{
              __html: comment.content.trimStart().startsWith("<")
                ? comment.content
                : linkifyUrls(comment.content),
            }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              const mention = target.closest(".mention") as HTMLElement;
              if (mention) {
                const mentionId = mention.getAttribute("data-id");
                if (mentionId) {
                  const [mentionType, targetChartId] = mentionId.split(":");
                  if (targetChartId) {
                    const chartPath = workspaceId
                      ? `/workspaces/${workspaceId}/charts/${targetChartId}`
                      : `/charts/${targetChartId}`;
                    router.push(chartPath);
                  }
                }
              }
            }}
          />
        )}
      </div>
      {isOwn && !isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 p-1 hover:bg-zenshin-navy/5 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              align="end"
              sideOffset={5}
              className="z-[9999] bg-white shadow-lg border min-w-[120px]"
            >
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setIsEditing(true)
                }}
                className="cursor-pointer"
              >
              <Edit2 className="h-4 w-4 mr-2" />
              編集
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  handleDelete()
                }}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
              <Trash2 className="h-4 w-4 mr-2" />
              削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      )}
    </div>
  )
}
