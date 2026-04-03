import { auth } from "@/auth";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function getServerUserId(): Promise<string | null> {
  // Check NextAuth session
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  // Check custom JWT cookie (Email/Password login)
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  
  if (!token) return null;

  try {
    const JWT_SECRET = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    return null;
  }
}
