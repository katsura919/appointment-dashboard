import mongoose, { Schema, Document, Model } from "mongoose"

export interface IStorageFolder extends Document {
  name: string
  workspaceId: mongoose.Types.ObjectId | string
  createdBy: mongoose.Types.ObjectId | string
  createdAt: Date
  updatedAt: Date
}

const StorageFolderSchema = new Schema<IStorageFolder>(
  {
    name: { type: String, required: true, trim: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
)

StorageFolderSchema.index({ workspaceId: 1, createdAt: -1 })

const StorageFolder: Model<IStorageFolder> =
  mongoose.models.StorageFolder ??
  mongoose.model<IStorageFolder>("StorageFolder", StorageFolderSchema)

export default StorageFolder
