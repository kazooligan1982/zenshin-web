"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import { MoreVertical, Edit2, Trash2 } from "lucide-react"
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
      alert("更新に失敗しました")
    }
  }

  const handleDelete = async () => {
    if (!confirm("このコメントを削除しますか？")) return
    setIsDeleted(true)
    onDelete?.(comment.id)
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
      alert("削除に失敗しました")
      return
    }
    onDeleted?.(comment.id)
    router.refresh()
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
            className="text-sm text-gray-700 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: comment.content.trimStart().startsWith("<")
                ? comment.content
                : linkifyUrls(comment.content),
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
