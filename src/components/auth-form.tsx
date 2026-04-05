"use client";

import { useState, useEffect } from "react";
import Lottie from "lottie-react";
import catLoading from "../../public/lotties/cat-loading.json";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const NEXTAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already registered with a different sign-in method. Please use email/password instead.",
  OAuthSignin: "Could not start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in failed. Please try again.",
  OAuthCreateAccount: "Could not create account with Google. Please try again.",
  EmailCreateAccount: "Could not create account. Please try again.",
  Callback: "Authentication callback error. Please try again.",
  Default: "An authentication error occurred. Please try again.",
};

type Mode = "login" | "register";

interface AuthFormProps extends React.ComponentProps<"div"> {
  mode: Mode;
}

export function AuthForm({ mode, className, ...props }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLogin = mode === "login";
  const setAuth = useAuthStore((s) => s.setAuth);

  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Clear all stale auth state when landing on the login page
  useEffect(() => {
    if (isLogin) {
      clearAuth()
      signOut({ redirect: false })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [redirecting, setRedirecting] = useState<{ name: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Show NextAuth error passed via ?error= query param (e.g. after Google OAuth failure)
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const msg =
        NEXTAUTH_ERROR_MESSAGES[error] ?? NEXTAUTH_ERROR_MESSAGES.Default;
      toast.error(msg);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;
    const name = !isLogin
      ? (form.elements.namedItem("name") as HTMLInputElement).value
      : undefined;

    if (!isLogin) {
      const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        setLoading(false);
        return;
      }
    }

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Something went wrong. Please try again.";
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (isLogin) {
        setAuth(data.user, data.token);
        document.cookie = `auth-token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        setRedirecting({ name: data.user?.name ?? "" });
        setTimeout(() => router.push("/workspaces"), 1800);
      } else {
        toast.success("Account created successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 1000);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      // Store the action type (signup or login) in sessionStorage
      sessionStorage.setItem("auth-action", isLogin ? "login" : "signup");

      // Redirect to workspaces, then validate there
      const result = await signIn("google", {
        callbackUrl: "/workspaces",
        redirect: true,
      });
    } catch (error) {
      console.error("[Google SignIn Error]", error);
      toast.error("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  if (redirecting !== null || googleLoading) {
    const firstName = redirecting?.name.split(" ")[0] ?? "";
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
        <Lottie animationData={catLoading} loop className="size-48" />
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-lg font-semibold tracking-tight text-foreground">
            {firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}
          </p>
          <p className="text-sm text-muted-foreground">Opening your workspaces…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isLogin ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Login with your Apple or Google account"
              : "Sign up with your Apple or Google account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <Button
                  variant="outline"
                  type="button"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                  className="cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  {googleLoading
                    ? "Redirecting..."
                    : isLogin
                      ? "Login with Google"
                      : "Sign up with Google"}
                </Button>
              </Field>
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">Or continue with</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              {!isLogin && (
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    required
                  />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {isLogin && (
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
              {!isLogin && (
                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="pr-10 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
              )}
              <Field>
                <Button className="w-full cursor-pointer" type="submit" disabled={loading}>
                  {loading
                    ? isLogin
                      ? "Logging in..."
                      : "Creating account..."
                    : isLogin
                      ? "Login"
                      : "Create account"}
                </Button>
                <FieldDescription className="text-center">
                  {isLogin ? (
                    <>
                      Don&apos;t have an account?{" "}
                      <a
                        href="/register"
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Sign up
                      </a>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <a
                        href="/login"
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Login
                      </a>
                    </>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
