"use client";

// 교수 LMS 프로필 공유 스토어 (single source of truth)
// - 폼(page)과 사이드바(layout)가 같은 profile을 구독 → 저장 시 한 곳만 갱신해도 동시 반영
// - GET은 1회만(중복 마운트 방지), 저장(PUT) 성공 시 응답으로 profile 교체
import { create } from "zustand";
import {
  getProfessorProfile,
  updateProfessorProfile,
  type LmsProfessorProfile,
  type LmsProfessorProfileUpdateInput,
} from "@/lib/lmsProfessorApi";

interface LmsProfileState {
  profile: LmsProfessorProfile | null;
  loading: boolean;
  /** 프로필 조회 (이미 로드됐거나 로딩 중이면 스킵) */
  load: () => Promise<void>;
  /** 강제 재조회 */
  reload: () => Promise<void>;
  /** 프로필 수정(PUT) → 응답으로 스토어 갱신 (사이드바·폼 동시 동기화) */
  update: (input: LmsProfessorProfileUpdateInput) => Promise<void>;
}

export const useProfessorProfileStore = create<LmsProfileState>((set, get) => ({
  profile: null,
  loading: false,

  load: async () => {
    if (get().loading || get().profile) return; // 폼·사이드바 동시 마운트 시 중복 GET 방지
    set({ loading: true });
    try {
      set({ profile: await getProfessorProfile() });
    } finally {
      set({ loading: false });
    }
  },

  reload: async () => {
    set({ loading: true });
    try {
      set({ profile: await getProfessorProfile() });
    } finally {
      set({ loading: false });
    }
  },

  update: async (input) => {
    const updated = await updateProfessorProfile(input);
    set({ profile: updated }); // ★ 여기 한 곳만 갱신 → 구독 중인 폼·사이드바 동시 반영
  },
}));
