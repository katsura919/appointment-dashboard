"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"

interface WellBeingFormProps {
  workspaceId: string
  onSuccess?: () => void
}

export function WellBeingForm({ workspaceId, onSuccess }: WellBeingFormProps) {
  const [saving, setSaving] = React.useState(false)

  // Default scales of 3 out of 5
  const [moodScore, setMoodScore] = React.useState(3)
  const [stressLevel, setStressLevel] = React.useState(3)
  const [energyLevel, setEnergyLevel] = React.useState(3)
  const [sleepQuality, setSleepQuality] = React.useState(3)
  const [activityLevel, setActivityLevel] = React.useState(3)
  const [hydrationScore, setHydrationScore] = React.useState(3)
  
  const [sleepHours, setSleepHours] = React.useState("7")
  const [tagsInput, setTagsInput] = React.useState("")
  const [notes, setNotes] = React.useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    const payload = {
      date: new Date().toISOString(),
      tags,
      notes: notes.trim() || undefined,
      metrics: {
        moodScore,
        stressLevel,
        energyLevel,
        sleepQuality,
        activityLevel,
        hydrationScore,
        sleepHours: Number(sleepHours) || 0,
      },
    }

    try {
      const res = await fetch("/api/well-being", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      toast.success("Well-being log saved successfully!")
      
      // Reset form somewhat, though they probably only log once
      setTagsInput("")
      setNotes("")
      
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save log:", error)
      toast.error("Failed to save your log. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  function RatingRow({
    label,
    value,
    setValue,
    descriptions = ["Poor", "Fair", "Good", "Great", "Excellent"],
  }: {
    label: string
    value: number
    setValue: (val: number) => void
    descriptions?: string[]
  }) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <Label className="text-base font-semibold">{label}</Label>
          <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {value}/5 - {descriptions[value - 1] ?? "Average"}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => setValue(rating)}
              className={`size-8 rounded-full border-2 flex items-center justify-center transition-colors
                ${
                  value === rating 
                  ? "border-primary bg-primary text-primary-foreground" 
                  : "border-input bg-background text-muted-foreground hover:border-primary/50"
                }`}
            >
              <span className="text-sm font-medium">{rating}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{descriptions[0]}</span>
          <span>{descriptions[4]}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
            <RatingRow
              label="Mood"
              value={moodScore}
              setValue={setMoodScore}
              descriptions={["Terrible", "Bad", "Okay", "Good", "Amazing"]}
            />
            <RatingRow
              label="Stress Level"
              value={stressLevel}
              setValue={setStressLevel}
              descriptions={["Very Low", "Low", "Moderate", "High", "Very High"]}
            />
            <RatingRow
              label="Energy"
              value={energyLevel}
              setValue={setEnergyLevel}
              descriptions={["Exhausted", "Low", "Decent", "High", "Energized"]}
            />
            <RatingRow
              label="Activity Level"
              value={activityLevel}
              setValue={setActivityLevel}
              descriptions={["Sedentary", "Light", "Moderate", "Active", "Very Active"]}
            />
            <RatingRow
              label="Hydration"
              value={hydrationScore}
              setValue={setHydrationScore}
              descriptions={["Dehydrated", "Poor", "Okay", "Good", "Excellent"]}
            />
            
            <div className="space-y-3">
              <RatingRow
                label="Sleep Quality"
                value={sleepQuality}
                setValue={setSleepQuality}
              />
              <div className="flex items-center gap-3 pt-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Hours of Sleep:</Label>
                <div className="flex-1">
                    <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                    className="w-full"
                    />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g. headache, workout, therapy"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Journal / Notes</Label>
              <Textarea
                id="notes"
                placeholder="Anything specific weighing on your mind today?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Today's Log"}
          </Button>
        </div>
      </form>
    </div>
  )
}
