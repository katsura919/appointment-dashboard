# Trello Feature Plan

## Overview

Add a Trello-style project management system scoped to each workspace. A workspace can have multiple **Projects** (boards), each project has multiple **Pipelines** (columns/lists), and each pipeline holds **Cards** (tasks). The UI will use `react-trello` for the board rendering.

---

## Note on Drag-and-Drop

The project already has `@dnd-kit` installed. `react-trello` uses its own internal DnD. Both can coexist, but if `react-trello` ever becomes limiting (limited customization, older React support), replacing it with a custom board built on `@dnd-kit` is a natural upgrade path since the dependency is already there.

---

## Data Model

### 1. `TrelloProject` (Board)

Scoped to a workspace. A workspace can have many projects.

```ts
interface ITrelloProject {
  workspaceId: ObjectId        // ref: Workspace
  name: string
  description?: string
  color?: string               // board accent color
  createdBy: ObjectId          // ref: User
  archivedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:** `{ workspaceId: 1 }`, `{ workspaceId: 1, archivedAt: 1 }`

---

### 2. `TrelloPipeline` (Column/List)

An ordered list within a project. Users create pipelines (e.g. "To Do", "In Progress", "Done") — fully custom.

```ts
interface ITrelloPipeline {
  projectId: ObjectId          // ref: TrelloProject
  workspaceId: ObjectId        // denormalized for fast queries
  name: string
  position: number             // ordering within the board
  color?: string
  archivedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:** `{ projectId: 1, position: 1 }`, `{ workspaceId: 1 }`

---

### 3. `TrelloCard` (Task/Item)

A card lives in a pipeline. Can be moved between pipelines (drag-and-drop).

```ts
interface ITrelloCard {
  pipelineId: ObjectId         // ref: TrelloPipeline
  projectId: ObjectId          // denormalized
  workspaceId: ObjectId        // denormalized
  title: string
  description?: string
  position: number             // ordering within the pipeline
  assigneeIds: ObjectId[]      // ref: User (workspace members)
  labels: {
    text: string
    color: string
  }[]
  dueDate?: Date
  checklist: {
    text: string
    checked: boolean
  }[]
  attachments: {
    name: string
    url: string
    uploadedAt: Date
  }[]
  archivedAt?: Date
  createdBy: ObjectId          // ref: User
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:** `{ pipelineId: 1, position: 1 }`, `{ projectId: 1 }`, `{ workspaceId: 1 }`, `{ assigneeIds: 1 }`

---

## Schema Relationship

```
Workspace
  └── TrelloProject (many)
        └── TrelloPipeline (many, ordered by position)
              └── TrelloCard (many, ordered by position)
```

No changes needed to existing models (`Workspace`, `User`, etc.).

---

## API Routes

All routes are workspace-scoped. Auth middleware validates workspace membership.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/trello/projects?workspaceId=` | List all projects for a workspace |
| POST | `/api/trello/projects` | Create a project |
| PATCH | `/api/trello/projects/[id]` | Update project (name, color, etc.) |
| DELETE | `/api/trello/projects/[id]` | Archive/delete project |
| GET | `/api/trello/projects/[id]/board` | Get full board (project + pipelines + cards) — single fetch for board render |
| POST | `/api/trello/pipelines` | Create a pipeline in a project |
| PATCH | `/api/trello/pipelines/[id]` | Update pipeline (name, color) |
| PATCH | `/api/trello/pipelines/[id]/reorder` | Reorder pipeline position |
| DELETE | `/api/trello/pipelines/[id]` | Archive/delete pipeline |
| POST | `/api/trello/cards` | Create a card |
| PATCH | `/api/trello/cards/[id]` | Update card (title, description, labels, dueDate, etc.) |
| PATCH | `/api/trello/cards/[id]/move` | Move card to different pipeline / reorder position |
| DELETE | `/api/trello/cards/[id]` | Archive/delete card |

---

## Frontend Pages & Components

### New page: `/projects`

- Lists all `TrelloProject` boards for the current workspace
- "New Project" button opens a modal (name + color picker)
- Each project card links to `/projects/[id]`

### New page: `/projects/[id]`

- Full Trello board view powered by `react-trello`
- Board data fetched from `/api/trello/projects/[id]/board`
- User can:
  - Add / rename / delete pipelines (columns)
  - Add / edit / delete cards
  - Drag cards between pipelines (react-trello handles this)
  - Drag to reorder pipelines
  - Open a card detail modal (description, checklist, labels, due date, assignees)

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ProjectList` | `src/components/trello/ProjectList.tsx` | Grid of project cards on `/projects` |
| `ProjectCard` | `src/components/trello/ProjectCard.tsx` | Single board preview card |
| `TrelloBoard` | `src/components/trello/TrelloBoard.tsx` | Wraps `react-trello`, maps API data to board format |
| `CardDetailModal` | `src/components/trello/CardDetailModal.tsx` | Full card editor (description, checklist, labels, assignees, due date) |
| `AddPipelineForm` | `src/components/trello/AddPipelineForm.tsx` | Inline form to add a new column |
| `LabelPicker` | `src/components/trello/LabelPicker.tsx` | Color label selector inside card modal |

---

## `react-trello` Integration

`react-trello` expects a specific data shape:

```ts
// Board data format for react-trello
{
  lanes: [
    {
      id: string,           // pipeline._id
      title: string,        // pipeline.name
      style: { backgroundColor: pipeline.color },
      cards: [
        {
          id: string,       // card._id
          title: string,    // card.title
          description: string,
          label: string,    // due date formatted
          metadata: { ... } // extra fields for the modal
        }
      ]
    }
  ]
}
```

The `/api/trello/projects/[id]/board` endpoint returns data pre-shaped for this format (or a transformer util does the mapping client-side).

**Key `react-trello` props to use:**
- `onCardMoveAcrossLanes` → calls `/api/trello/cards/[id]/move`
- `onCardAdded` → calls `/api/trello/cards` POST
- `onCardDeleted` → calls `/api/trello/cards/[id]` DELETE
- `onLaneAdded` → calls `/api/trello/pipelines` POST
- `onCardClick` → opens `CardDetailModal`
- `editable` → enables inline add-card UI

---

## Installation

```bash
npm install react-trello
```

> `react-trello` has no TypeScript types on DefinitelyTyped. A local `src/types/react-trello.d.ts` declaration file will be needed.

---

## Implementation Steps

1. **Models** — Create `src/models/TrelloProject.ts`, `TrelloPipeline.ts`, `TrelloCard.ts`
2. **API routes** — Create all routes under `src/app/api/trello/`
3. **Install** `react-trello`, add type declarations
4. **Board transformer util** — `src/lib/trello/boardTransformer.ts` maps DB data → react-trello format
5. **Pages** — `/projects` list page and `/projects/[id]` board page
6. **Components** — `TrelloBoard`, `CardDetailModal`, `ProjectList`, etc.
7. **Navigation** — Add "Projects" link to sidebar
8. **State management** — Zustand store for optimistic updates on card moves

---

## Optimistic Updates Strategy

Card moves (drag-and-drop) should feel instant:

1. On `onCardMoveAcrossLanes`, update Zustand store immediately (optimistic)
2. Fire PATCH `/api/trello/cards/[id]/move` in background
3. On error, revert the store and show a toast (Sonner)

---

## Access Control

Reuse existing workspace role system:
- **owner / admin** — full CRUD on projects, pipelines, cards
- **member** — can create/edit cards, cannot delete projects or pipelines

---

## Out of Scope (for now)

- Card comments / activity log
- File upload for attachments (URL-only for now)
- Board sharing outside workspace
- Card subscription / notifications
