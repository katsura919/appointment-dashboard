# Storage Manager — MVP Implementation Plan

## Scope (MVP)

- Upload images and documents (PDF, Excel, Word, CSV, plain text)
- Files scoped per workspace
- No folders, no video, no sharing
- 5MB size limit per file
- View (grid/list), preview, delete, rename

---

## Allowed File Types

| Category | MIME Types | Extensions |
|---|---|---|
| Images | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml` | jpg, jpeg, png, gif, webp, svg |
| PDF | `application/pdf` | pdf |
| Word | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | docx |
| Excel | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv` | xlsx, csv |
| Text | `text/plain` | txt |

---

## Architecture

```
Cloudinary (file storage)
      ↕  signed upload
Next.js API routes  (/api/storage/*)
      ↕
MongoDB (FileAsset model — metadata only)
      ↕
React UI (/storage page + components)
```

Files are uploaded **directly from the browser to Cloudinary** using a server-generated signature. MongoDB stores only metadata — no file bytes touch our server.

---

## Environment Variables

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Packages to Install

```bash
npm install cloudinary react-dropzone
```

- `cloudinary` — server-side SDK for generating signed upload params and deleting files
- `react-dropzone` — drag-and-drop upload zone with MIME + size validation

---

## Database Model

### `FileAsset` (`src/models/FileAsset.ts`)

| Field | Type | Notes |
|---|---|---|
| `name` | String | Display name (editable) |
| `originalName` | String | Original filename from upload |
| `publicId` | String | Cloudinary `public_id` (used for deletion) |
| `url` | String | Cloudinary `secure_url` |
| `resourceType` | String | `"image"` or `"raw"` |
| `format` | String | `pdf`, `xlsx`, `png`, etc. |
| `size` | Number | File size in bytes |
| `workspaceId` | ObjectId | Workspace scope (required) |
| `uploadedBy` | ObjectId | User who uploaded (required) |
| `createdAt` | Date | Auto-managed by Mongoose timestamps |

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `POST /api/storage/sign` | POST | Generate Cloudinary signed upload params |
| `GET /api/storage/files` | GET | List files for workspace (query: `workspaceId`, `type`) |
| `POST /api/storage/files` | POST | Save file metadata after Cloudinary upload succeeds |
| `DELETE /api/storage/files/[id]` | DELETE | Delete from Cloudinary + remove from DB |
| `PATCH /api/storage/files/[id]` | PATCH | Rename file (updates `name` field only) |

---

## Upload Flow

```
1. User drops/selects file
2. Client validates: type allowed + size ≤ 5MB (enforced in dropzone)
3. Client POSTs to /api/storage/sign → receives { signature, timestamp, api_key, folder, cloud_name }
4. Client POSTs file directly to Cloudinary upload endpoint using FormData + signature
5. On Cloudinary success, client POSTs metadata to /api/storage/files → saved to MongoDB
6. UI updates file list via Zustand store
```

---

## Cloudinary Configuration

- Folder per workspace: `workspace/{workspaceId}/`
- Images use `resource_type: "image"`
- Docs/PDFs use `resource_type: "raw"`
- Uploads are **signed** (not unsigned presets) for security
- Transformations: thumbnails generated on-the-fly via Cloudinary URL params for image previews

---

## State Management

**Zustand store** — `src/store/storage-store.ts`

```ts
{
  files: FileAsset[]
  isUploading: boolean
  uploadProgress: number          // 0–100
  viewMode: 'grid' | 'list'
  searchQuery: string
  filterType: 'all' | 'image' | 'pdf' | 'doc'
  setFiles, addFile, removeFile, renameFile,
  setViewMode, setSearchQuery, setFilterType,
  setUploading, setUploadProgress
}
```

---

## Page & Components

```
src/app/storage/
  page.tsx                    # main storage page — fetches files, renders layout

src/components/storage/
  StorageHeader.tsx           # search bar, view toggle (grid/list), upload button
  FileUploader.tsx            # react-dropzone dialog: validates type+size, runs upload flow
  FileGrid.tsx                # responsive grid of FileCard components
  FileList.tsx                # table/list view with columns: name, type, size, date, actions
  FileCard.tsx                # individual file tile: thumbnail or icon, name, size, menu (rename/delete)
  FilePreviewModal.tsx        # image: <img> / PDF: <embed> / others: download link
  StorageStats.tsx            # small bar: X files · Y MB used (optional, simple)
```

---

## Implementation Order

- [x] Write plan (`docs/storage.md`)
- [x] Install `cloudinary` and `react-dropzone`
- [ ] Add env vars to `.env.local` (user provides values)
- [x] Create `FileAsset` Mongoose model (`src/models/FileAsset.ts`)
- [x] Create API routes: `sign`, `files` (GET/POST), `files/[id]` (DELETE/PATCH)
- [x] Create Zustand `storage-store` (`src/store/storage-store.ts`)
- [x] Build `FileUploader` component (dropzone + signed upload logic)
- [x] Build `FileCard`, `FileGrid`, `FileList`
- [x] Build `FilePreviewModal`
- [x] Build `StorageHeader`
- [x] Create `/storage` page
- [x] Add nav link in sidebar
