"use client";

import { create } from "zustand";
import { getProfessorChatUnreadCount } from "@/lib/lmsProfessorChatApi";

interface LmsProfessorChatState {
  unreadCount: number | null;
  loading: boolean;
  loadUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

export const useLmsProfessorChatStore = create<LmsProfessorChatState>((set, get) => ({
  unreadCount: null,
  loading: false,

  loadUnreadCount: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const count = await getProfessorChatUnreadCount();
      set({ unreadCount: count });
    } catch {
      set({ unreadCount: null });
    } finally {
      set({ loading: false });
    }
  },

  setUnreadCount: (count) => set({ unreadCount: count }),
}));
