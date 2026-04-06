Trello Feature Improvement Plan
Context
The Trello/Kanban board feature is functional — it supports full CRUD for projects, pipelines, and cards, drag-and-drop reordering, Redis caching, and optimistic updates. However, a code review against the schema, API, and UI reveals four categories of issues:

UX bugs — actions that can destroy data without confirmation, invisible labels, no overdue indicators
Missing UI — the assignee field exists end-to-end in schema, API, store, and board rendering, but the CardDetailModal has no UI to manage it
Missing CRUD surfaces — projects can't be edited (only archived), archived items can't be restored
Missing power features — priority, WIP limits, board filtering, fractional positions
Phase 1 — Quick Wins (no schema changes)
1.1 Lane Delete Confirmation
Problem: handleDeleteLane() in KanbanLane.tsx fires immediately, cascading to archive every card in the pipeline. No recovery path.

Change: Add confirmOpen boolean state to KanbanLane.tsx. Replace direct onClick={handleDeleteLane} with onClick={() => setConfirmOpen(true)}. Render an AlertDialog (already exists at src/components/ui/alert-dialog.tsx) with description: "This will also archive all {lane.cards.length} cards in this pipeline." handleDeleteLane is only called on confirm.

Files: src/components/trello/KanbanLane.tsx

1.2 Overdue Date Indicator
Problem: KanbanCard.tsx renders due dates in neutral grey. No visual warning when a card is past due.

Change: Compute const isOverdue = card.dueDate && new Date(card.dueDate) < new Date(). Apply text-destructive font-medium class to the due date span when overdue (vs. existing text-muted-foreground).

Files: src/components/trello/KanbanCard.tsx

1.3 Label Pills with Text on Cards
Problem: Labels render as 6px color dots (h-1.5 w-8). Text is hidden behind title tooltip — inaccessible on touch. The label.text is already in the store type.

Change: Replace color dot with pill: <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none text-white" style={{ backgroundColor: label.color }}>. Show label.text inside. Cap at 2 labels with +N overflow badge.

Files: src/components/trello/KanbanCard.tsx

1.4 Edit Project (Rename / Recolor)
Problem: ProjectCard.tsx dropdown only has Archive. PATCH /api/trello/projects/[id] already accepts name, description, color — the API is complete, just no UI.

Change: Add "Edit" DropdownMenuItem to ProjectCard.tsx. Opens a dialog pre-populated with project fields (reuse or adapt NewProjectDialog with an initialValues prop that switches POST → PATCH). Call onEdited callback prop on success. Pass onEdited={fetchProjects} from projects/page.tsx.

Files: src/components/trello/ProjectCard.tsx, src/components/trello/NewProjectDialog.tsx, src/app/projects/page.tsx

Phase 2 — Core Missing Features
2.1 Assignee Management in CardDetailModal
Problem: assigneeIds exists in the schema, is populated in the board API (populate("assigneeIds", "name email")), flows through boardTransformer, and renders avatar stacks on KanbanCard. But CardDetailModal.tsx has no UI to manage assignees, and handleSave never sends assigneeIds in the PATCH body.

Changes:

A. Workspace members API — Check if GET /api/workspaces/[id]/members exists. If not, add a GET handler that calls requireWorkspaceAccess, then returns workspace members with name and email.

B. CardDetailModal UI — In src/components/trello/CardDetailModal.tsx:

Add assigneeIds state, initialised from card.assigneeIds in the useEffect
On modal open, fetch workspace members via the members API
Add a "Members" section in the existing sidebar (w-52 right column) below Due Date
Render each workspace member as a toggleable row with avatar initial + name. Checkmark if their _id is in current assignees
Include assigneeIds: assignees.map(a => a._id) in the handleSave PATCH body
Files: src/components/trello/CardDetailModal.tsx, src/app/api/workspaces/[id]/members/route.ts (check/create)

2.2 Card Priority Field
Problem: No priority signal exists anywhere in the stack.

Changes (all in one coordinated pass):

src/models/TrelloCard.ts — Add priority: { type: String, enum: ['urgent','high','medium','low'], default: 'medium' }
src/store/trello-store.ts — Add priority?: 'urgent' | 'high' | 'medium' | 'low' to KanbanCard interface
src/lib/trello/boardTransformer.ts — Map priority: card.priority in card mapping
src/app/api/trello/cards/route.ts — Add priority: z.enum(['urgent','high','medium','low']).optional() to CreateCardSchema
src/app/api/trello/cards/[id]/route.ts — Same addition to UpdateCardSchema
src/components/trello/CardDetailModal.tsx — Add priority Select (component exists at src/components/ui/select.tsx) in sidebar, include in handleSave
src/components/trello/KanbanCard.tsx — Render a small coloured indicator: urgent=red, high=orange, medium=omit, low=grey
2.3 Board Filter Bar
Problem: No way to surface cards by label, assignee, due status, or priority without scrolling.

Changes:

src/app/projects/[id]/page.tsx — Add filter state (activeLabels, activeAssignees, dueSoon, priority). Render a filter bar between breadcrumb and board using existing Badge, Button, Select components. Pass active filters as prop to TrelloBoard.
src/components/trello/TrelloBoard.tsx — Accept filters prop. Derive filteredLanes locally (client-side, no new API call — full board is already loaded). Keep unfiltered lanes in Zustand store for drag-and-drop context; pass filtered view to KanbanLane for display.
src/components/trello/KanbanLane.tsx — Accept optional displayCards prop override for filtered rendering while DnD still uses lane.cards.
Note: Implement after 2.1 (need member list) and 2.2 (need priority values).

2.4 Archived Items Restore View
Problem: Once archived (archivedAt set), cards/pipelines are gone with no recovery.

Changes:

src/app/api/trello/projects/[id]/board/route.ts — Support ?archived=true query param: switch from archivedAt: null to { archivedAt: { $ne: null } } filter
src/app/api/trello/cards/[id]/route.ts — On PATCH with { restore: true }, set card.archivedAt = undefined and save
src/app/api/trello/pipelines/[id]/route.ts — Same restore action
src/app/projects/[id]/page.tsx — Add "Archived" toggle in board header. When active, fetch ?archived=true and render a read-only list (not live DnD board) of archived items with "Restore" buttons
Phase 3 — Polish & Power
3.1 Project Search (Projects Page)
Change: Add query state to src/app/projects/page.tsx. Render search Input in header row. Derive filteredProjects client-side — all projects already fetched. Zero API changes.

Files: src/app/projects/page.tsx

3.2 WIP Limits on Pipelines
Changes:

src/models/TrelloPipeline.ts — Add wipLimit?: number
src/store/trello-store.ts — Add wipLimit?: number to KanbanLane
src/lib/trello/boardTransformer.ts — Map wipLimit
src/app/api/trello/pipelines/[id]/route.ts — Add wipLimit: z.number().int().min(1).optional() to update schema
src/components/trello/KanbanLane.tsx — When lane.wipLimit set and lane.cards.length >= lane.wipLimit, colour the card count badge destructive + tooltip. Add "Set WIP limit" to existing dropdown that opens a number input.
3.3 Fractional Position Ordering (Performance)
Problem: Current integer-shifting in move/reorder endpoints issues updateMany that touches every sibling — O(n) writes per drag on large boards.

Change: Replace bulk-shift logic in both move endpoints with midpoint-insertion. Fetch only 2 neighbouring position values, compute newPos = (prev + next) / 2, update only the moved item. On collision (delta < 0.001), trigger one-time renumber of all siblings. Update position Zod schema from z.number().int() to z.number(). Update TrelloBoard.tsx's persistCardMove and persistLaneReorder to pass fractional positions.

Files: src/app/api/trello/cards/[id]/move/route.ts, src/app/api/trello/pipelines/[id]/reorder/route.ts, src/components/trello/TrelloBoard.tsx

⚠️ Highest-risk change in Phase 3. Do in a single coordinated PR, test all drag scenarios.

3.4 Card Cover Color
Changes:

src/models/TrelloCard.ts — Add coverColor?: string
src/store/trello-store.ts — Add coverColor?: string to KanbanCard
src/lib/trello/boardTransformer.ts — Map coverColor
src/app/api/trello/cards/[id]/route.ts — Add coverColor: z.string().optional() to UpdateCardSchema
src/components/trello/KanbanCard.tsx — When card.coverColor set, render a full-width color band at card top: <div className="h-8 rounded-t-lg -mx-3 -mt-2.5 mb-2">
src/components/trello/CardDetailModal.tsx — Add "Cover" color picker in sidebar
Implementation Order & Effort
#	Item	Effort	Dependencies
1.1	Lane delete confirmation	30 min	—
1.2	Overdue date indicator	15 min	—
1.3	Label pills with text	20 min	—
1.4	Edit project	45 min	—
2.1	Assignee management	2 h	—
2.2	Priority field	2 h	—
2.3	Filter bar	2.5 h	2.1, 2.2
2.4	Archived items restore	3 h	—
3.1	Project search	20 min	—
3.2	WIP limits	1.5 h	—
3.3	Fractional positions	3 h	—
3.4	Card cover color	1 h	—
Verification
After each phase:

Phase 1: Manually test lane deletion (confirm dialog appears, cancel works, confirm archives cascade), drag a card past its due date and verify red indicator, check label text visible on card, edit a project and verify name/color persist.
Phase 2: Open a card modal, add/remove assignees, save, re-open and verify assignees are persisted; create a card with priority, verify indicator on card and in modal; use filter bar to filter by label and verify correct cards show while DnD still works correctly; archive and restore a card.
Phase 3: Search for a project by name; set WIP limit and fill a pipeline past the limit (badge turns red); drag multiple cards rapidly and verify positions are correct after page reload.