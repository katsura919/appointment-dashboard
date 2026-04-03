# Family Operations: Appointment Dashboard — Feature Plan

## Stack
- **Frontend:** Next.js (App Router)
- **Backend:** Next.js API Routes
- **Database:** MongoDB (via Mongoose)
- **Auth:** Google OAuth (already implemented)

---

## Core Data Model

### `Appointment` (MongoDB Collection)
```ts
{
  _id: ObjectId,
  userId: ObjectId,           // ref: User
  title: string,
  category: AppointmentCategory,
  subcategory?: string,
  member: string,             // which family member this is for
  date: Date,
  time?: string,
  location?: string,
  notes?: string,
  isRecurring: boolean,
  recurrence?: {
    frequency: 'weekly' | 'monthly' | 'yearly',
    nextDate?: Date,
  },
  status: 'upcoming' | 'completed' | 'cancelled' | 'rescheduled',
  reminderSent: boolean,
  createdAt: Date,
  updatedAt: Date,
}
```

### `FamilyMember` (MongoDB Collection)
```ts
{
  _id: ObjectId,
  userId: ObjectId,           // ref: User (the parent/owner)
  name: string,
  role: 'mom' | 'dad' | 'child' | 'other',
  dateOfBirth?: Date,
  avatar?: string,
  createdAt: Date,
}
```

### `AppointmentCategory` (Enum)
```ts
'health_wellness'
'education_development'
'activities_enrichment'
'life_logistics'
'family_relationship'
'administrative'
'mom_personal_care'
```

---

## Features to Build

### 1. Family Member Management
- Add/edit/delete family members (mom, dad, children)
- Each appointment is linked to a specific family member
- Filter dashboard view by family member

**API Routes:**
- `GET /api/family-members`
- `POST /api/family-members`
- `PUT /api/family-members/[id]`
- `DELETE /api/family-members/[id]`

---

### 2. Appointment CRUD
Create, view, edit, and delete appointments with all relevant fields.

**Fields:** title, category, subcategory, family member, date, time, location, notes, recurring toggle

**API Routes:**
- `GET /api/appointments` (with filters: category, member, status, date range)
- `POST /api/appointments`
- `PUT /api/appointments/[id]`
- `DELETE /api/appointments/[id]`

---

### 3. Dashboard — Central Command View
The main landing page after login.

**Sections:**
- **Today** — appointments happening today
- **Upcoming** — next 7 days
- **Overdue** — past appointments with no status update
- **By Category** — quick count badges per category (Health, Education, etc.)
- **By Family Member** — filter/tab to see each person's schedule

---

### 4. Category-Based Organization
Seven appointment categories matching the client's vision:

| # | Category | Examples |
|---|----------|---------|
| 1 | Health & Wellness | Pediatrician, dental, vision, therapy, vaccinations |
| 2 | Education & Development | Parent-teacher conf, IEP, tutoring, testing |
| 3 | Activities & Enrichment | Sports, dance, music, clubs, camps |
| 4 | Life Logistics | Haircuts, DMV, car maintenance, home services |
| 5 | Family & Relationship | Gatherings, church, celebrations, date nights |
| 6 | Administrative | Insurance, legal, school registration, renewals |
| 7 | Mom's Personal Care | Medical, therapy, wellness, personal development |

Each category gets its own color, icon, and dedicated filtered view.

---

### 5. Recurring Appointments
Many health and activity appointments repeat on a schedule.

- Toggle "recurring" when creating an appointment
- Set frequency: weekly, monthly, or yearly
- Auto-generate next occurrence after marking current as complete
- Display recurring badge in the UI

---

### 6. Appointment Status Tracking
- `upcoming` — default
- `completed` — mark done after the appointment
- `cancelled` — appointment was cancelled
- `rescheduled` — linked to a new appointment

Allow bulk status updates (e.g., mark all today's as completed).

---

### 7. Calendar View
Visual monthly/weekly calendar showing all appointments.

- Color-coded by category
- Click a date to see all appointments that day
- Click an appointment to view/edit
- Toggle between month and week view

**Library:** `react-big-calendar` or `@fullcalendar/react`

---

### 8. Reminders / Notifications (Phase 2)
- Email reminders X days before appointment
- In-app notification badge
- "You have 3 appointments this week" summary email (weekly digest)

**Implementation:** Cron job via `node-cron` or Vercel Cron + Nodemailer/Resend

---

### 9. Peace Insights / Smart Prompts
Surface contextual reminders based on the client's "Peace Insights" concept.

Examples:
- "You have no health appointments scheduled for [child] in the next 6 months."
- "Mom's personal care section is empty — schedule something."
- "Activities category has the most appointments — check capacity."

These are computed on the server from the appointments data and displayed as insight cards on the dashboard.

---

### 10. Capacity Awareness (Phase 2)
Help prevent over-scheduling — the #1 source of overwhelm.

- Weekly appointment count per family member
- Visual "load indicator" (light / moderate / heavy)
- Warning when adding an appointment to an already heavy week

---

## Page Structure (Next.js App Router)

```
/app
  /dashboard              → Central command view
  /appointments
    /new                  → Create appointment form
    /[id]                 → View/edit single appointment
  /calendar               → Calendar view
  /family                 → Manage family members
  /category/[slug]        → Filtered view by category
  /settings               → User/account settings
```

---

## Implementation Phases

### Phase 1 — Core (Build First)
- [ ] Family member model + management UI
- [ ] Appointment model + full CRUD
- [ ] Dashboard with Today / Upcoming / Overdue sections
- [ ] Category filtering and color-coding
- [ ] Status tracking (upcoming → completed / cancelled)

### Phase 2 — Enhanced
- [ ] Recurring appointments with auto-next-date
- [ ] Calendar view
- [ ] Peace Insights / smart prompts
- [ ] Capacity / load indicator

### Phase 3 — Automation
- [ ] Email reminders (Resend or Nodemailer)
- [ ] Weekly digest email
- [ ] Vercel Cron for scheduled jobs
