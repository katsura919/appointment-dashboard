import mongoose from "mongoose"
import { setDefaultResultOrder } from "dns"
import { setServers } from "dns/promises"

// Use Cloudflare + Google DNS to bypass ISP DNS restrictions
setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"])
setDefaultResultOrder("ipv4first")

const MONGODB_URI = process.env.MONGODB_URI as string

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable")
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null }
global.mongoose = cached

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => {
      console.log("[MongoDB] Connected successfully")
      return m
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
