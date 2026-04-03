import { redirect } from "next/navigation";
import { getServerUserId } from "@/lib/server-auth";

export default async function Home() {
  const userId = await getServerUserId();

  if (userId) {
    redirect("/workspaces");
  } else {
    redirect("/login");
  }
}
