"use client"

import { useEffect, useRef, useState } from "react"
import { TimelineItem } from "@/components/action-timeline/TimelineItem"
import { CommentInput } from "@/components/action-timeline/CommentInput"
import type { TimelineComment } from "@/types/database"

interface TimelineProps {
  type: "action" | "vision" | "reality"
  itemId: string
  initialComments: TimelineComment[]
  currentUserId: string
  currentUser?: { id?: string; email: string; name?: string; avatar_url?: string | null } | null
  chartId: string
  workspaceId: string
  onCommentAdded?: () => void
  onCommentDeleted?: () => void
  onDataRefresh?: () => void
  deletedCommentIds?: Set<string>
  onCommentDeletedId?: (commentId: string) => void
  onCommentUndo?: (commentId: string) => void
}

const INITIAL_VISIBLE_COUNT = 5

export function Timeline({
  type,
  itemId,
  initialComments,
  currentUserId,
  currentUser,
  chartId,
  workspaceId,
  onCommentAdded,
  onCommentDeleted,
  onDataRefresh,
  deletedCommentIds: propDeletedCommentIds,
  onCommentDeletedId,
  onCommentUndo,
}: TimelineProps) {
  const [comments, setComments] = useState(initialComments)
  const [isExpanded, setIsExpanded] = useState(false)
  const [internalDeletedIds, setInternalDeletedIds] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCommentsLengthRef = useRef(initialComments.length)

  const deletedIds = propDeletedCommentIds ?? internalDeletedIds
  const handleCommentDeleted = onCommentDeletedId ?? ((id) => setInternalDeletedIds((prev) => new Set(prev).add(id)))
  const handleCommentUndo = onCommentUndo ?? ((id) => setInternalDeletedIds((prev) => {
    const next = new Set(prev)
    next.delete(id)
    return next
  }))

  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  useEffect(() => {
    if (comments.length > prevCommentsLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    prevCommentsLengthRef.current = comments.length
  }, [comments.length])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  const filteredComments = comments.filter((c) => !deletedIds.has(c.id))
  const visibleComments = isExpanded ? filteredComments : filteredComments.slice(-INITIAL_VISIBLE_COUNT)
  const hiddenCount = filteredComments.length - INITIAL_VISIBLE_COUNT
  const hasMoreComments = hiddenCount > 0

  const handleUpdate = (commentId: string, newContent: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, content: newContent } : comment
      )
    )
  }

  const handleOptimisticAdd = (newComment: TimelineComment) => {
    setComments((prev) => [...prev, newComment])
  }

  const handleAddFailed = (tempId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== tempId))
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-lg bg-white shadow-sm">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-zenshin-cream/30">
        {hasMoreComments && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full py-2 text-xs text-zenshin-navy/50 hover:text-zenshin-navy hover:bg-zenshin-cream/50 rounded-lg transition-colors"
          >
            以前のコメントを表示 ({hiddenCount}件)
          </button>
        )}
        {visibleComments.map((comment) => (
          <TimelineItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            chartId={chartId}
            workspaceId={workspaceId}
            type={type}
            onDelete={handleCommentDeleted}
            onDeleted={onCommentDeleted}
            onDataRefresh={onDataRefresh}
            onUndo={handleCommentUndo}
            onUpdated={handleUpdate}
          />
        ))}
        {filteredComments.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-zenshin-navy/40 text-sm mb-2">まだコメントがありません</p>
            <p className="text-zenshin-navy/30 text-xs">最初のコメントを投稿してみましょう</p>
          </div>
        )}
      </div>
      <div className="shrink-0 p-4 border-t bg-white">
        <CommentInput
          type={type}
          itemId={itemId}
          chartId={chartId}
          workspaceId={workspaceId}
          currentUserId={currentUserId}
          currentUser={currentUser}
          onOptimisticAdd={handleOptimisticAdd}
          onFailed={handleAddFailed}
          onPersisted={onCommentAdded}
        />
      </div>
    </div>
  )
}
