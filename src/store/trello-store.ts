import { create } from "zustand"

export interface KanbanLabel {
  text: string
  color: string
}

export interface KanbanChecklistItem {
  text: string
  checked: boolean
}

export interface KanbanAssignee {
  _id: string
  name: string
  email: string
}

export interface KanbanCard {
  id: string
  title: string
  description?: string
  labels?: KanbanLabel[]
  dueDate?: string
  checklist?: KanbanChecklistItem[]
  assigneeIds?: KanbanAssignee[]
  pipelineId: string
  projectId: string
  workspaceId: string
  position: number
}

export interface KanbanLane {
  id: string
  title: string
  color?: string
  cards: KanbanCard[]
}

interface TrelloState {
  lanes: KanbanLane[]
  setLanes: (lanes: KanbanLane[]) => void
  moveCard: (cardId: string, fromLaneId: string, toLaneId: string, toIndex: number) => void
  moveLane: (fromIndex: number, toIndex: number) => void
}

export const useTrelloStore = create<TrelloState>((set) => ({
  lanes: [],

  setLanes: (lanes) => set({ lanes }),

  moveCard: (cardId, fromLaneId, toLaneId, toIndex) =>
    set((state) => {
      const lanes = state.lanes.map((l) => ({ ...l, cards: [...l.cards] }))
      const from = lanes.find((l) => l.id === fromLaneId)
      const to = lanes.find((l) => l.id === toLaneId)
      if (!from || !to) return state

      const cardIdx = from.cards.findIndex((c) => c.id === cardId)
      if (cardIdx === -1) return state

      const [card] = from.cards.splice(cardIdx, 1)
      to.cards.splice(toIndex, 0, { ...card, pipelineId: toLaneId })

      return { lanes }
    }),

  moveLane: (fromIndex, toIndex) =>
    set((state) => {
      const lanes = [...state.lanes]
      const [lane] = lanes.splice(fromIndex, 1)
      lanes.splice(toIndex, 0, lane)
      return { lanes }
    }),
}))
