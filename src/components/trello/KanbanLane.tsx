"use client"

import { CSSProperties, useEffect, useRef, useState } from "react"

import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { PlusIcon, GripVerticalIcon, MoreHorizontalIcon, Trash2Icon, PencilIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { KanbanCard } from "@/components/trello/KanbanCard"
import type { KanbanLane as KanbanLaneType, KanbanCard as KanbanCardType } from "@/store/trello-store"

interface Props {
  lane: KanbanLaneType
  workspaceId: string
  onCardClick: (card: KanbanCardType) => void
  onCardAdded: () => void
  onLaneDeleted: () => void
  onLaneRenamed: (newName: string) => void
  onLaneUpdated: () => void
  /** Filtered subset of lane.cards for display. DnD context still uses lane.cards. */
  displayCards?: KanbanCardType[]
}

export function KanbanLane({
  lane,
  workspaceId,
  onCardClick,
  onCardAdded,
  onLaneDeleted,
  onLaneRenamed,
  onLaneUpdated,
  displayCards,
}: Props) {
  const visibleCards = displayCards ?? lane.cards
  const [addingCard, setAddingCard] = useState(false)
  const [addingCardLoading, setAddingCardLoading] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState("")
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(lane.title)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [settingWip, setSettingWip] = useState(false)
  const [wipValue, setWipValue] = useState(lane.wipLimit?.toString() ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

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

  const laneStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: laneIsDragging ? 0.4 : 1,
  }

  useEffect(() => {
    if (addingCard) inputRef.current?.focus()
  }, [addingCard])

  async function handleAddCard() {
    if (!newCardTitle.trim()) return
    setAddingCardLoading(true)
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
    } finally {
      setAddingCardLoading(false)
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

  async function handleSetWipLimit() {
    const parsed = wipValue === "" ? null : parseInt(wipValue, 10)
    if (wipValue !== "" && (isNaN(parsed!) || parsed! < 1)) return
    try {
      const res = await fetch(`/api/trello/pipelines/${lane.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
        body: JSON.stringify({ wipLimit: parsed }),
      })
      if (!res.ok) throw new Error()
      onLaneUpdated()
    } catch {
      toast.error("Failed to update WIP limit")
    } finally {
      setSettingWip(false)
    }
  }

  const cardIds = lane.cards.map((c) => c.id)
  const isAtWipLimit = lane.wipLimit != null && lane.cards.length >= lane.wipLimit

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

        <span
          className={`text-xs tabular-nums font-medium ${
            isAtWipLimit ? "text-destructive" : "text-muted-foreground"
          }`}
          title={lane.wipLimit ? `WIP limit: ${lane.wipLimit}` : undefined}
        >
          {visibleCards.length !== lane.cards.length
            ? `${visibleCards.length}/${lane.cards.length}`
            : lane.wipLimit
            ? `${lane.cards.length}/${lane.wipLimit}`
            : lane.cards.length}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6 opacity-50 hover:opacity-100 cursor-pointer">
              <MoreHorizontalIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setRenaming(true)}>
              <PencilIcon className="size-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSettingWip(true); setWipValue(lane.wipLimit?.toString() ?? "") }}>
              <span className="size-3.5 mr-2 inline-flex items-center justify-center text-[10px] font-bold">WIP</span>
              Set WIP limit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setConfirmDeleteOpen(true)}
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
          {visibleCards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>

        {addingCardLoading && (
          <div className="rounded-lg border bg-card px-3 py-2.5 space-y-2 animate-pulse">
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-2.5 w-1/2 rounded bg-muted" />
          </div>
        )}

        {addingCard ? (
          <div className="space-y-1.5">
            <Input
              ref={inputRef}
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Card title"
              className="h-8 text-sm bg-card"
              disabled={addingCardLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCard()
                if (e.key === "Escape" && !addingCardLoading) { setAddingCard(false); setNewCardTitle("") }
              }}
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleAddCard}
                disabled={!newCardTitle.trim() || addingCardLoading}
              >
                {addingCardLoading && <Loader2Icon className="size-3 animate-spin" />}
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                disabled={addingCardLoading}
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
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground justify-start gap-1.5 cursor-pointer"
            onClick={() => setAddingCard(true)}
          >
            <PlusIcon className="size-3.5" />
            Add card
          </Button>
        </div>
      )}

      {/* WIP limit input */}
      {settingWip && (
        <div className="px-2 pb-2 flex gap-1.5 items-center">
          <Input
            type="number"
            min={1}
            value={wipValue}
            onChange={(e) => setWipValue(e.target.value)}
            placeholder="Limit (blank = none)"
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSetWipLimit()
              if (e.key === "Escape") setSettingWip(false)
            }}
            autoFocus
          />
          <Button size="sm" className="h-7 text-xs px-2" onClick={handleSetWipLimit}>
            Set
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setSettingWip(false)}>
            Cancel
          </Button>
        </div>
      )}

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive <strong>{lane.title}</strong> and all{" "}
              {lane.cards.length > 0 ? (
                <>
                  <strong>{lane.cards.length}</strong> card{lane.cards.length !== 1 ? "s" : ""} inside it.
                </>
              ) : (
                "cards inside it."
              )}{" "}
              This action cannot be undone from the board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteLane}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
