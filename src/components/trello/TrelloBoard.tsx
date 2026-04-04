"use client"

import * as React from "react"
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

interface Props {
  projectId: string
  workspaceId: string
  apiData: BoardApiResponse
  onBoardChanged: (silent?: boolean) => void
}

export function TrelloBoard({ projectId, workspaceId, apiData, onBoardChanged }: Props) {
  const { lanes, setLanes, moveCard, moveLane } = useTrelloStore()

  const [activeCard, setActiveCard] = React.useState<KanbanCardType | null>(null)
  const [activeLane, setActiveLane] = React.useState<KanbanLaneType | null>(null)
  const [selectedCard, setSelectedCard] = React.useState<CardDetail | null>(null)
  const [cardModalOpen, setCardModalOpen] = React.useState(false)
  const [addingLane, setAddingLane] = React.useState(false)
  const [newLaneName, setNewLaneName] = React.useState("")
  const addLaneInputRef = React.useRef<HTMLInputElement>(null)

  // Snapshot for optimistic revert
  const lanesSnapshot = React.useRef<KanbanLaneType[]>([])

  React.useEffect(() => {
    setLanes(toLanes(apiData))
  }, [apiData, setLanes])

  React.useEffect(() => {
    if (addingLane) addLaneInputRef.current?.focus()
  }, [addingLane])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // ── helpers ──────────────────────────────────────────────────────────────

  function findLaneByCardId(cardId: string) {
    return lanes.find((l) => l.cards.some((c) => c.id === cardId))
  }

  function findLaneById(laneId: string) {
    return lanes.find((l) => l.id === laneId)
  }

  // ── drag handlers ─────────────────────────────────────────────────────────

  function onDragStart({ active }: DragStartEvent) {
    lanesSnapshot.current = lanes.map((l) => ({ ...l, cards: [...l.cards] }))
    const data = active.data.current
    if (data?.type === "card") setActiveCard(data.card)
    if (data?.type === "lane") setActiveLane(findLaneById(active.id as string) ?? null)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return
    const activeData = active.data.current
    if (activeData?.type !== "card") return

    const activeCard = activeData.card as KanbanCardType
    const fromLane = findLaneByCardId(active.id as string)
    if (!fromLane) return

    // Determine target lane
    let toLaneId: string
    let toIndex: number

    const overData = over.data.current
    if (overData?.type === "card") {
      const toLane = findLaneByCardId(over.id as string)
      if (!toLane) return
      toLaneId = toLane.id
      toIndex = toLane.cards.findIndex((c) => c.id === over.id)
    } else if (over.id.toString().startsWith("droppable-")) {
      toLaneId = over.id.toString().replace("droppable-", "")
      const toLane = findLaneById(toLaneId)
      if (!toLane) return
      toIndex = toLane.cards.length
    } else {
      // Dragging over a lane header — move to end of that lane
      toLaneId = over.id as string
      const toLane = findLaneById(toLaneId)
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

    if (!over || active.id === over.id) return
    const activeData = active.data.current

    if (activeData?.type === "lane") {
      const fromIdx = lanes.findIndex((l) => l.id === active.id)
      const toIdx = lanes.findIndex((l) => l.id === over.id)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return

      moveLane(fromIdx, toIdx)
      persistLaneReorder(active.id as string, toIdx).catch(() => {
        setLanes(lanesSnapshot.current)
        toast.error("Failed to reorder columns")
      })
      return
    }

    if (activeData?.type === "card") {
      const toLane = findLaneByCardId(active.id as string)
      if (!toLane) return

      const toIndex = toLane.cards.findIndex((c) => c.id === active.id)
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
      pipelineId: card.pipelineId,
      workspaceId: card.workspaceId,
    })
    setCardModalOpen(true)
  }

  // ── lane name update (from child) ─────────────────────────────────────────

  function handleLaneRenamed(laneId: string, newName: string) {
    setLanes(lanes.map((l) => (l.id === laneId ? { ...l, title: newName } : l)))
  }

  const laneIds = lanes.map((l) => l.id)

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
            {lanes.map((lane) => (
              <KanbanLane
                key={lane.id}
                lane={lane}
                workspaceId={workspaceId}
                onCardClick={handleCardClick}
                onCardAdded={() => onBoardChanged(true)}
                onLaneDeleted={() => onBoardChanged(true)}
                onLaneRenamed={(name) => handleLaneRenamed(lane.id, name)}
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
