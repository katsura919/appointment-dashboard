import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const GoogleCheckSchema = z.object({
  email: z.email(),
  action: z.enum(["signup", "login"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GoogleCheckSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const { email, action } = parsed.data;

    await connectDB();

    // Check if user exists in our Mongoose User model (for email/password auth)
    const existingUser = await User.findOne({ email });

    if (action === "signup") {
      if (existingUser) {
        return Response.json(
          {
            error:
              "An account with this email already exists. Please log in instead.",
          },
          { status: 409 },
        );
      }
      return Response.json({ allowed: true }, { status: 200 });
    } else if (action === "login") {
      if (!existingUser) {
        return Response.json(
          { error: "No account found for this email. Please sign up instead." },
          { status: 404 },
        );
      }
      return Response.json({ allowed: true }, { status: 200 });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Google Check API] Error:", error);
    return Response.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
