"use client"

import { CSSProperties } from "react"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format } from "date-fns"
import { CalendarIcon, CheckSquareIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { KanbanCard as KanbanCardType } from "@/store/trello-store"

interface Props {
  card: KanbanCardType
  onClick: (card: KanbanCardType) => void
  overlay?: boolean
}

export function KanbanCard({ card, onClick, overlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    cursor: overlay ? "grabbing" : "grab",
  }

  const completedItems = card.checklist?.filter((i) => i.checked).length ?? 0
  const totalItems = card.checklist?.length ?? 0
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !overlay && onClick(card)}
      className={`group bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow select-none ${
        overlay ? "shadow-lg rotate-1" : ""
      }`}
    >
      {card.coverColor && (
        <div className="h-8 w-full" style={{ backgroundColor: card.coverColor }} />
      )}
      <div className="px-3 py-2.5">
        {/* Card content */}
        <div className="min-w-0">
          {/* Labels */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {card.labels.slice(0, 2).map((label, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.text}
                </span>
              ))}
              {card.labels.length > 2 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-muted text-muted-foreground">
                  +{card.labels.length - 2}
                </span>
              )}
            </div>
          )}

          <div className="flex items-start gap-1 mb-0.5">
            {card.priority === "urgent" && (
              <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide leading-none mt-0.5">Urgent</span>
            )}
            {card.priority === "high" && (
              <span className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide leading-none mt-0.5">High</span>
            )}
            {card.priority === "low" && (
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-none mt-0.5">Low</span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug">{card.title}</p>

          {/* Footer row */}
          <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
            {card.dueDate && (
              <span className={`flex items-center gap-0.5 text-xs ${isOverdue ? "text-destructive font-medium" : ""}`}>
                <CalendarIcon className="size-3" />
                {format(new Date(card.dueDate), "MMM d")}
              </span>
            )}
            {totalItems > 0 && (
              <span className="flex items-center gap-0.5 text-xs">
                <CheckSquareIcon className="size-3" />
                {completedItems}/{totalItems}
              </span>
            )}
            {card.assigneeIds && card.assigneeIds.length > 0 && (
              <div className="ml-auto flex -space-x-1">
                {card.assigneeIds.slice(0, 3).map((a) => (
                  <span
                    key={a._id}
                    className="size-5 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[9px] font-semibold uppercase"
                    title={a.name}
                  >
                    {a.name[0]}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
