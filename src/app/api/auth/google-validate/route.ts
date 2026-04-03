import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { action } = await request.json();

    if (!action || !["signup", "login"].includes(action)) {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectDB();

    // Check if user exists in Mongoose User model (email/password users)
    const existingUser = await User.findOne({ email: session.user.email });

    if (action === "signup" && existingUser) {
      return Response.json(
        {
          error:
            "An account with this email already exists. Please log in instead.",
        },
        { status: 409 },
      );
    }

    if (action === "login" && !existingUser) {
      return Response.json(
        { error: "No account found for this email. Please sign up instead." },
        { status: 404 },
      );
    }

    // Create user if signing up
    if (action === "signup" && !existingUser) {
      try {
        const newUser = await User.create({
          name: session.user.name || "Google User",
          email: session.user.email,
          password: require("crypto").randomBytes(32).toString("hex"), // Random password for OAuth users
          role: "staff",
        } as any);

        return Response.json(
          {
            success: true,
            user: {
              id: newUser._id,
              name: newUser.name,
              email: newUser.email,
            },
          },
          { status: 201 },
        );
      } catch (err) {
        console.error("[Create User] Error:", err);
        return Response.json(
          { error: "Failed to create user account" },
          { status: 500 },
        );
      }
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Google Validate] Error:", error);
    return Response.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
