"use client";

import { create } from "zustand";
import { getSubmittableAssignments } from "@/lib/lmsStudentSubmitApi";

interface LmsStudentAssignmentState {
  submittableCount: number | null;
  loading: boolean;
  loadSubmittableCount: () => Promise<void>;
  setSubmittableCount: (count: number) => void;
}

export const useLmsStudentAssignmentStore = create<LmsStudentAssignmentState>((set, get) => ({
  submittableCount: null,
  loading: false,

  loadSubmittableCount: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const items = await getSubmittableAssignments();
      set({ submittableCount: items.length });
    } catch {
      set({ submittableCount: null });
    } finally {
      set({ loading: false });
    }
  },

  setSubmittableCount: (count) => set({ submittableCount: count }),
}));
