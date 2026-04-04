"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format } from "date-fns"
import { CalendarIcon, CheckSquareIcon, GripVerticalIcon } from "lucide-react"
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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    cursor: overlay ? "grabbing" : "grab",
  }

  const completedItems = card.checklist?.filter((i) => i.checked).length ?? 0
  const totalItems = card.checklist?.length ?? 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-card border rounded-lg px-3 py-2.5 shadow-sm hover:shadow-md transition-shadow select-none ${
        overlay ? "shadow-lg rotate-1" : ""
      }`}
    >
      <div className="flex items-start gap-1.5">
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <GripVerticalIcon className="size-3.5" />
        </button>

        {/* Card content */}
        <div className="flex-1 min-w-0" onClick={() => onClick(card)}>
          {/* Labels */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {card.labels.map((label, i) => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-8 rounded-full"
                  style={{ backgroundColor: label.color }}
                  title={label.text}
                />
              ))}
            </div>
          )}

          <p className="text-sm font-medium leading-snug">{card.title}</p>

          {/* Footer row */}
          <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
            {card.dueDate && (
              <span className="flex items-center gap-0.5 text-xs">
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
