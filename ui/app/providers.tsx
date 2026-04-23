"use client";

import { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Amplify } from "aws-amplify";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import ChatDock from "@/components/ChatDock";
import ToastContainer from "@/components/ToastContainer";
import { ensureUserProfile } from "@/lib/ensureUserProfile";
import { useToastStore } from "@/store/useToastStore";
import {
  REDIRECT_SIGN_IN_GOOGLE,
  REDIRECT_SIGN_OUT_GOOGLE,
} from "@/data/global";
import { useGrantsCacheStore } from "@/store/useGrantStore";
import { useCollaboratorsCacheStore } from "@/store/useCollaborator";
import { useWishlistStore } from "@/store/useWishListStore";

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Set it in .env.local (dev) or in your build/deploy environment.`
    );
  }
  return value;
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: requireEnv(
        "NEXT_PUBLIC_COGNITO_USER_POOL_ID",
        process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
      ),
      userPoolClientId: requireEnv(
        "NEXT_PUBLIC_COGNITO_CLIENT_ID",
        process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
      ),
      loginWith: {
        oauth: {
          domain: requireEnv(
            "NEXT_PUBLIC_COGNITO_DOMAIN",
            process.env.NEXT_PUBLIC_COGNITO_DOMAIN
          ),
          scopes: [
            "email",
            "openid",
            "profile",
            "aws.cognito.signin.user.admin",
          ],
          redirectSignIn: [REDIRECT_SIGN_IN_GOOGLE],
          redirectSignOut: [REDIRECT_SIGN_OUT_GOOGLE],
          responseType: "code",
        },
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  // Create a client once for the application
  const [queryClient] = useState(() => new QueryClient());

  const darkMode = useThemeStore((state) => state.darkMode);
  const { loadUser, user } = useAuthStore();
  const ensuredUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!user?.id) {
      ensuredUserIdRef.current = null;
      return;
    }
    // Dedupe: only run once per distinct user id, even if `user` reference changes.
    if (ensuredUserIdRef.current === user.id) return;
    const idAtStart = user.id;
    ensuredUserIdRef.current = idAtStart;

    ensureUserProfile(user).catch((err) => {
      console.error(
        "[ensureUserProfile] failed:",
        err?.response?.data ?? err?.message ?? err
      );
      useToastStore
        .getState()
        .addToast("We couldn't sync your profile. Please refresh.", {
          variant: "error",
          duration: 4000,
        });
      // Allow retry on next mount/user change if it failed —
      // compare against the id captured when this effect started,
      // so a newer logged-in user's guard is never cleared by a stale failure.
      if (ensuredUserIdRef.current === idAtStart) {
        ensuredUserIdRef.current = null;
      }
    });
  }, [user]);

  useEffect(() => {
    const handleSignedOut = () => {
      queryClient.clear();
      useGrantsCacheStore.getState().reset();
      useCollaboratorsCacheStore.getState().reset();
      useWishlistStore.getState().reset();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("auth-signed-out", handleSignedOut);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("auth-signed-out", handleSignedOut);
      }
    };
  }, [queryClient]);

  return (
    <div className={darkMode ? "dark" : ""}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-white text-black transition-colors duration-200 dark:bg-slate-900 dark:text-white">
          {children}
          <ChatDock />
          <ToastContainer />
        </div>
      </QueryClientProvider>
    </div>
  );
}
