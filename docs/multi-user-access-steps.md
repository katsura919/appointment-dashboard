# Workspace Management — Implementation Plan

## Current State

- ✅ `Workspace` Mongoose model exists with `name`, `ownerId`, `members[]` (userId + role)
- ✅ `GET /api/workspaces` — lists workspaces the user belongs to
- ✅ `POST /api/workspaces` — creates a workspace (auto-creates "Personal Workspace" on first login)
- ✅ `WorkspaceContext` — tracks active workspace, persists to localStorage
- ✅ `WorkspaceSwitcher` — in sidebar, dropdown to switch between workspaces (Add workspace button is a stub — not wired)
- ✅ All data API routes use `x-workspace-id` header and `requireWorkspaceAccess`
- ❌ No Settings page
- ❌ No way to rename a workspace
- ❌ No way to invite members by email
- ❌ No way to manage / change member roles
- ❌ No way to remove members
- ❌ No way to leave or delete a workspace
- ❌ "Add workspace" button in switcher is a stub

---

## Roles Recap

| Role | Can do |
|------|--------|
| `owner` | Full control: rename, delete workspace, manage all members |
| `admin` | Manage members (invite, change roles, remove) — cannot delete workspace |
| `member` | View and use workspace data only — no management |

---

## What We Will Build

### 1. Workspace Member Invite API
**`/api/workspaces/[id]/members`**

- `POST` — Invite a user by email. Looks up the user by email, adds them to `workspace.members[]` with specified role.
  - Rule: only `owner` or `admin` can invite
  - Rule: cannot invite someone already in the workspace
- `GET` — Returns list of members with populated user info (name, email, avatar)

### 2. Workspace Member Management API
**`/api/workspaces/[id]/members/[userId]`**

- `PATCH` — Update a member's role (`admin` ↔ `member`)
  - Rule: only `owner` can change roles; cannot change own role
- `DELETE` — Remove a member from the workspace
  - Rule: `owner` or `admin` can remove members; `owner` cannot be removed
  - A user can also call DELETE on themselves to "leave" the workspace

### 3. Workspace Settings API
**`/api/workspaces/[id]`**

- `PATCH` — Rename the workspace
  - Rule: only `owner` or `admin` can rename
- `DELETE` — Delete the workspace
  - Rule: only the `owner` can delete
  - Rule: cannot delete if other members still exist (or cascade-delete all data — TBD, we'll just block for safety)

### 4. Settings Page — `/settings`

A new `app/settings/` route (currently returns 404). This will be **the main management hub**, split into tabs:

#### Tab: Workspace
- Display workspace name (editable inline or via a form for owner/admin)
- Show current workspace ID (read-only, for reference)
- Danger zone: Delete Workspace button (owner only)

#### Tab: Members
- Table of current members with columns: Avatar + Name, Email, Role badge, Actions
- **Invite Member** button → opens a dialog with:
  - Email field
  - Role selector (member / admin)
  - Submit → calls `POST /api/workspaces/[id]/members`
- Per-row actions (visible based on role):
  - Role dropdown to promote/demote (owner only)
  - Remove button (owner/admin)
- "Leave Workspace" button for members who are not owner

#### Tab: Account (Nice-to-have)
- Display logged-in user's name/email
- Future: profile settings

### 5. Wire Up "Add Workspace" in WorkspaceSwitcher

The `WorkspaceSwitcher` already has an `Add workspace` dropdown item — clicking it is currently a no-op. We'll wire it up to open a **Create Workspace Dialog** with a name field.

---

## File Structure

```
src/
├── app/
│   ├── settings/
│   │   └── page.tsx                        [NEW] Settings page (workspace + members tabs)
│   └── api/
│       └── workspaces/
│           ├── route.ts                    [EXISTING] GET list, POST create
│           ├── [id]/
│           │   ├── route.ts                [NEW] PATCH rename, DELETE workspace
│           │   └── members/
│           │       ├── route.ts            [NEW] GET list members, POST invite by email
│           │       └── [userId]/
│           │           └── route.ts        [NEW] PATCH change role, DELETE remove/leave
├── components/
│   ├── workspace-switcher.tsx              [MODIFY] Wire up "Add workspace" action
│   └── create-workspace-dialog.tsx         [NEW] Dialog for creating a new workspace
└── lib/
    └── workspace-utils.ts                  [MODIFY] Add role-check helpers (isOwner, canManageMembers)
```

---

## Implementation Order

1. **API Layer** (backend first so we can test)
   - `PATCH/DELETE /api/workspaces/[id]` (rename + delete)
   - `GET/POST /api/workspaces/[id]/members` (list + invite)
   - `PATCH/DELETE /api/workspaces/[id]/members/[userId]` (role + remove)

2. **Helper updates** — extend `workspace-utils.ts` with role helper functions

3. **Create Workspace Dialog** — wire up the switcher's stub "Add workspace"

4. **Settings Page** — full page with Workspace and Members tabs

---

## Key UX Decisions

- **Invite by email only**: We look up users who already have an account. We will NOT allow inviting someone who hasn't registered yet (no "pending invites" system for now).
- **Role visibility**: the role badge shown in the member table reflects their workspace role — not their auth role.
- **Self-leave**: any non-owner member can leave a workspace via button in Settings → Members tab.
- **Owner protection**: the workspace owner cannot be removed or have their role changed by anyone. To transfer ownership is out of scope for now.
- **No cascade delete**: Deleting a workspace will be blocked if other members still exist. The owner must remove all members first.
- **Settings access**: Only `owner` and `admin` can open Settings → Members tab and see management controls. A `member` can only see the list and the "Leave" button.

---

## Open Questions

1. Should we allow `admin` to rename the workspace, or only `owner`? *(Plan: yes, admin can rename)*
2. Should inviting require the invitee to accept, or auto-join? *(Plan: auto-join for simplicity — no invite queue)*
3. Should deleting a workspace also delete all its data (appointments, family members, well-being logs)? *(Plan: block delete unless no other members, but keep data — soft guard)*
