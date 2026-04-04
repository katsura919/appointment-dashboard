"use client"

import * as React from "react"
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { PlusIcon, GripVerticalIcon, MoreHorizontalIcon, Trash2Icon, PencilIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { KanbanCard } from "@/components/trello/KanbanCard"
import type { KanbanLane as KanbanLaneType, KanbanCard as KanbanCardType } from "@/store/trello-store"

interface Props {
  lane: KanbanLaneType
  workspaceId: string
  onCardClick: (card: KanbanCardType) => void
  onCardAdded: () => void
  onLaneDeleted: () => void
  onLaneRenamed: (newName: string) => void
}

export function KanbanLane({
  lane,
  workspaceId,
  onCardClick,
  onCardAdded,
  onLaneDeleted,
  onLaneRenamed,
}: Props) {
  const [addingCard, setAddingCard] = React.useState(false)
  const [newCardTitle, setNewCardTitle] = React.useState("")
  const [renaming, setRenaming] = React.useState(false)
  const [renameValue, setRenameValue] = React.useState(lane.title)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Lane itself is sortable (for column reordering)
  const {
    attributes: laneAttrs,
    listeners: laneListen,
    setNodeRef: setLaneRef,
    transform,
    transition,
    isDragging: laneIsDragging,
  } = useSortable({ id: lane.id, data: { type: "lane" } })

  // Lane body is droppable so cards can be dropped into empty lanes
  const { setNodeRef: setDropRef } = useDroppable({ id: `droppable-${lane.id}` })

  const laneStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: laneIsDragging ? 0.4 : 1,
  }

  React.useEffect(() => {
    if (addingCard) inputRef.current?.focus()
  }, [addingCard])

  async function handleAddCard() {
    if (!newCardTitle.trim()) return
    try {
      const res = await fetch("/api/trello/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
        body: JSON.stringify({ pipelineId: lane.id, title: newCardTitle.trim() }),
      })
      if (!res.ok) throw new Error()
      setNewCardTitle("")
      setAddingCard(false)
      onCardAdded()
    } catch {
      toast.error("Failed to add card")
    }
  }

  async function handleDeleteLane() {
    try {
      const res = await fetch(`/api/trello/pipelines/${lane.id}`, {
        method: "DELETE",
        headers: { "x-workspace-id": workspaceId },
      })
      if (!res.ok) throw new Error()
      onLaneDeleted()
    } catch {
      toast.error("Failed to delete pipeline")
    }
  }

  async function handleRename() {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === lane.title) { setRenaming(false); return }
    try {
      const res = await fetch(`/api/trello/pipelines/${lane.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) throw new Error()
      onLaneRenamed(trimmed)
    } catch {
      toast.error("Failed to rename pipeline")
      setRenameValue(lane.title)
    } finally {
      setRenaming(false)
    }
  }

  const cardIds = lane.cards.map((c) => c.id)

  return (
    <div
      ref={setLaneRef}
      style={laneStyle}
      className="w-72 shrink-0 flex flex-col rounded-xl bg-muted/60 border border-border/50"
    >
      {/* Lane header */}
      <div
        className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border/40"
        style={lane.color ? { borderTopColor: lane.color, borderTopWidth: 3, borderTopStyle: "solid", borderRadius: "0.75rem 0.75rem 0 0" } : undefined}
      >
        <button
          {...laneListen}
          {...laneAttrs}
          className="text-muted-foreground opacity-40 hover:opacity-80 transition-opacity cursor-grab active:cursor-grabbing"
          tabIndex={-1}
        >
          <GripVerticalIcon className="size-3.5" />
        </button>

        {renaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename()
              if (e.key === "Escape") { setRenaming(false); setRenameValue(lane.title) }
            }}
            className="flex-1 text-sm font-semibold bg-transparent border-0 outline-none ring-0 p-0 min-w-0"
          />
        ) : (
          <span
            className="flex-1 text-sm font-semibold truncate cursor-default"
            onDoubleClick={() => setRenaming(true)}
          >
            {lane.title}
          </span>
        )}

        <span className="text-xs text-muted-foreground tabular-nums">{lane.cards.length}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6 opacity-50 hover:opacity-100">
              <MoreHorizontalIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setRenaming(true)}>
              <PencilIcon className="size-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDeleteLane}
            >
              <Trash2Icon className="size-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <div ref={setDropRef} className="flex flex-col gap-2 p-2 flex-1 min-h-[4rem] overflow-y-auto max-h-[calc(100vh-18rem)]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {lane.cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>

        {addingCard ? (
          <div className="space-y-1.5">
            <Input
              ref={inputRef}
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Card title"
              className="h-8 text-sm bg-card"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCard()
                if (e.key === "Escape") { setAddingCard(false); setNewCardTitle("") }
              }}
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={handleAddCard} disabled={!newCardTitle.trim()}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setAddingCard(false); setNewCardTitle("") }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Add card button */}
      {!addingCard && (
        <div className="px-2 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground justify-start gap-1.5"
            onClick={() => setAddingCard(true)}
          >
            <PlusIcon className="size-3.5" />
            Add card
          </Button>
        </div>
      )}
    </div>
  )
}
