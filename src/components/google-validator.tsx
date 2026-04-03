"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

interface GoogleValidatorProps {
  children: React.ReactNode;
}

export function GoogleValidator({ children }: GoogleValidatorProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [validated, setValidated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    async function validate() {
      if (status === "loading") return;

      // If not authenticated or no action stored, just proceed
      if (status !== "authenticated" || !session?.user?.email) {
        setValidated(true);
        return;
      }

      const action =
        typeof window !== "undefined"
          ? sessionStorage.getItem("auth-action")
          : null;

      // If no action stored, user logged in through other means
      if (!action) {
        setValidated(true);
        return;
      }

      if (isValidating) return;
      setIsValidating(true);

      try {
        const res = await fetch("/api/auth/google-validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        const data = await res.json();

        if (!res.ok) {
          const message = data.error || "Authentication validation failed";
          toast.error(message);

          // Clear the action and redirect back to login
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("auth-action");
          }

          // Clear auth session first, otherwise middleware redirects /login back to /dashboard.
          await signOut({ redirect: false });
          router.replace("/login");
          return;
        }

        // Validation passed
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth-action");
        }
        setValidated(true);
      } catch (error) {
        console.error("[Google Validator] Error:", error);
        toast.error("Validation failed. Please try again.");
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth-action");
        }
        await signOut({ redirect: false });
        router.replace("/login");
      }
    }

    validate();
  }, [session?.user?.email, status, router]);

  // Show loading state or nothing while validating/loading
  if (status === "loading") {
    return null;
  }

  // If authenticated but not validated yet and action exists, show nothing
  if (
    status === "authenticated" &&
    !validated &&
    typeof window !== "undefined" &&
    sessionStorage.getItem("auth-action")
  ) {
    return null;
  }

  return <>{children}</>;
}
