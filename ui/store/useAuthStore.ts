import { create } from "zustand";
import {
  signUp,
  signIn,
  signOut,
  confirmSignUp,
  resendSignUpCode,
  fetchUserAttributes,
  fetchAuthSession,
  getCurrentUser,
  resetPassword,
  confirmResetPassword,
  signInWithRedirect,
} from "aws-amplify/auth";

export type AuthUser = {
  id: string;
  username: string;
  attributes: Record<string, string | undefined>;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;

  // Actions
  signUp: (
    email: string,
    pass: string,
    first: string,
    last: string
  ) => Promise<unknown>;
  confirmSignUp: (username: string, code: string) => Promise<void>;
  signIn: (username: string, pass: string) => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  forgotPassword: (username: string) => Promise<void>;
  confirmForgotPassword: (
    username: string,
    code: string,
    newPass: string
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resendVerificationCode: (email: string) => Promise<void>;
  clearAuthStorage: () => void;

  // Utilities
  loadUser: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  clearAuthStorage: () => {
    if (typeof window === "undefined") return;

    const AMPLIFY_PREFIXES = [
      "CognitoIdentityServiceProvider.",
      "amplify-",
      "aws-amplify-",
    ];

    const shouldRemove = (key: string): boolean => {
      return AMPLIFY_PREFIXES.some((prefix) => key.startsWith(prefix));
    };

    const localKeys = Object.keys(window.localStorage);
    for (const key of localKeys) {
      if (shouldRemove(key)) window.localStorage.removeItem(key);
    }

    const sessionKeys = Object.keys(window.sessionStorage);
    for (const key of sessionKeys) {
      if (shouldRemove(key)) window.sessionStorage.removeItem(key);
    }
  },

  user: null,
  loading: false,

  /* 1. Sign Up */
  signUp: async (email, password, firstName, lastName) => {
    const normalizedEmail = email.trim().toLowerCase();
    // Amplify handles the hash and security automatically
    return await signUp({
      username: normalizedEmail,
      password,
      options: {
        userAttributes: {
          email: normalizedEmail,
          given_name: firstName, // Standard Cognito Attribute
          family_name: lastName, // Standard Cognito Attribute
        },
      },
    });
  },

  /* Resend Confirmation Code */
  resendVerificationCode: async (email: string) => {
    await resendSignUpCode({ username: email.trim().toLowerCase() });
  },

  /* Confirm Sign Up */
  confirmSignUp: async (username, code) => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedCode = code.replace(/\s+/g, "").trim();
    await confirmSignUp({
      username: normalizedUsername,
      confirmationCode: normalizedCode,
    });
  },

  /* Sign In */
  signIn: async (username, password): Promise<AuthUser | null> => {
    const normalizedUsername = username.trim().toLowerCase();
    set({ loading: true });
    try {
      const result = await signIn({ username: normalizedUsername, password });
      if (result.isSignedIn) {
        await get().loadUser();
        return get().user;
      }
      return null;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "UserAlreadyAuthenticatedException"
      ) {
        // Stale session in localStorage — clear it and retry once.
        try {
          await signOut();
        } catch {
          // ignore — session may already be invalid
        }
        get().clearAuthStorage();
        const result = await signIn({ username: normalizedUsername, password });
        if (result.isSignedIn) {
          await get().loadUser();
          return get().user;
        }
        return null;
      }
      console.error("Sign in failed", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /* 4. Sign Out */
  signOut: async () => {
    set({ loading: true });
    try {
      await signOut({ global: true });
      get().clearAuthStorage();
      set({ user: null });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-signed-out"));
      }
    } finally {
      set({ loading: false });
    }
  },

  /* Forgot Password (Request Code) */
  forgotPassword: async (username: string) => {
    await resetPassword({ username: username.trim().toLowerCase() });
  },

  /*  Confirm Forgot Password (Submit Code + New Password) */
  confirmForgotPassword: async (
    username: string,
    code: string,
    newPass: string
  ) => {
    await confirmResetPassword({
      username: username.trim().toLowerCase(),
      confirmationCode: code.replace(/\s+/g, "").trim(),
      newPassword: newPass,
    });
  },

  /* 5. Load User (Replaces reloadUserFromTokens) */
  loadUser: async () => {
    try {
      // Check if we have a valid session first
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();

      // Always use Cognito `sub` as canonical id (matches JWT / DB); userId can be absent in some flows.
      const sub =
        (attributes as Record<string, string | undefined>).sub ??
        currentUser.userId;
      if (!sub) {
        set({ user: null });
        return;
      }
      const user: AuthUser = {
        id: sub,
        username: currentUser.username,
        attributes: attributes as Record<string, string>,
      };
      set({ user });
    } catch {
      set({ user: null });
    }
  },

  /*  Get Token  */
  getAccessToken: async () => {
    try {
      // Amplify automatically refreshes the token if needed here!
      const session = await fetchAuthSession();
      return session.tokens?.accessToken.toString() || null;
    } catch {
      return null;
    }
  },
  /* Login with Google */
  loginWithGoogle: async () => {
    set({ loading: true });
    try {
      // This will redirect the browser away from your app to Google.com
      await signInWithRedirect({ provider: "Google" });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "UserAlreadyAuthenticatedException"
      ) {
        // Stale/expired session in localStorage. Clear it and retry the redirect.
        try {
          await signOut({ global: true });
        } catch {
          // ignore — session may already be invalid
        }
        get().clearAuthStorage();
        await signInWithRedirect({ provider: "Google" });
        set({ loading: false });
        return;
      }
      set({ loading: false });
      throw error;
    }
  },
}));
