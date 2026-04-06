"use client"

import { useEffect, useRef, useState } from "react"

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  closestCorners,
} from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { toast } from "sonner"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { KanbanLane } from "@/components/trello/KanbanLane"
import { KanbanCard } from "@/components/trello/KanbanCard"
import { CardDetailModal, type CardDetail } from "@/components/trello/CardDetailModal"
import { useTrelloStore, type KanbanCard as KanbanCardType, type KanbanLane as KanbanLaneType } from "@/store/trello-store"
import { toLanes, type BoardApiResponse } from "@/lib/trello/boardTransformer"

export interface BoardFilters {
  priority: string
  activeLabels: string[]
  activeAssignees: string[]
  dueSoon: boolean
}

interface Props {
  projectId: string
  workspaceId: string
  apiData: BoardApiResponse
  onBoardChanged: (silent?: boolean) => void
  filters?: BoardFilters
}

export function TrelloBoard({ projectId, workspaceId, apiData, onBoardChanged, filters }: Props) {
  const { lanes, setLanes, moveCard, moveLane } = useTrelloStore()

  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null)
  const [activeLane, setActiveLane] = useState<KanbanLaneType | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null)
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [addingLane, setAddingLane] = useState(false)
  const [newLaneName, setNewLaneName] = useState("")
  const addLaneInputRef = useRef<HTMLInputElement>(null)

  // Snapshot for optimistic revert
  const lanesSnapshot = useRef<KanbanLaneType[]>([])

  useEffect(() => {
    setLanes(toLanes(apiData))
  }, [apiData, setLanes])

  useEffect(() => {
    if (addingLane) addLaneInputRef.current?.focus()
  }, [addingLane])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // ── helpers — always read live store state, never the render closure ────────

  function getLanes() {
    return useTrelloStore.getState().lanes
  }

  function findLaneByCardId(cardId: string, currentLanes = getLanes()) {
    return currentLanes.find((l) => l.cards.some((c) => c.id === cardId))
  }

  function findLaneById(laneId: string, currentLanes = getLanes()) {
    return currentLanes.find((l) => l.id === laneId)
  }

  // ── drag handlers ─────────────────────────────────────────────────────────

  function onDragStart({ active }: DragStartEvent) {
    const current = getLanes()
    lanesSnapshot.current = current.map((l) => ({ ...l, cards: [...l.cards] }))
    const data = active.data.current
    if (data?.type === "card") setActiveCard(data.card)
    if (data?.type === "lane") setActiveLane(findLaneById(active.id as string, current) ?? null)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return
    const activeData = active.data.current
    if (activeData?.type !== "card") return

    // Always read the live store — avoids stale closure after previous moveCard calls
    const current = getLanes()
    const fromLane = findLaneByCardId(active.id as string, current)
    if (!fromLane) return

    let toLaneId: string
    let toIndex: number

    const overData = over.data.current
    if (overData?.type === "card") {
      const toLane = findLaneByCardId(over.id as string, current)
      if (!toLane) return
      toLaneId = toLane.id
      toIndex = toLane.cards.findIndex((c) => c.id === over.id)
    } else if (over.id.toString().startsWith("droppable-")) {
      toLaneId = over.id.toString().replace("droppable-", "")
      const toLane = findLaneById(toLaneId, current)
      if (!toLane) return
      toIndex = toLane.cards.length
    } else {
      toLaneId = over.id as string
      const toLane = findLaneById(toLaneId, current)
      if (!toLane) return
      toIndex = toLane.cards.length
    }

    if (fromLane.id === toLaneId) {
      const currentIdx = fromLane.cards.findIndex((c) => c.id === active.id)
      if (currentIdx === toIndex) return
    }

    moveCard(active.id as string, fromLane.id, toLaneId, toIndex)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null)
    setActiveLane(null)

    const activeData = active.data.current

    // If dropped outside any droppable → revert
    if (!over) {
      setLanes(lanesSnapshot.current)
      return
    }

    // Read the final post-optimistic state from the store (never use stale closure)
    const current = getLanes()

    // ── Lane reorder ──────────────────────────────────────────────────────────
    if (activeData?.type === "lane") {
      // Resolve the target lane id — over.id may be "droppable-{laneId}" when
      // the drag ends over the cards body area instead of the lane header.
      const rawOverId = over.id.toString()
      const overLaneId = rawOverId.startsWith("droppable-")
        ? rawOverId.replace("droppable-", "")
        : rawOverId

      if (active.id === overLaneId) return

      const fromIdx = current.findIndex((l) => l.id === active.id)
      const toIdx = current.findIndex((l) => l.id === overLaneId)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return

      moveLane(fromIdx, toIdx)
      persistLaneReorder(active.id as string, toIdx).catch(() => {
        setLanes(lanesSnapshot.current)
        toast.error("Failed to reorder columns")
      })
      return
    }

    // ── Card move ─────────────────────────────────────────────────────────────
    if (activeData?.type === "card") {
      // Find where the card ended up after all the onDragOver moves
      const toLane = findLaneByCardId(active.id as string, current)
      if (!toLane) {
        setLanes(lanesSnapshot.current)
        return
      }
      const toIndex = toLane.cards.findIndex((c) => c.id === active.id)

      // Compare with pre-drag snapshot — skip API call only if truly unchanged
      const snapLane = lanesSnapshot.current.find((l) =>
        l.cards.some((c) => c.id === active.id)
      )
      const snapIndex = snapLane?.cards.findIndex((c) => c.id === active.id) ?? -1

      if (snapLane?.id === toLane.id && snapIndex === toIndex) return

      persistCardMove(active.id as string, toLane.id, toIndex).catch(() => {
        setLanes(lanesSnapshot.current)
        toast.error("Failed to move card — reverting")
      })
    }
  }

  function onDragCancel() {
    setActiveCard(null)
    setActiveLane(null)
    setLanes(lanesSnapshot.current)
  }

  // ── persistence ───────────────────────────────────────────────────────────

  async function persistCardMove(cardId: string, pipelineId: string, position: number) {
    const res = await fetch(`/api/trello/cards/${cardId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
      body: JSON.stringify({ pipelineId, position }),
    })
    if (!res.ok) throw new Error()
  }

  async function persistLaneReorder(laneId: string, position: number) {
    const res = await fetch(`/api/trello/pipelines/${laneId}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
      body: JSON.stringify({ position }),
    })
    if (!res.ok) throw new Error()
  }

  // ── add lane ──────────────────────────────────────────────────────────────

  async function handleAddLane() {
    if (!newLaneName.trim()) return
    try {
      const res = await fetch("/api/trello/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
        body: JSON.stringify({ projectId, name: newLaneName.trim() }),
      })
      if (!res.ok) throw new Error()
      setNewLaneName("")
      setAddingLane(false)
      onBoardChanged(true)
    } catch {
      toast.error("Failed to add pipeline")
    }
  }

  // ── card click ────────────────────────────────────────────────────────────

  function handleCardClick(card: KanbanCardType) {
    setSelectedCard({
      id: card.id,
      title: card.title,
      description: card.description,
      dueDate: card.dueDate,
      labels: card.labels,
      checklist: card.checklist,
      assigneeIds: card.assigneeIds,
      priority: card.priority,
      coverColor: card.coverColor,
      pipelineId: card.pipelineId,
      workspaceId: card.workspaceId,
    })
    setCardModalOpen(true)
  }

  // ── lane name update (from child) ─────────────────────────────────────────

  function handleLaneRenamed(laneId: string, newName: string) {
    setLanes(getLanes().map((l) => (l.id === laneId ? { ...l, title: newName } : l)))
  }

  const laneIds = lanes.map((l) => l.id)

  // Derive filtered card lists (client-side; DnD still uses full lane.cards)
  const filteredLanes = filters
    ? lanes.map((lane) => ({
        ...lane,
        displayCards: lane.cards.filter((card) => {
          if (filters.priority && card.priority !== filters.priority) return false
          if (filters.dueSoon && (!card.dueDate || new Date(card.dueDate) >= new Date())) return false
          if (
            filters.activeLabels.length > 0 &&
            !filters.activeLabels.some((lbl) => card.labels?.some((l) => l.text === lbl))
          )
            return false
          if (
            filters.activeAssignees.length > 0 &&
            !filters.activeAssignees.some((id) =>
              card.assigneeIds?.some((a) => a._id === id)
            )
          )
            return false
          return true
        }),
      }))
    : lanes.map((lane) => ({ ...lane, displayCards: lane.cards }))

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 items-start">
          <SortableContext items={laneIds} strategy={horizontalListSortingStrategy}>
            {filteredLanes.map((lane) => (
              <KanbanLane
                key={lane.id}
                lane={lane}
                displayCards={lane.displayCards}
                workspaceId={workspaceId}
                onCardClick={handleCardClick}
                onCardAdded={() => onBoardChanged(true)}
                onLaneDeleted={() => onBoardChanged(true)}
                onLaneRenamed={(name) => handleLaneRenamed(lane.id, name)}
                onLaneUpdated={() => onBoardChanged(true)}
              />
            ))}
          </SortableContext>

          {/* Add lane */}
          <div className="w-72 shrink-0">
            {addingLane ? (
              <div className="rounded-xl bg-muted/60 border border-border/50 p-2 space-y-1.5">
                <Input
                  ref={addLaneInputRef}
                  value={newLaneName}
                  onChange={(e) => setNewLaneName(e.target.value)}
                  placeholder="Pipeline name"
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddLane()
                    if (e.key === "Escape") { setAddingLane(false); setNewLaneName("") }
                  }}
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs" onClick={handleAddLane} disabled={!newLaneName.trim()}>
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => { setAddingLane(false); setNewLaneName("") }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-10 gap-2 border-dashed text-muted-foreground hover:text-foreground"
                onClick={() => setAddingLane(true)}
              >
                <PlusIcon className="size-4" />
                Add Pipeline
              </Button>
            )}
          </div>
        </div>

        {/* Drag overlay — shows ghost while dragging */}
        <DragOverlay>
          {activeCard && <KanbanCard card={activeCard} onClick={() => {}} overlay />}
          {activeLane && (
            <div className="w-72 rounded-xl bg-muted/80 border border-border shadow-xl opacity-90">
              <div className="px-3 py-2.5 text-sm font-semibold border-b border-border/40">
                {activeLane.title}
              </div>
              <div className="p-2 space-y-2">
                {activeLane.cards.slice(0, 3).map((c) => (
                  <div key={c.id} className="bg-card border rounded-lg px-3 py-2 text-sm opacity-60">
                    {c.title}
                  </div>
                ))}
                {activeLane.cards.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{activeLane.cards.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <CardDetailModal
        card={selectedCard}
        open={cardModalOpen}
        onOpenChange={setCardModalOpen}
        onUpdated={() => onBoardChanged(true)}
        onDeleted={() => onBoardChanged(true)}
      />
    </>
  )
}
