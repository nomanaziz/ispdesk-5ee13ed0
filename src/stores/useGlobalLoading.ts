import { create } from "zustand";

interface GlobalLoadingState {
  count: number;
  message: string;
  active: boolean;
  start: (message?: string) => void;
  stop: () => void;
}

const DEFAULT_MSG = "অনুগ্রহ করে অপেক্ষা করুন...";

export const useGlobalLoading = create<GlobalLoadingState>((set, get) => ({
  count: 0,
  message: DEFAULT_MSG,
  active: false,
  start: (message) =>
    set((s) => ({
      count: s.count + 1,
      message: message || s.message || DEFAULT_MSG,
      active: true,
    })),
  stop: () => {
    const next = Math.max(0, get().count - 1);
    set({
      count: next,
      active: next > 0,
      message: next > 0 ? get().message : DEFAULT_MSG,
    });
  },
}));
