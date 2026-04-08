"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Amplify } from "aws-amplify";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import ChatDock from "@/components/ChatDock";
import ToastContainer from "@/components/ToastContainer";
import { ensureUserProfile } from "@/lib/ensureUserProfile";
import {
  REDIRECT_SIGN_IN_GOOGLE,
  REDIRECT_SIGN_OUT_GOOGLE,
} from "@/data/global";
import { useGrantsCacheStore } from "@/store/useGrantStore";
import { useCollaboratorsCacheStore } from "@/store/useCollaborator";
import { useWishlistStore } from "@/store/useWishListStore";

// configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
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

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    let active = true;
    if (!user?.id) return;

    ensureUserProfile(user).catch((err) => {
      if (!active) return;
      console.error(
        "[ensureUserProfile] failed:",
        err?.response?.data ?? err?.message ?? err
      );
    });

    return () => {
      active = false;
    };
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
        <div className="min-h-screen bg-white text-black transition-colors duration-200 dark:bg-slate-900/95 dark:text-white">
          {children}
          <ChatDock />
          <ToastContainer />
        </div>
      </QueryClientProvider>
    </div>
  );
}
