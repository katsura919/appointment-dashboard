# Multi-User Access (Owner + Executive Assistant)

To allow an Owner and their Executive Assistant (EA) to access the same dashboard, we need to transition away from binding data strictly to the logged-in user's identity. 

There are two primary architectural approaches to achieve this.

## Option A: The Workspace / Organization Model (Recommended)

This is the industry standard for SaaS and collaboration platforms (like Slack, Notion, Asana).
Instead of data belonging to a "User", data belongs to a "Workspace".

1. **New Schema**: We create a `Workspace` model.
2. **Members**: Both the Owner and the EA are invited to the Workspace with specific roles (e.g., `owner`, `admin`, `editor`).
3. **Data Relocation**: `Appointments`, `FamilyMembers`, and `WellBeingLogs` are updated to reference `workspaceId` instead of `userId`.
4. **Context Switching**: When a user logs in, they select their active Workspace from a dropdown.

**Pros:**
- Deeply scalable. An EA can easily manage *multiple* different Owners by simply joining their respective Workspaces.
- Clean separation between a User (authentication entity) and a Workspace (billing/data entity).

**Cons:**
- Requires a data migration (we must run a script to create a Workspace for existing users and map their items to it).

## Option B: Delegated Access (Account Impersonation)

Keep the data directly tied to the Owner's `userId`, but grant the EA permission to view/edit it.

1. **Schema Update**: We add a `delegates: [ObjectId]` array to the `User` model. The Owner adds the EA's user ID to this list.
2. **Context Switching**: When the EA logs in, they see a "Switch Dashboard" menu that lists the Owners who have delegated access to them.
3. **API Logic**: The frontend passes a specific header (e.g., `X-Dashboard-Owner-Id`). The API checks if the logged-in user (EA) is inside the `delegates` array of that Owner. If authorized, the API returns the Owner's data.

**Pros:**
- Simpler schema changes. No new `Workspace` models.
- No massive data migration required. Data stays tied to `userId`.

**Cons:**
- Tightly couples data to a single user account instead of a business entity. Not as scalable if the platform intends to host many EAs managing multiple clients.

---

## Conclusion & Next Steps

Please review the two approaches above. 

- **If we choose Option A (Workspaces):** It will take a bit more time as we have to set up context providers globally and migrate data over.
- **If we choose Option B (Delegated Access):** It is a faster, leaner implementation. We'll simply let the EA view the dashboard "as" the Owner, using the `X-Dashboard-Owner-Id` header.

Let me know which option you prefer, and we can begin the code implementation.
