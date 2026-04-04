"use client"

import { useEffect, useId, useMemo, useState } from "react"

import { format } from "date-fns"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  GripVerticalIcon,
  EllipsisVerticalIcon,
  Columns3Icon,
  ChevronDownIcon,
  PlusIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  RotateCcwIcon,
  PencilIcon,
  Trash2Icon,
  RepeatIcon,
  MapPinIcon,
  ClockIcon,
} from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { CategoryBadge } from "@/components/category-badge"
import type { AppointmentCategory } from "@/lib/categories"
import type { AppointmentResponse, AppointmentStatus } from "@/lib/types"

// ─── Drag handle ────────────────────────────────────────────────────────────

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({ id })
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  upcoming: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
  rescheduled: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300",
}

// ─── Draggable row ───────────────────────────────────────────────────────────

function DraggableRow({ row }: { row: Row<AppointmentResponse> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original._id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

// ─── Title cell with drawer ──────────────────────────────────────────────────

function TitleCell({
  appointment,
  onEdit,
}: {
  appointment: AppointmentResponse
  onEdit: (a: AppointmentResponse) => void
}) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground">
          {appointment.title}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{appointment.title}</DrawerTitle>
          <DrawerDescription>
            {format(new Date(appointment.startsAt || appointment.date || ""), "EEEE, MMMM d, yyyy")}
            {appointment.time && ` · ${appointment.time}`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-24 shrink-0">Category</span>
              <CategoryBadge category={appointment.category as AppointmentCategory} />
            </div>
            {appointment.subcategory && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Subcategory</span>
                <span>{appointment.subcategory}</span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground w-24 shrink-0">For</span>
              <div className="flex flex-col gap-1.5 pl-24 -mt-6">
                {(appointment.memberIds?.length > 0 ? appointment.memberIds : (appointment.memberId ? [appointment.memberId] : [])).map(m => (
                  <div key={m._id} className="flex items-center gap-1.5">
                    <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold uppercase">
                      {m.name.charAt(0)}
                    </div>
                    <span>{m.name}</span>
                    <span className="text-muted-foreground capitalize">
                      ({m.role})
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-24 shrink-0">Status</span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[appointment.status]}`}
              >
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </span>
            </div>
            {appointment.location && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Location</span>
                <span className="flex items-center gap-1">
                  <MapPinIcon className="size-3.5" />
                  {appointment.location}
                </span>
              </div>
            )}
            {(appointment.startsAt || appointment.time) && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Time</span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="size-3.5" />
                  {appointment.startsAt ? format(new Date(appointment.startsAt), "h:mm a") : appointment.time}
                </span>
              </div>
            )}
            {appointment.isRecurring && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Recurring</span>
                <span className="flex items-center gap-1">
                  <RepeatIcon className="size-3.5" />
                  {appointment.recurrence?.frequency ?? "Yes"}
                </span>
              </div>
            )}
            {appointment.notes && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Notes</span>
                <p className="text-sm leading-relaxed">{appointment.notes}</p>
              </div>
            )}
          </div>
        </div>
        <DrawerFooter>
          <Button onClick={() => onEdit(appointment)}>Edit Appointment</Button>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

interface AppointmentTableProps {
  appointments: AppointmentResponse[]
  onStatusChange: (id: string, status: AppointmentStatus) => void
  onEdit: (appointment: AppointmentResponse) => void
  onDelete: (id: string) => void
  onNew: () => void
}

export function AppointmentTable({
  appointments,
  onStatusChange,
  onEdit,
  onDelete,
  onNew,
}: AppointmentTableProps) {
  const [data, setData] = useState<AppointmentResponse[]>(appointments)
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const sortableId = useId()

  // Sync when parent data changes
  useEffect(() => {
    setData(appointments)
  }, [appointments])

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = useMemo<UniqueIdentifier[]>(
    () => data.map((a) => a._id),
    [data]
  )

  const columns = useMemo<ColumnDef<AppointmentResponse>[]>(
    () => [
      {
        id: "drag",
        header: () => null,
        cell: ({ row }) => <DragHandle id={row.original._id} />,
      },
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: "Appointment",
        cell: ({ row }) => (
          <TitleCell appointment={row.original} onEdit={onEdit} />
        ),
        enableHiding: false,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <CategoryBadge category={row.original.category as AppointmentCategory} />
        ),
      },
      {
        id: "member",
        header: "For",
        cell: ({ row }) => {
          const members = row.original.memberIds?.length > 0 ? row.original.memberIds : (row.original.memberId ? [row.original.memberId] : []);
          const displayed = members.slice(0, 2);
          const excess = members.length - 2;
          return (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5 min-w-10">
                {displayed.map(m => (
                  <div key={m._id} className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold uppercase shrink-0 border-2 border-background z-10" title={m.name}>
                    {m.name.charAt(0)}
                  </div>
                ))}
                {excess > 0 && (
                  <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold uppercase shrink-0 border-2 border-background z-0">
                    +{excess}
                  </div>
                )}
              </div>
              <span className="text-sm">
                {displayed.map(m => m.name).join(", ")}
                {excess > 0 ? `, +${excess}` : ""}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {format(new Date(row.original.startsAt || row.original.date || ""), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        accessorKey: "time",
        header: "Time",
        cell: ({ row }) => {
          const timeStr = row.original.startsAt ? format(new Date(row.original.startsAt), "h:mm a") : row.original.time;
          return timeStr ? (
            <span className="tabular-nums text-sm text-muted-foreground">
              {timeStr}
            </span>
          ) : (
            <span className="text-muted-foreground/40 text-sm">—</span>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[row.original.status]}`}
          >
            {row.original.status.charAt(0).toUpperCase() +
              row.original.status.slice(1)}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const apt = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
                  size="icon"
                >
                  <EllipsisVerticalIcon />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onEdit(apt)}>
                  <PencilIcon className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {apt.status !== "completed" && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(apt._id, "completed")}
                  >
                    <CheckCircleIcon className="size-4 text-green-600" />
                    Mark Completed
                  </DropdownMenuItem>
                )}
                {apt.status !== "cancelled" && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(apt._id, "cancelled")}
                  >
                    <XCircleIcon className="size-4 text-red-600" />
                    Mark Cancelled
                  </DropdownMenuItem>
                )}
                {apt.status !== "upcoming" && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(apt._id, "upcoming")}
                  >
                    <RotateCcwIcon className="size-4" />
                    Mark Upcoming
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(apt._id)}
                >
                  <Trash2Icon className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [onEdit, onStatusChange, onDelete]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
    getRowId: (row) => row._id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((prev) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  // Tab-based view filters
  const todayStr = format(new Date(), "yyyy-MM-dd")
  const tabCounts = {
    all: appointments.length,
    today: appointments.filter(
      (a) =>
        a.status === "upcoming" &&
        format(new Date(a.startsAt || a.date || ""), "yyyy-MM-dd") === todayStr
    ).length,
    upcoming: appointments.filter((a) => a.status === "upcoming").length,
    completed: appointments.filter((a) => a.status === "completed").length,
  }

  function handleTabChange(value: string) {
    if (value === "all") {
      table.getColumn("status")?.setFilterValue(undefined)
      table.getColumn("date")?.setFilterValue(undefined)
      setData(appointments)
    } else if (value === "today") {
      setData(
        appointments.filter(
          (a) =>
            a.status === "upcoming" &&
            format(new Date(a.startsAt || a.date || ""), "yyyy-MM-dd") === todayStr
        )
      )
    } else if (value === "upcoming") {
      setData(appointments.filter((a) => a.status === "upcoming"))
    } else if (value === "completed") {
      setData(appointments.filter((a) => a.status === "completed"))
    }
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  return (
    <Tabs
      defaultValue="upcoming"
      onValueChange={handleTabChange}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select defaultValue="upcoming" onValueChange={handleTabChange}>
          <SelectTrigger
            className="flex w-fit @4xl/main:hidden"
            size="sm"
            id="view-selector"
          >
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="upcoming">
            Upcoming{" "}
            {tabCounts.upcoming > 0 && (
              <Badge variant="secondary">{tabCounts.upcoming}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="today">
            Today{" "}
            {tabCounts.today > 0 && (
              <Badge variant="secondary">{tabCounts.today}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">
            All <Badge variant="secondary">{tabCounts.all}</Badge>
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3Icon data-icon="inline-start" />
                Columns
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {table
                .getAllColumns()
                .filter(
                  (col) =>
                    typeof col.accessorFn !== "undefined" && col.getCanHide()
                )
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize"
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  >
                    {col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={onNew}>
            <PlusIcon />
            <span className="hidden lg:inline">New Appointment</span>
          </Button>
        </div>
      </div>

      {/* Single shared table for all tabs */}
      {["upcoming", "today", "completed", "all"].map((tab) => (
        <TabsContent
          key={tab}
          value={tab}
          className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        >
          <div className="overflow-hidden rounded-lg border">
            <DndContext
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              sensors={sensors}
              id={sortableId}
            >
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="**:data-[slot=table-cell]:first:w-8">
                  {table.getRowModel().rows.length ? (
                    <SortableContext
                      items={dataIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {table.getRowModel().rows.map((row) => (
                        <DraggableRow key={row.id} row={row} />
                      ))}
                    </SortableContext>
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No appointments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4">
            <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit">
              <div className="hidden items-center gap-2 lg:flex">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  Rows per page
                </Label>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(v) => table.setPageSize(Number(v))}
                >
                  <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                    <SelectValue
                      placeholder={table.getState().pagination.pageSize}
                    />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectGroup>
                      {[10, 20, 30, 40, 50].map((s) => (
                        <SelectItem key={s} value={`${s}`}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRightIcon />
                </Button>
                <Button
                  variant="outline"
                  className="hidden size-8 lg:flex"
                  size="icon"
                  onClick={() =>
                    table.setPageIndex(table.getPageCount() - 1)
                  }
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRightIcon />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
