"use client";

// 로그인 사용자에 종속된 LMS 스토어 일괄 초기화 헬퍼.
// - LMS 레이아웃의 로그아웃(handleLogout)에서 호출 → 다음 사용자가 로그인해도
//   사이드바에 이전 계정의 프로필/배지가 남지 않게 한다.
// - 배경: 프로필 스토어 load()에 "이미 profile이 있으면 GET 스킵" 가드가 있어,
//   로그아웃 시 초기화하지 않으면(Zustand 싱글톤은 새로고침 전까지 메모리에 잔존)
//   다른 계정으로 재로그인해도 재조회를 건너뛰어 이전 프로필이 그대로 보였다.
import { useStudentProfileStore } from "@/store/lms/lmsStudentProfileStore";
import { useProfessorProfileStore } from "@/store/lms/lmsProfessorProfileStore";
import { useLmsStudentChatStore } from "@/store/lms/lmsStudentChatStore";
import { useLmsProfessorChatStore } from "@/store/lms/lmsProfessorChatStore";
import { useLmsStudentAssignmentStore } from "@/store/lms/lmsStudentAssignmentStore";
import { useLmsGradingStore } from "@/store/lms/lmsGradingStore";

/**
 * per-user LMS 스토어(프로필·채팅 안읽음·과제 미제출·미채점 배지)를 초기 상태로 되돌린다.
 * setState는 부분 병합이라 데이터 필드만 초기화하고 액션은 보존한다.
 * (학생/교수 양쪽 스토어를 함께 비우지만, 비어 있는 스토어 초기화는 무해한 no-op.)
 */
export const resetLmsUserStores = () => {
  useStudentProfileStore.setState({ profile: null, loading: false });
  useProfessorProfileStore.setState({ profile: null, loading: false });
  useLmsStudentChatStore.setState({ unreadCount: null, loading: false });
  useLmsProfessorChatStore.setState({ unreadCount: null, loading: false });
  useLmsStudentAssignmentStore.setState({ submittableCount: null, loading: false });
  useLmsGradingStore.setState({ ungradedCount: null, loading: false });
};
