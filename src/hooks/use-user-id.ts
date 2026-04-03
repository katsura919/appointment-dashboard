"use client"

import { useAuthStore } from "@/store/auth-store"
import { useSession } from "next-auth/react"

export function useUserId(): string | null {
  const storeUser = useAuthStore((s) => s.user)
  const { data: session } = useSession()
  return (
    storeUser?.id ??
    (session?.user as { id?: string } | undefined)?.id ??
    null
  )
}
