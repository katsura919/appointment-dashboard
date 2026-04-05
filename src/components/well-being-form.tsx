"use client"

import { FormEvent, useState } from "react"

import { fromZonedTime, format as formatTz } from "date-fns-tz"
import { toast } from "sonner"
import {
  Brain,
  Zap,
  Activity,
  Droplets,
  Moon,
  Smile,
  Wind,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { WellBeingLogResponse } from "@/lib/types"

interface WellBeingFormProps {
  workspaceId: string
  timezone: string
  onSuccess?: () => void
  onCancel?: () => void
  log?: WellBeingLogResponse
}

// ─── Colour maps ──────────────────────────────────────────────────────────────
// "positive": 1 = bad → 5 = good   (mood, energy, activity, hydration, sleep quality)
// "negative": 1 = good → 5 = bad   (stress)
const POS: Record<number, string> = {
  1: "bg-red-500 border-red-500 text-white",
  2: "bg-orange-500 border-orange-500 text-white",
  3: "bg-yellow-400 border-yellow-400 text-black",
  4: "bg-lime-500 border-lime-500 text-white",
  5: "bg-emerald-500 border-emerald-500 text-white",
}
const NEG: Record<number, string> = {
  1: "bg-emerald-500 border-emerald-500 text-white",
  2: "bg-lime-500 border-lime-500 text-white",
  3: "bg-yellow-400 border-yellow-400 text-black",
  4: "bg-orange-500 border-orange-500 text-white",
  5: "bg-red-500 border-red-500 text-white",
}

const POS_LABELS = ["Terrible", "Bad", "Okay", "Good", "Amazing"]
const STRESS_LABELS = ["Very Low", "Low", "Moderate", "High", "Very High"]
const ENERGY_LABELS = ["Exhausted", "Low", "Decent", "High", "Energized"]
const ACTIVITY_LABELS = ["Sedentary", "Light", "Moderate", "Active", "Very Active"]
const HYDRATION_LABELS = ["Dehydrated", "Poor", "Okay", "Good", "Excellent"]
const SLEEP_Q_LABELS = ["Terrible", "Poor", "Okay", "Good", "Excellent"]

// ─── Rating Row ───────────────────────────────────────────────────────────────
function RatingRow({
  label,
  icon: Icon,
  value,
  setValue,
  labels,
  colorMap = POS,
}: {
  label: string
  icon: React.ElementType
  value: number
  setValue: (v: number) => void
  labels: string[]
  colorMap?: Record<number, string>
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full border",
          value ? colorMap[value] : "bg-muted text-muted-foreground border-transparent"
        )}>
          {value ? labels[value - 1] : "—"}
        </span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            className={cn(
              "flex-1 h-9 rounded-lg border-2 text-sm font-semibold transition-all",
              value === n
                ? colorMap[n]
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────
export function WellBeingForm({ workspaceId, timezone, onSuccess, onCancel, log }: WellBeingFormProps) {
  const isEditing = !!log

  const [saving, setSaving] = useState(false)
  const [moodScore, setMoodScore] = useState(log?.metrics.moodScore ?? 3)
  const [stressLevel, setStressLevel] = useState(log?.metrics.stressLevel ?? 3)
  const [energyLevel, setEnergyLevel] = useState(log?.metrics.energyLevel ?? 3)
  const [activityLevel, setActivityLevel] = useState(log?.metrics.activityLevel ?? 3)
  const [hydrationScore, setHydrationScore] = useState(log?.metrics.hydrationScore ?? 3)
  const [sleepQuality, setSleepQuality] = useState(log?.metrics.sleepQuality ?? 3)
  const [sleepHours, setSleepHours] = useState(String(log?.metrics.sleepHours ?? 7))
  const [tagsInput, setTagsInput] = useState(log?.tags?.join(", ") ?? "")
  const [notes, setNotes] = useState(log?.notes ?? "")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)

    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean)

    const todayInTz = formatTz(new Date(), "yyyy-MM-dd", { timeZone: timezone })
    const date = fromZonedTime(`${todayInTz}T00:00:00`, timezone).toISOString()

    const payload = {
      date: isEditing ? log.date : date,
      tags,
      notes: notes.trim() || undefined,
      metrics: {
        moodScore,
        stressLevel,
        energyLevel,
        activityLevel,
        hydrationScore,
        sleepQuality,
        sleepHours: Number(sleepHours) || 0,
      },
    }

    try {
      const url = isEditing ? `/api/well-being/${log._id}` : "/api/well-being"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success(isEditing ? "Log updated!" : "Well-being log saved!")
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save log:", error)
      toast.error("Failed to save your log. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {/* ── Mental ─────────────────────────────────────────────────────────── */}
      <Section title="Mental">
        <RatingRow label="Mood" icon={Smile} value={moodScore} setValue={setMoodScore} labels={POS_LABELS} />
        <RatingRow label="Stress Level" icon={Brain} value={stressLevel} setValue={setStressLevel} labels={STRESS_LABELS} colorMap={NEG} />
      </Section>

      <div className="border-t" />

      {/* ── Physical ───────────────────────────────────────────────────────── */}
      <Section title="Physical">
        <RatingRow label="Energy" icon={Zap} value={energyLevel} setValue={setEnergyLevel} labels={ENERGY_LABELS} />
        <RatingRow label="Activity Level" icon={Activity} value={activityLevel} setValue={setActivityLevel} labels={ACTIVITY_LABELS} />
        <RatingRow label="Hydration" icon={Droplets} value={hydrationScore} setValue={setHydrationScore} labels={HYDRATION_LABELS} />
      </Section>

      <div className="border-t" />

      {/* ── Sleep ──────────────────────────────────────────────────────────── */}
      <Section title="Sleep">
        <RatingRow label="Sleep Quality" icon={Moon} value={sleepQuality} setValue={setSleepQuality} labels={SLEEP_Q_LABELS} />
        <div className="flex items-center gap-3">
          <Wind className="size-4 text-muted-foreground shrink-0" />
          <Label className="text-sm font-medium whitespace-nowrap">Hours of Sleep</Label>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setSleepHours((h) => String(Math.max(0, Number(h) - 0.5)))}
              className="size-8 rounded-md border bg-muted text-muted-foreground hover:bg-accent flex items-center justify-center font-bold text-base"
            >
              −
            </button>
            <span className="w-12 text-center font-semibold tabular-nums">{sleepHours}h</span>
            <button
              type="button"
              onClick={() => setSleepHours((h) => String(Math.min(24, Number(h) + 0.5)))}
              className="size-8 rounded-md border bg-muted text-muted-foreground hover:bg-accent flex items-center justify-center font-bold text-base"
            >
              +
            </button>
          </div>
        </div>
      </Section>

      <div className="border-t" />

      {/* ── Journal ────────────────────────────────────────────────────────── */}
      <Section title="Journal">
        <div className="space-y-1.5">
          <Label htmlFor="tags" className="text-sm font-medium">Tags</Label>
          <Input
            id="tags"
            placeholder="headache, workout, therapy…  (comma-separated)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Anything on your mind today?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      </Section>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Saving…" : isEditing ? "Update Log" : "Save Today's Log"}
        </Button>
      </div>
    </form>
  )
}
