# Appointment Feature Refactor Plan

## Goals

1. Support appointments with multiple family members.
2. Improve data integrity, query performance, and API consistency.
3. Improve UX for scheduling, editing, and filtering appointments.
4. Reduce auth and ownership risks in API routes.

## Current State Summary

1. `Appointment` stores a single `memberId` reference.
2. Appointment APIs accept and return only one member per appointment.
3. Dashboard and sheet UI are single-member oriented.
4. Some API routes rely on `userId` passed from the client instead of deriving identity from server session.

## Proposed Target Design

### Data Model

**Appointment Model Updates:**
1. Replace single `memberId` with `memberIds: ObjectId[]` in appointments.
2. Keep `memberId` temporarily during migration for backward compatibility.
3. Replace `date` and `time` with `startsAt: Date` and `endsAt?: Date` for reliable timezone-aware continuous time handling.
4. Enhance `recurrence` to include `interval: number` and end conditions (`endDate?: Date` or `occurrences?: number`).
5. Add `reminderRules: number[]` (array of minutes before appointment) and `reminderDeliveries` array to track sent/failed status.
6. Add `deletedAt?: Date` for soft delete capabilities.
7. Add `createdBy: Schema.Types.ObjectId` and `updatedBy: Schema.Types.ObjectId` for audit trails.
8. Add model-level validation:
   - `memberIds.length >= 1`
   - Deduplicate IDs before save.
9. Add and update indexes:
   - `{ userId: 1, startsAt: 1, status: 1 }` (updated from `date`)
   - `{ userId: 1, memberIds: 1 }` for family-member filters.

**FamilyMember Model Updates:**
1. Add `color?: string` (e.g., hex code) for distinct visual representation on the calendar UI.
2. Add `deletedAt?: Date` for soft deletion to preserve historical appointments if a member is removed.
3. Add `createdBy` and `updatedBy` for audit logging.

**User Model Updates:**
1. Add `timezone?: string` (IANA timezone like 'America/New_York') to support accurate timezone-safe rendering.

### API Contract

1. `POST /api/appointments`
   - Accept `memberIds: string[]`.
   - Temporarily accept legacy `memberId` and normalize to `memberIds`.
2. `PUT /api/appointments/[id]`
   - Same normalization and validation rules as create.
3. `GET /api/appointments`
   - Populate `memberIds`.
   - Support filtering by one or multiple members.
4. Response shape:
   - Add `members` array in response model.
   - Keep `memberId` as legacy field only during migration window.

### UI Changes

1. Appointment sheet:
   - Replace single member select with multi-select UI.
   - Show selected member chips.
   - Prevent submit with zero selected members.
2. Appointment table/card:
   - Show up to two member names, then `+N` overflow badge.
3. Filters:
   - Add multi-member filter in dashboard/list views.

## Migration Strategy

### Phase 1: Dual-Read, Dual-Write

1. Add `memberIds` in model and APIs.
2. On create/update:
   - If `memberIds` provided, use it.
   - Else map `memberId` to `memberIds: [memberId]`.
3. On reads:
   - Prefer `memberIds`.
   - Fallback to `[memberId]` for legacy documents.

### Phase 2: Backfill Existing Data

1. One-time script:
   - For each appointment missing `memberIds`, set `memberIds = [memberId]`.
2. Validate no appointment remains without at least one member.

### Phase 3: Remove Legacy Field

1. Remove `memberId` from model, API validation, and UI types.
2. Remove compatibility code paths.

## Security and Ownership Hardening

1. Derive current user from session on server for appointment APIs.
2. Ignore client-provided `userId` in create/update operations.
3. Enforce ownership checks:
   - Only read/update/delete appointments belonging to current user.
   - Ensure each `memberId` belongs to current user before write.

## Additional Improvements to Prioritize

1. Time handling
   - Store `startsAt` and optional `endsAt` as Date values.
   - Keep timezone-safe rendering in UI.
2. Recurrence
   - Expand recurrence model with interval and end conditions.
   - Add server-side next-occurrence generation.
3. Reminders
   - Add `reminderRules` array (for example: 24h, 2h before).
   - Track reminder delivery attempts and failures.
4. Status automation
   - Auto-mark past upcoming appointments as `completed` or `missed` via job.
5. Audit fields
   - Add `createdBy`, `updatedBy` where relevant.
6. Soft delete
   - Add `deletedAt` for recovery and safer operations.

## Testing Plan

1. Unit tests
   - Model validation for `memberIds`.
   - Normalization from legacy `memberId` input.
2. API integration tests
   - Create/update with one and many members.
   - Ownership enforcement and unauthorized attempts.
   - Filtering by member(s), status, and date range.
3. UI tests
   - Multi-select behavior in sheet.
   - Edit existing multi-member appointment.
   - Rendering of member list and overflow badge.
4. Migration tests
   - Dry run backfill script on sample data.
   - Verify no data loss and valid fallback reads.

## Rollout Plan

1. Deploy Phase 1 first with compatibility paths.
2. Run migration script and monitor logs.
3. Release UI multi-member support.
4. After verification period, deploy Phase 3 cleanup.

## Acceptance Criteria

1. User can create and edit appointments with multiple family members.
2. Existing appointments continue to work during migration.
3. Appointment APIs reject member IDs not owned by current user.
4. Dashboard/table views correctly display multiple members.
5. No regressions for recurrence, status updates, and filters.
