import type { KanbanLane, KanbanCard } from "@/store/trello-store"
import type { ITrelloPipeline } from "@/models/TrelloPipeline"
import type { ITrelloCard } from "@/models/TrelloCard"

export interface BoardApiResponse {
  pipelines: (ITrelloPipeline & { _id: string })[]
  cards: (ITrelloCard & {
    _id: string
    assigneeIds: { _id: string; name: string; email: string }[]
  })[]
}

export function toLanes(data: BoardApiResponse): KanbanLane[] {
  if (!data?.pipelines || !data?.cards) return []
  const cardsByPipeline = new Map<string, KanbanCard[]>()
  for (const pipeline of data.pipelines) {
    cardsByPipeline.set(pipeline._id.toString(), [])
  }

  for (const card of data.cards) {
    const pipelineId = card.pipelineId.toString()
    const bucket = cardsByPipeline.get(pipelineId)
    if (!bucket) continue
    bucket.push({
      id: card._id.toString(),
      title: card.title,
      description: card.description,
      labels: card.labels,
      dueDate: card.dueDate ? new Date(card.dueDate).toISOString() : undefined,
      checklist: card.checklist,
      assigneeIds: card.assigneeIds,
      priority: card.priority,
      coverColor: card.coverColor,
      pipelineId,
      projectId: card.projectId.toString(),
      workspaceId: card.workspaceId.toString(),
      position: card.position,
    })
  }

  return data.pipelines.map((pipeline) => ({
    id: pipeline._id.toString(),
    title: pipeline.name,
    color: pipeline.color,
    wipLimit: pipeline.wipLimit,
    cards: cardsByPipeline.get(pipeline._id.toString()) ?? [],
  }))
}
