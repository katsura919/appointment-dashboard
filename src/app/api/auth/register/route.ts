import { NextRequest } from "next/server"
import { z } from "zod"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

const RegisterSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.email(),
  password: z
    .string()
    .min(8)
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["admin", "staff"]).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = RegisterSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password, role } = parsed.data

    await connectDB()

    const existing = await User.findOne({ email })
    if (existing) {
      return Response.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const user = await User.create({ name, email, password, role })

    return Response.json(
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[Register API] Error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
