"use client";

// PLM-003-01 수강생 상세 리포트 다이얼로그
// - PLM-003(수강생 현황) 목록의 '상세' 클릭 시 표시
// - 출석률·과제 제출·평균 점수 요약 + 과제별 점수 + 출결 요약
// - 데이터(report)는 부모(페이지)가 주입 — 컴포넌트는 표시만 담당(프레젠테이셔널)
import { Button } from "@/components/ui/button";
import useEscapeClose from "@/components/lms/useEscapeClose";
import { getLmsAvatarColor } from "@/lib/lmsAvatar";
import { resolveImageUrl } from "@/lib/lmsProfessorStudentsApi";
import type { StudentReport } from "@/types/lmsProfessorStudents";

interface StudentReportDialogProps {
  open: boolean;
  loading?: boolean;
  report: StudentReport | null;
  error?: string | null; // 리포트 조회 실패 메시지 (BE 문제 표기)
  onClose: () => void;
}

export default function StudentReportDialog({
  open,
  loading = false,
  report,
  error = null,
  onClose,
}: StudentReportDialogProps) {
  useEscapeClose(open, onClose); // ESC = 닫기 버튼과 동일

  if (!open) return null;

  return (
    <div
      // 사이드바(w-60=240px)를 제외한 본문 영역 기준으로 중앙 정렬 (left-60)
      className="fixed inset-y-0 right-0 left-60 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="수강생 상세 리포트"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-800">수강생 상세 리포트</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              리포트를 불러오는 중…
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-red-500">
              ⚠ 리포트를 불러오지 못했습니다 — {error}
            </div>
          ) : !report ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              데이터가 없습니다.
            </div>
          ) : (
            <>
              {/* 학생 식별 */}
              <div className="mb-5 flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full ${getLmsAvatarColor(report.studentNo)} text-lg font-semibold text-white`}>
                  {resolveImageUrl(report.imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveImageUrl(report.imageUrl)!} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (report.studentName.trim()[0] ?? "?")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-slate-900">{report.studentName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {report.studentNo} · {report.lectureName}
                  </p>
                </div>
              </div>

              {/* 요약 3분할 */}
              <div className="mb-6 grid grid-cols-3 gap-3">
                <SummaryCell label="출석률" value={`${report.attendanceRate}%`} />
                <SummaryCell
                  label="과제 제출"
                  value={`${report.submittedCount} / ${report.totalAssignments}`}
                />
                <SummaryCell
                  label="평균 점수"
                  value={report.averageScore != null ? `${report.averageScore}` : "-"}
                />
              </div>

              {/* 과제별 점수 */}
              <section className="mb-6">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">■ 과제별 점수</h4>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {report.assignmentScores.map((a) => (
                    <li key={a.assignmentId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-slate-700">{a.lecAsnTitle}</span>
                      {!a.submitted ? (
                        <span className="text-xs font-medium text-red-500">미제출</span>
                      ) : !a.scored ? (
                        <span className="text-xs font-medium text-amber-600">미채점</span>
                      ) : (
                        <span className="font-semibold text-slate-900">{a.asnSbmEvlScore}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              {/* 출결 요약 */}
              <section>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">■ 출결 요약</h4>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  <AttendanceRow label="출석" value={`${report.attendancePresent}회`} tone="text-slate-900" />
                  <AttendanceRow label="지각" value={`${report.attendanceLate}회`} tone="text-amber-600" />
                  <AttendanceRow label="결석" value={`${report.attendanceAbsent}회`} tone="text-red-500" />
                </ul>
              </section>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <Button
            size="lg"
            onClick={onClose}
            className="bg-slate-800 text-white hover:bg-slate-700"
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-4 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function AttendanceRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <li className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-slate-700">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </li>
  );
}
