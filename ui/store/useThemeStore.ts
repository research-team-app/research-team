import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type ThemeState = {
  darkMode: boolean;
  toggleDarkMode: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Set default.
      darkMode: false,

      //  The Action
      toggleDarkMode: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        //  manually touch the DOM because that is a "Side Effect"
        document.documentElement.classList.toggle("dark", next);
      },
    }),
    {
      name: "darkMode", // The key name in localStorage
      storage: createJSONStorage(() => localStorage),

      // This runs AUTOMATICALLY when the page loads (Rehydration)
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle("dark", state.darkMode);
        }
      },
    }
  )
);
