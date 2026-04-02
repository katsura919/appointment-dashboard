import { NextRequest } from "next/server"
import { z } from "zod"
import jwt from "jsonwebtoken"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

const JWT_SECRET = process.env.JWT_SECRET as string

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = LoginSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid email or password format" },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    await connectDB()

    const user = await User.findOne({ email })
    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    return Response.json(
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    )
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
