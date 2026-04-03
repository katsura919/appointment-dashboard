import {
  Stethoscope,
  BookOpen,
  Trophy,
  Car,
  Heart,
  FileText,
  Sparkles,
} from "lucide-react"

export const CATEGORY_META = {
  health_wellness: {
    label: "Health & Wellness",
    color:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    dot: "bg-blue-500",
    Icon: Stethoscope,
  },
  education_development: {
    label: "Education & Development",
    color:
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
    dot: "bg-purple-500",
    Icon: BookOpen,
  },
  activities_enrichment: {
    label: "Activities & Enrichment",
    color:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
    dot: "bg-green-500",
    Icon: Trophy,
  },
  life_logistics: {
    label: "Life Logistics",
    color:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
    dot: "bg-orange-500",
    Icon: Car,
  },
  family_relationship: {
    label: "Family & Relationships",
    color:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
    dot: "bg-rose-500",
    Icon: Heart,
  },
  administrative: {
    label: "Administrative",
    color:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dot: "bg-slate-500",
    Icon: FileText,
  },
  mom_personal_care: {
    label: "Mom's Personal Care",
    color:
      "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
    dot: "bg-teal-500",
    Icon: Sparkles,
  },
} as const

export type AppointmentCategory = keyof typeof CATEGORY_META

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_META).map(
  ([value, meta]) => ({
    value: value as AppointmentCategory,
    label: meta.label,
  })
)
