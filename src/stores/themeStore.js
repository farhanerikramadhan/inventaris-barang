import { create } from "zustand";

export const useThemeStore = create((set) => {
  const saved = localStorage.getItem("theme") || "light";
  
  // Set class awal
  if (saved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  return {
    theme: saved,
    toggleTheme: () => {
      set((state) => {
        const next = state.theme === "light" ? "dark" : "light";
        localStorage.setItem("theme", next);
        if (next === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
        return { theme: next };
      });
    },
  };
});