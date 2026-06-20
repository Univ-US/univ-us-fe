"use client";

// 교수 LMS "미채점 건수" 공유 스토어 (사이드바 배지 ↔ 채점 현황 화면)
// - 사이드바(layout) '채점 현황' 배지 = 항상 '전체' 학기의 미채점 합. 화면에서 어떤 학기를 골라도 배지는 전체.
// - 0이거나 미로딩/실패면 ungradedCount=null → 배지 숨김 (가짜 숫자로 가리지 않음).
// - 사이드바는 loadUngradedCount(BE 단일 카운트 엔드포인트)로 조회, 채점 화면(page)은 '전체' 볼 때만 setUngradedCount로 갱신.
import { create } from "zustand";
import { getUngradedCount } from "@/lib/lmsProfessorGradingApi";

interface LmsGradingState {
  ungradedCount: number | null; // null = 미로딩/실패 → 배지 숨김. 항상 '전체' 학기 기준.
  loading: boolean;
  /** 전 학기 미채점 합 조회 (사이드바 배지용). 실패 시 null(배지 숨김). PROF 전용. */
  loadUngradedCount: () => Promise<void>;
  /** 채점 화면이 '전체' 개요 totalUngraded로 갱신 */
  setUngradedCount: (count: number) => void;
}

export const useLmsGradingStore = create<LmsGradingState>((set, get) => ({
  ungradedCount: null,
  loading: false,

  // 배지는 '항상 전체 학기'의 미채점 합. BE 전용 카운트 엔드포인트(GET /grading/ungraded-count)가
  // 전 학기를 단일 SQL로 합산해 줌(overview.totalUngraded와 동일 규칙) → N+1 합산 불필요.
  loadUngradedCount: async () => {
    if (get().loading) return; // 중복 호출 방지
    set({ loading: true });
    try {
      set({ ungradedCount: await getUngradedCount() });
    } catch {
      set({ ungradedCount: null }); // 실패는 배지 숨김 (가짜 숫자 안 보임)
    } finally {
      set({ loading: false });
    }
  },

  setUngradedCount: (count) => set({ ungradedCount: count }),
}));
