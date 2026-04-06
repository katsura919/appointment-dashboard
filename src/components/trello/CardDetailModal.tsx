"use client"

import { useEffect, useState } from "react"

import { toast } from "sonner"
import { format } from "date-fns"
import {
  CheckSquareIcon,
  TagIcon,
  CalendarIcon,
  TrashIcon,
  PlusIcon,
  AlignLeftIcon,
  Loader2Icon,
  UsersIcon,
  CheckIcon,
  FlagIcon,
  SwatchBookIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

const LABEL_COLORS = [
  { color: "#ef4444", label: "Red" },
  { color: "#f97316", label: "Orange" },
  { color: "#eab308", label: "Yellow" },
  { color: "#22c55e", label: "Green" },
  { color: "#3b82f6", label: "Blue" },
  { color: "#8b5cf6", label: "Purple" },
  { color: "#64748b", label: "Gray" },
]

export interface CardDetail {
  id: string
  title: string
  description?: string
  dueDate?: string
  labels?: { text: string; color: string }[]
  checklist?: { text: string; checked: boolean }[]
  assigneeIds?: { _id: string; name: string; email: string }[]
  priority?: string
  coverColor?: string
  pipelineId: string
  workspaceId: string
}

interface Props {
  card: CardDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
  onDeleted: () => void
}

interface WorkspaceMember {
  userId: string
  name: string
  email: string
  role: string
}

export function CardDetailModal({ card, open, onOpenChange, onUpdated, onDeleted }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [labels, setLabels] = useState<{ text: string; color: string }[]>([])
  const [checklist, setChecklist] = useState<{ text: string; checked: boolean }[]>([])
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [priority, setPriority] = useState<string>("")
  const [coverColor, setCoverColor] = useState<string>("")
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState("")
  const [newLabelText, setNewLabelText] = useState("")
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].color)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description ?? "")
      setDueDate(card.dueDate ? format(new Date(card.dueDate), "yyyy-MM-dd") : "")
      setLabels(card.labels ?? [])
      setChecklist(card.checklist ?? [])
      setAssigneeIds(card.assigneeIds?.map((a) => a._id) ?? [])
      setPriority(card.priority ?? "")
      setCoverColor(card.coverColor ?? "")
    }
  }, [card])

  // Fetch workspace members when modal opens
  useEffect(() => {
    if (!open || !card) return
    fetch(`/api/workspaces/${card.workspaceId}/members`)
      .then((r) => r.json())
      .then((data) => setWorkspaceMembers(data.members ?? []))
      .catch(() => {})
  }, [open, card])

  if (!card) return null

  async function handleSave() {
    if (!card) return
    setSaving(true)
    try {
      const res = await fetch(`/api/trello/cards/${card.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": card.workspaceId,
        },
        body: JSON.stringify({
          title,
          description: description || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          labels,
          checklist,
          assigneeIds,
          ...(priority ? { priority } : {}),
          coverColor: coverColor || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Card updated")
      onUpdated()
      onOpenChange(false)
    } catch {
      toast.error("Failed to save card")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!card) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/trello/cards/${card.id}`, {
        method: "DELETE",
        headers: { "x-workspace-id": card.workspaceId },
      })
      if (!res.ok) throw new Error()
      toast.success("Card deleted")
      onDeleted()
      onOpenChange(false)
    } catch {
      toast.error("Failed to delete card")
    } finally {
      setDeleting(false)
    }
  }

  function addChecklistItem() {
    if (!newChecklistItem.trim()) return
    setChecklist((prev) => [...prev, { text: newChecklistItem.trim(), checked: false }])
    setNewChecklistItem("")
  }

  function toggleChecklistItem(idx: number) {
    setChecklist((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, checked: !item.checked } : item))
    )
  }

  function removeChecklistItem(idx: number) {
    setChecklist((prev) => prev.filter((_, i) => i !== idx))
  }

  function addLabel() {
    if (!newLabelText.trim()) return
    setLabels((prev) => [...prev, { text: newLabelText.trim(), color: newLabelColor }])
    setNewLabelText("")
  }

  function removeLabel(idx: number) {
    setLabels((prev) => prev.filter((_, i) => i !== idx))
  }

  const completedCount = checklist.filter((i) => i.checked).length
  const checklistProgress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Title area */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogTitle asChild>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-semibold border-0 px-0 h-auto focus-visible:ring-0 shadow-none bg-transparent"
              placeholder="Card title"
            />
          </DialogTitle>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-y-auto min-h-0">
          {/* Main content */}
          <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">
            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <AlignLeftIcon className="size-3.5" />
                Description
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a more detailed description..."
                rows={4}
                className="resize-none text-sm"
              />
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <CheckSquareIcon className="size-3.5" />
                  Checklist
                  {checklist.length > 0 && (
                    <span className="normal-case tracking-normal font-normal text-muted-foreground">
                      {completedCount}/{checklist.length}
                    </span>
                  )}
                </div>
              </div>

              {checklist.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-7 text-right shrink-0">
                      {checklistProgress}%
                    </span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${checklistProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    {checklist.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 py-1 px-2 rounded-md group hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => toggleChecklistItem(idx)}
                        />
                        <span
                          className={`flex-1 text-sm ${item.checked ? "line-through text-muted-foreground" : ""}`}
                        >
                          {item.text}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={() => removeChecklistItem(idx)}
                        >
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add an item..."
                  className="flex-1 h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addChecklistItem}
                >
                  <PlusIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-52 shrink-0 border-l bg-muted/20 px-4 py-5 space-y-5">
            {/* Priority */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <FlagIcon className="size-3.5" />
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="No priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">⚪ Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Members */}
            {workspaceMembers.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <UsersIcon className="size-3.5" />
                  Members
                </Label>
                <div className="space-y-1">
                  {workspaceMembers.map((m) => {
                    const selected = assigneeIds.includes(m.userId)
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() =>
                          setAssigneeIds((prev) =>
                            selected ? prev.filter((id) => id !== m.userId) : [...prev, m.userId]
                          )
                        }
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors text-sm ${
                          selected
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <span className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold uppercase shrink-0">
                          {m.name[0]}
                        </span>
                        <span className="flex-1 truncate text-xs">{m.name}</span>
                        {selected && <CheckIcon className="size-3 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Due Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <CalendarIcon className="size-3.5" />
                Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Labels */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <TagIcon className="size-3.5" />
                Labels
              </Label>

              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {labels.map((label, idx) => (
                    <Badge
                      key={idx}
                      style={{ backgroundColor: label.color, color: "#fff" }}
                      className="cursor-pointer gap-1 border-0 text-xs"
                      onClick={() => removeLabel(idx)}
                    >
                      {label.text}
                      <span className="text-white/70 leading-none">×</span>
                    </Badge>
                  ))}
                </div>
              )}

              <Input
                value={newLabelText}
                onChange={(e) => setNewLabelText(e.target.value)}
                placeholder="Label name"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && addLabel()}
              />

              <div className="flex items-center gap-1 flex-wrap">
                {LABEL_COLORS.map(({ color }) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewLabelColor(color)}
                    className="size-5 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        newLabelColor === color ? "white" : "transparent",
                      outline:
                        newLabelColor === color ? `2px solid ${color}` : "none",
                    }}
                  />
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs"
                onClick={addLabel}
              >
                <PlusIcon className="size-3" />
                Add label
              </Button>
            </div>

            {/* Cover Color */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <SwatchBookIcon className="size-3.5" />
                Cover
              </Label>
              <div className="flex items-center gap-1 flex-wrap">
                {LABEL_COLORS.map(({ color }) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCoverColor(coverColor === color ? "" : color)}
                    className="size-5 rounded border-2 transition-transform hover:scale-110 cursor-pointer"
                    style={{
                      backgroundColor: color,
                      borderColor: coverColor === color ? "white" : "transparent",
                      outline: coverColor === color ? `2px solid ${color}` : "none",
                    }}
                  />
                ))}
                {coverColor && (
                  <button
                    type="button"
                    onClick={() => setCoverColor("")}
                    className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                  >
                    Clear
                  </button>
                )}
              </div>
              {coverColor && (
                <div
                  className="h-6 w-full rounded"
                  style={{ backgroundColor: coverColor }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t flex items-center justify-between bg-background">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            onClick={handleDelete}
            disabled={deleting || saving}
          >
            {deleting ? (
              <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <TrashIcon className="size-3.5 mr-1.5" />
            )}
            {deleting ? "Deleting..." : "Delete"}
          </Button>
          <div className="flex gap-2">
            <Button
              className="cursor-pointer"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving || deleting}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              size="sm"
              onClick={handleSave}
              disabled={saving || deleting || !title.trim()}
            >
              {saving ? (
                <>
                  <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
