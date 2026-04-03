"use client"

import { CATEGORY_META, type AppointmentCategory } from "@/lib/categories"
import { cn } from "@/lib/utils"

export function CategoryBadge({
  category,
  className,
}: {
  category: AppointmentCategory
  className?: string
}) {
  const meta = CATEGORY_META[category]
  if (!meta) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        meta.color,
        className
      )}
    >
      <meta.Icon className="size-3 shrink-0" />
      {meta.label}
    </span>
  )
}
