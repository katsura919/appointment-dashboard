"use client"

import * as React from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  CheckSquareIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  TrashIcon,
  PlusIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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

export function CardDetailModal({ card, open, onOpenChange, onUpdated, onDeleted }: Props) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [dueDate, setDueDate] = React.useState("")
  const [labels, setLabels] = React.useState<{ text: string; color: string }[]>([])
  const [checklist, setChecklist] = React.useState<{ text: string; checked: boolean }[]>([])
  const [newChecklistItem, setNewChecklistItem] = React.useState("")
  const [newLabelText, setNewLabelText] = React.useState("")
  const [newLabelColor, setNewLabelColor] = React.useState(LABEL_COLORS[0].color)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description ?? "")
      setDueDate(card.dueDate ? format(new Date(card.dueDate), "yyyy-MM-dd") : "")
      setLabels(card.labels ?? [])
      setChecklist(card.checklist ?? [])
    }
  }, [card])

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-semibold border-0 p-0 h-auto focus-visible:ring-0 shadow-none"
              placeholder="Card title"
            />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Description */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
              <CalendarIcon className="size-3.5" />
              Due Date
            </Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
              <TagIcon className="size-3.5" />
              Labels
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label, idx) => (
                <Badge
                  key={idx}
                  style={{ backgroundColor: label.color, color: "#fff" }}
                  className="cursor-pointer gap-1 border-0"
                  onClick={() => removeLabel(idx)}
                >
                  {label.text}
                  <span className="text-white/70">×</span>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newLabelText}
                onChange={(e) => setNewLabelText(e.target.value)}
                placeholder="Label text"
                className="flex-1 h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && addLabel()}
              />
              <div className="flex gap-1">
                {LABEL_COLORS.map(({ color }) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewLabelColor(color)}
                    className="size-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: newLabelColor === color ? "white" : "transparent",
                      outline: newLabelColor === color ? `2px solid ${color}` : "none",
                    }}
                  />
                ))}
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addLabel}>
                <PlusIcon className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
              <CheckSquareIcon className="size-3.5" />
              Checklist {checklist.length > 0 && `(${completedCount}/${checklist.length})`}
            </Label>

            {checklist.length > 0 && (
              <div className="space-y-1">
                {checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggleChecklistItem(idx)}
                    />
                    <span className={`flex-1 text-sm ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                      {item.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 opacity-0 group-hover:opacity-100"
                      onClick={() => removeChecklistItem(idx)}
                    >
                      <TrashIcon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="Add item..."
                className="flex-1 h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
              />
              <Button type="button" size="sm" variant="outline" onClick={addChecklistItem}>
                <PlusIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <TrashIcon className="size-4 mr-1" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
