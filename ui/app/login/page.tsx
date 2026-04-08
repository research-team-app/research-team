"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import InputField from "@/components/ui/InputField";
import {
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
  UserIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import Logo from "@/components/Logo";
import { FaGoogle } from "react-icons/fa";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  RESEARCHER_DEFAULT_VALUES,
  type ResearcherProfile,
} from "@/store/useProfileStore";
import { useRouter } from "next/navigation";
import { API_URL } from "@/data/global";
import Toast, { type ToastVariant } from "@/components/ui/Toast";
import { ensureUserProfile } from "@/lib/ensureUserProfile";

type View = "signup" | "login" | "forgot" | "confirmForgot" | "verifyEmail";

export default function Login() {
  const {
    signUp,
    confirmSignUp,
    signIn,
    forgotPassword,
    confirmForgotPassword,
    loading: storeLoading,
    loginWithGoogle,
    resendVerificationCode,
  } = useAuthStore();

  const [view, setView] = useState<View>("login");
  const { user } = useAuthStore();

  // common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // forgot/verify flows
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<ToastVariant>("info");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const authInputClass =
    "bg-transparent dark:bg-transparent border-zinc-300 dark:border-slate-500";

  function friendlyAuthError(err: unknown): string {
    const raw =
      (err as { message?: string; name?: string })?.message ||
      (err as { name?: string })?.name ||
      "";
    const text = String(raw).toLowerCase();

    if (
      text.includes("notauthorized") ||
      text.includes("incorrect username or password") ||
      text.includes("incorrect") ||
      text.includes("password")
    ) {
      return "Incorrect email or password. Please try again.";
    }
    if (text.includes("user not found")) {
      return "Account not found. Please check your email or sign up.";
    }
    if (text.includes("too many") || text.includes("limit exceeded")) {
      return "Too many attempts. Please wait a moment and try again.";
    }
    return "Unable to sign in right now. Please try again.";
  }

  function notify(msg: string, type: "info" | "error" | "success" = "info") {
    setMessage(msg);
    setMessageType(type);
  }

  // Sign up
  async function handleSignUp(e?: React.FormEvent) {
    e?.preventDefault();
    notify(null as unknown as string);
    setLoginError(null);
    if (password !== confirmPassword) {
      notify("Passwords do not match.", "error");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, firstName, lastName);
      notify(
        "Sign up sent. Enter the code sent to your email to verify.",
        "success"
      );
      setView("verifyEmail");
    } catch (err: unknown) {
      notify((err as { message?: string })?.message ?? String(err), "error");
    } finally {
      setLoading(false);
    }
  }

  // Login
  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    notify(null as unknown as string);
    setLoginError(null);
    setLoading(true);
    try {
      const user = await signIn(email, password);
      notify(`Login success. Welcome ${user?.username}!`, "success");
      // Best-effort — providers.tsx will retry on mount if this fails.
      await ensureUserProfile(user ?? null).catch(() => {});
      fetch(`${API_URL}/users/${user?.id}`)
        .then((res) => res.json())
        .then((data: Record<string, unknown>) => {
          const normalized: ResearcherProfile = {
            ...RESEARCHER_DEFAULT_VALUES,
            ...data,
            research_interests: (data.research_interests as string[]) ?? [],
            education: (data.education as ResearcherProfile["education"]) ?? [],
            current_projects:
              (data.current_projects as ResearcherProfile["current_projects"]) ??
              [],
            academic_status: {
              ...RESEARCHER_DEFAULT_VALUES.academic_status,
              ...((data.academic_status as Record<string, boolean>) ?? {}),
            },
          };
          queryClient.setQueryData(["profile", user?.id], normalized);
        })
        .catch(() => {});

      router.replace("/");
    } catch (err: unknown) {
      const errName = (err as { name?: string })?.name || "";
      if (errName === "UserNotConfirmedException") {
        notify(
          "Your email hasn't been verified yet. Enter the code sent to your inbox.",
          "info"
        );
        setView("verifyEmail");
        return;
      }
      setLoginError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  // Start forgot password (sends code)
  async function handleForgot(e?: React.FormEvent) {
    e?.preventDefault();
    notify(null as unknown as string);
    setLoginError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      notify(
        `If account exists, a code has been sent to your email. Enter the code and new password.`,
        "success"
      );
      setView("confirmForgot");
    } catch (err: unknown) {
      const errName = (err as { name?: string })?.name || "";
      const errMsg = (err as { message?: string })?.message || "";
      // Cognito cannot reset password for an account whose email is not yet verified.
      if (
        errName === "InvalidParameterException" &&
        errMsg.toLowerCase().includes("registered/verified")
      ) {
        notify(
          "This account's email hasn't been verified. Enter the code we sent you when you signed up.",
          "info"
        );
        setView("verifyEmail");
        return;
      }
      notify(errMsg || String(err), "error");
    } finally {
      setLoading(false);
    }
  }

  // Confirm forgot password (use code + new password)
  async function handleConfirmForgot(e?: React.FormEvent) {
    e?.preventDefault();
    notify(null as unknown as string);
    setLoginError(null);
    setLoading(true);
    try {
      await confirmForgotPassword(email, code, password);
      notify(
        "Password reset complete. You can now sign in with the new password.",
        "success"
      );
      // Redirect to login view
      setView("login");
    } catch (err: unknown) {
      notify((err as { message?: string })?.message ?? String(err), "error");
    } finally {
      setLoading(false);
    }
  }

  // Verify email after sign up
  async function handleVerifyEmail(e?: React.FormEvent) {
    e?.preventDefault();
    notify(null as unknown as string);
    setLoginError(null);
    setLoading(true);
    try {
      await confirmSignUp(email, code);
      notify("Email verified! You can now sign in.", "success");
      setView("login");
    } catch (err: unknown) {
      const errName = (err as { name?: string })?.name || "";
      const errMsg = (err as { message?: string })?.message || "";
      // Cognito throws NotAuthorizedException when the user is already confirmed
      // (e.g. they verified successfully but the page didn't redirect, or they
      // re-entered a code after a partial sign-up). Treat as success — they can sign in.
      if (
        errName === "NotAuthorizedException" &&
        errMsg.toLowerCase().includes("confirmed")
      ) {
        notify(
          "Your email is already verified. You can sign in now.",
          "success"
        );
        setView("login");
        return;
      }
      notify(errMsg || String(err), "error");
    } finally {
      setLoading(false);
    }
  }

  const titleByView: Record<View, string> = {
    signup: "Create your account",
    login: "Welcome back",
    forgot: "Reset your password",
    confirmForgot: "Set a new password",
    verifyEmail: "Verify your email",
  };

  const subtitleByView: Record<View, string> = {
    signup: "Start your journey in a few seconds.",
    login: "Sign in to continue.",
    forgot: "Enter your email to receive a reset code.",
    confirmForgot: "Enter the code you received and choose a new password.",
    verifyEmail: "Enter the verification code we emailed you.",
  };

  useEffect(() => {
    if (user) {
      router.replace("/"); // 'replace' prevents going back to login
    }
  }, [user, router]);

  useEffect(() => {
    setLoginError(null);
    setConfirmPassword("");
    setShowConfirmPassword(false);
  }, [view]);

  // Prevent UI flicker: If user is logged in, show nothing while redirecting
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-slate-50 to-white p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-lg items-center justify-center">
        <div className="w-full rounded-xl bg-white p-6 shadow-lg ring-1 ring-black/5 sm:p-8 dark:border dark:border-slate-700 dark:bg-slate-900/90 dark:ring-white/5">
          {/* Brand / Icon */}
          <div className="flex justify-center pb-6">
            <Logo />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-white">
              <KeyIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-slate-100">
                {titleByView[view]}
              </h1>
              <p className="text-sm text-zinc-600 dark:text-slate-300">
                {subtitleByView[view]}
              </p>
            </div>
          </div>

          {/* Status */}
          {message && !(view === "login" && messageType === "error") && (
            <div className="mb-4">
              <Toast
                variant={messageType}
                isOpen={!!message}
                onClose={() => setMessage(null)}
                position="default"
              >
                {message}
              </Toast>
            </div>
          )}

          {/* Forms */}
          {view === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <InputField
                id="signup-email"
                required
                type="email"
                label="Email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                startIcon={<EnvelopeIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
              />
              <InputField
                id="signup-first-name"
                required
                label="First name"
                placeholder="Your First Name"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                startIcon={<UserIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
              />
              <InputField
                id="signup-last-name"
                required
                label="Last name"
                placeholder="Your Last Name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                startIcon={<UserIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
              />
              <InputField
                id="signup-password"
                required
                type={showPassword ? "text" : "password"}
                label="Password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                startIcon={<LockClosedIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                }
              />
              <InputField
                id="signup-confirm-password"
                required
                type={showConfirmPassword ? "text" : "password"}
                label="Confirm password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                startIcon={<LockClosedIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    title={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                }
              />
              <Button
                type="submit"
                intent="primary"
                variant="solid"
                fullWidth
                loading={loading || storeLoading}
              >
                Create account
              </Button>

              <p className="text-center text-sm text-zinc-600 dark:text-slate-300">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/20">
                  <div className="flex items-start gap-2">
                    <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      {loginError}
                    </p>
                  </div>
                </div>
              )}

              <InputField
                id="login-email"
                required
                type="email"
                label="Email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                startIcon={<EnvelopeIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
              />
              <InputField
                id="login-password"
                required
                type={showPassword ? "text" : "password"}
                label="Password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                startIcon={<LockClosedIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                }
              />

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => setView("forgot")}
                    className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                intent="primary"
                variant="solid"
                fullWidth
                loading={loading}
                startIcon={<ArrowRightOnRectangleIcon className="h-5 w-5" />}
              >
                Sign in
              </Button>

              {/* sign in with Google part */}
              <div className="flex items-center justify-center space-x-4">
                <Button
                  startIcon={<FaGoogle className="h-5 w-5" />}
                  type="button"
                  intent="primary"
                  variant="outline"
                  onClick={async () => {
                    setGoogleLoading(true);
                    try {
                      await loginWithGoogle();
                    } finally {
                      setGoogleLoading(false);
                    }
                  }}
                  className="w-full"
                  loading={googleLoading}
                  disabled={loading || storeLoading}
                >
                  Sign in with Google
                </Button>
              </div>
              <p className="text-center text-sm text-zinc-600 dark:text-slate-300">
                New here?{" "}
                <button
                  type="button"
                  onClick={() => setView("signup")}
                  className="cursor-pointer font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  Create an account
                </button>
              </p>
            </form>
          )}

          {view === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              <InputField
                id="forgot-email"
                required
                type="email"
                label="Email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                startIcon={<EnvelopeIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
              />
              <Button
                type="submit"
                intent="primary"
                variant="solid"
                fullWidth
                loading={loading || storeLoading}
              >
                Send reset code
              </Button>

              <p className="text-center text-sm text-zinc-600 dark:text-slate-300">
                Remembered it?{" "}
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  Back to sign in
                </button>
              </p>
            </form>
          )}

          {view === "verifyEmail" && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <InputField
                id="verify-email"
                required
                type="email"
                label="Email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                startIcon={<EnvelopeIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
              />
              <InputField
                id="verify-code"
                required
                label="Verification code"
                placeholder="Enter the code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                startIcon={<KeyIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
              />
              <Button
                type="submit"
                intent="primary"
                variant="solid"
                fullWidth
                loading={loading || storeLoading}
              >
                Verify email
              </Button>

              <p className="text-center text-sm text-zinc-600 dark:text-slate-300">
                Didn&apos;t receive a code? Check your spam or{" "}
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      notify("Enter your email above first.", "error");
                      return;
                    }
                    try {
                      await resendVerificationCode(email);
                      notify(
                        "A new verification code has been sent.",
                        "success"
                      );
                    } catch (err: unknown) {
                      notify(
                        (err as { message?: string })?.message ??
                          "Could not resend code.",
                        "error"
                      );
                    }
                  }}
                  className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  resend
                </button>
                .
              </p>
              <p className="text-center text-sm text-zinc-600 dark:text-slate-300">
                Already verified?{" "}
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  Go to sign in
                </button>
              </p>
            </form>
          )}

          {view === "confirmForgot" && (
            <form onSubmit={handleConfirmForgot} className="space-y-4">
              <InputField
                id="confirm-email"
                required
                type="email"
                label="Email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                startIcon={<EnvelopeIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
              />
              <InputField
                id="confirm-code"
                required
                label="Reset code"
                placeholder="Enter the code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                startIcon={<KeyIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
              />
              <InputField
                id="confirm-password"
                required
                type={showPassword ? "text" : "password"}
                label="New password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                startIcon={<LockClosedIcon className="h-5 w-5" />}
                inputClassName={authInputClass}
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                }
              />
              <Button
                type="submit"
                intent="primary"
                variant="solid"
                fullWidth
                loading={loading || storeLoading}
              >
                Confirm reset
              </Button>

              <p className="text-center text-sm text-zinc-600 dark:text-slate-300">
                Done?{" "}
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  Return to sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
