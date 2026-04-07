import mongoose, { Schema, Document, Model } from "mongoose"

export interface IFileAsset extends Document {
  name: string
  originalName: string
  publicId: string
  url: string
  resourceType: "image" | "raw"
  format: string
  size: number
  workspaceId: mongoose.Types.ObjectId | string
  uploadedBy: mongoose.Types.ObjectId | string
  createdAt: Date
  updatedAt: Date
}

const FileAssetSchema = new Schema<IFileAsset>(
  {
    name: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    resourceType: { type: String, enum: ["image", "raw"], required: true },
    format: { type: String, required: true },
    size: { type: Number, required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
)

FileAssetSchema.index({ workspaceId: 1, createdAt: -1 })

const FileAsset: Model<IFileAsset> =
  mongoose.models.FileAsset ?? mongoose.model<IFileAsset>("FileAsset", FileAssetSchema)

export default FileAsset
