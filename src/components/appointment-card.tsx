"use client"

import { format } from "date-fns"
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  RepeatIcon,
  MoreHorizontalIcon,
  CheckCircleIcon,
  XCircleIcon,
  RotateCcwIcon,
  Trash2Icon,
  PencilIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CategoryBadge } from "@/components/category-badge"
import type { AppointmentResponse, AppointmentStatus } from "@/lib/types"
import type { AppointmentCategory } from "@/lib/categories"

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  upcoming: {
    label: "Upcoming",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  rescheduled: {
    label: "Rescheduled",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
}

interface AppointmentCardProps {
  appointment: AppointmentResponse
  onStatusChange: (id: string, status: AppointmentStatus) => void
  onEdit: (appointment: AppointmentResponse) => void
  onDelete: (id: string) => void
}

export function AppointmentCard({
  appointment,
  onStatusChange,
  onEdit,
  onDelete,
}: AppointmentCardProps) {
  const statusConfig = STATUS_CONFIG[appointment.status]
  const appointmentDate = new Date(appointment.startsAt || appointment.date || "")
  const timeStr = appointment.startsAt ? format(appointmentDate, "h:mm a") : appointment.time
  const members = appointment.memberIds?.length > 0 ? appointment.memberIds : (appointment.memberId ? [appointment.memberId] : [])
  const displayedMembers = members.slice(0, 2)
  const excessCount = members.length - 2

  return (
    <Card className="group">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge
              category={appointment.category as AppointmentCategory}
            />
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}
            >
              {statusConfig.label}
            </span>
            {appointment.isRecurring && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <RepeatIcon className="size-3" />
                Recurring
              </span>
            )}
          </div>
          <p className="font-medium leading-tight">{appointment.title}</p>
          {appointment.subcategory && (
            <p className="text-xs text-muted-foreground">
              {appointment.subcategory}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontalIcon className="size-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(appointment)}>
              <PencilIcon className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {appointment.status !== "completed" && (
              <DropdownMenuItem
                onClick={() => onStatusChange(appointment._id, "completed")}
              >
                <CheckCircleIcon className="size-4 text-green-600" />
                Mark Completed
              </DropdownMenuItem>
            )}
            {appointment.status !== "cancelled" && (
              <DropdownMenuItem
                onClick={() => onStatusChange(appointment._id, "cancelled")}
              >
                <XCircleIcon className="size-4 text-red-600" />
                Mark Cancelled
              </DropdownMenuItem>
            )}
            {appointment.status !== "upcoming" && (
              <DropdownMenuItem
                onClick={() => onStatusChange(appointment._id, "upcoming")}
              >
                <RotateCcwIcon className="size-4" />
                Mark Upcoming
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(appointment._id)}
            >
              <Trash2Icon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="size-3.5 shrink-0" />
            {format(appointmentDate, "MMM d, yyyy")}
          </span>
          {timeStr && (
            <span className="flex items-center gap-1.5">
              <ClockIcon className="size-3.5 shrink-0" />
              {timeStr}
            </span>
          )}
        </div>
        {appointment.location && (
          <span className="flex items-center gap-1.5">
            <MapPinIcon className="size-3.5 shrink-0" />
            {appointment.location}
          </span>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex -space-x-1.5">
            {displayedMembers.map(m => (
              <div key={m._id} className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold uppercase border border-background z-10" title={m.name}>
                {m.name.charAt(0)}
              </div>
            ))}
            {excessCount > 0 && (
              <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold border border-background z-0">
                +{excessCount}
              </div>
            )}
          </div>
          <span className="text-xs ml-1">
            {displayedMembers.map(m => m.name).join(", ")}
            {excessCount > 0 ? `, +${excessCount}` : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
