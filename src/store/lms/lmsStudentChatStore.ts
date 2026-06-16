"use client";

import { create } from "zustand";
import { getChatUnreadCount } from "@/lib/lmsStudentChatApi";

interface LmsStudentChatState {
  unreadCount: number | null;
  loading: boolean;
  loadUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

export const useLmsStudentChatStore = create<LmsStudentChatState>((set, get) => ({
  unreadCount: null,
  loading: false,

  loadUnreadCount: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const count = await getChatUnreadCount();
      set({ unreadCount: count });
    } catch {
      set({ unreadCount: null });
    } finally {
      set({ loading: false });
    }
  },

  setUnreadCount: (count) => set({ unreadCount: count }),
}));
