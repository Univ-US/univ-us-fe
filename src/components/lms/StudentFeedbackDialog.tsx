"use client";

// ─────────────────────────────────────────────────────────────
// [학생 LMS 모달] SLM-004-02 채점 피드백 보기
// - SLM-004(과제 내역) '채점완료' 행의 '피드백' 클릭 시 표시
// - 점수 + 교수 피드백 표시 (평가 항목/루브릭은 서비스 미구현 — 제외)
// - 학생 화면 = 에메랄드 톤(§13). 데이터(assignment)는 부모(페이지)가 주입 — 표시만 담당
// ─────────────────────────────────────────────────────────────
import useEscapeClose from "@/components/lms/useEscapeClose";
import { type StudentAssignment } from "@/lib/lmsStudentAssignmentsApi";

interface StudentFeedbackDialogProps {
  open: boolean;
  assignment: StudentAssignment | null;
  onClose: () => void;
}

export default function StudentFeedbackDialog({
  open,
  assignment,
  onClose,
}: StudentFeedbackDialogProps) {
  useEscapeClose(open && !!assignment, onClose); // ESC = ✕ 버튼과 동일

  if (!open || !assignment) return null;
  const fb = assignment.feedback;

  return (
    <div
      // 사이드바(w-60=240px)를 제외한 본문 영역 기준 중앙 정렬 (left-60)
      className="fixed inset-y-0 right-0 left-60 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="채점 피드백 보기"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* 헤더 — ✕ 제거(닫기는 푸터 버튼 / ESC로 처리) */}
        <div className="flex items-center border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-800">
            피드백 보기 <span className="text-slate-400">—</span> {assignment.lecAsnTitle}
          </h3>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!fb ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              피드백 데이터가 없습니다.
            </div>
          ) : (
            <>
              {/* 점수 박스 */}
              <div className="flex items-end justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-5 py-4">
                <p className="leading-none">
                  <span className="text-3xl font-bold text-emerald-700">{fb.asnSbmEvlScore}</span>
                  <span className="ml-1 text-sm text-emerald-600/70">/ {fb.maxScore}</span>
                </p>
                <p className="text-right text-xs text-slate-500">
                  {fb.courseName}
                  <br />
                  {fb.professor} 교수
                </p>
              </div>

              {/* 교수 피드백 */}
              <section className="mt-5">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">교수 피드백</h4>
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
                  {fb.asnSbmEvlFeedback}
                </p>
              </section>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
