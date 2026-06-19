"use client";

// ─────────────────────────────────────────────────────────────
// [교수 LMS 모달] PLM-008 출결 수정 — 회차별 날짜 태그 편집
// - 출결 목록 행 '수정' 클릭 시 표시
// - 회차(수업일)별로 출석/지각/결석 토글 → 상단에 집계(출석·지각·결석·출석률) 실시간 미리보기
// - 저장 시 onSave(sessions) → 부모(페이지)가 mock 저장 + 목록/요약 갱신
// - 교수 화면 = slate 톤(§13). 데이터(student)는 부모가 주입 — 표시·편집만 담당
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import useEscapeClose from "@/components/lms/useEscapeClose";
import {
  ATTENDANCE_STATUS,
  AT_RISK_THRESHOLD,
  tallySessions,
  type AttendanceSession,
  type AttendanceStatus,
  type AttendanceStudentRow,
} from "@/lib/lmsProfessorAttendanceApi";

interface ProfessorAttendanceEditDialogProps {
  open: boolean;
  student: AttendanceStudentRow | null;
  lectureName: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (sessions: AttendanceSession[]) => void;
}

const STATUS_ORDER: AttendanceStatus[] = ["PRS", "LAT", "ABS"];

// 수업일 표시: "5월 25일 (월)" 식이 아니라 설계 톤에 맞춰 "2026.03.02"
const formatSessionDate = (date: string) => date.replace(/-/g, ".");

export default function ProfessorAttendanceEditDialog({
  open,
  student,
  lectureName,
  saving = false,
  onClose,
  onSave,
}: ProfessorAttendanceEditDialogProps) {
  useEscapeClose(open && !!student && !saving, onClose); // ESC = 취소(저장 중엔 비활성)

  // 로컬 편집 복사본 — 모달 열릴 때(학생 바뀔 때) 원본에서 리셋
  const [draft, setDraft] = useState<AttendanceSession[]>([]);
  useEffect(() => {
    if (open && student) setDraft(student.sessions.map((s) => ({ ...s })));
  }, [open, student]);

  if (!open || !student) return null;

  const preview = tallySessions(draft);
  const atRisk = preview.attendanceRate < AT_RISK_THRESHOLD;
  const dirty = JSON.stringify(draft) !== JSON.stringify(student.sessions);

  // 상태 변경 = 항상 확인창을 거친다(window.confirm, 프로젝트 공통 패턴). 이미 같은 상태면 무동작.
  const requestStatusChange = (session: AttendanceSession, target: AttendanceStatus) => {
    if (session.stdEnrAtdStsCode === target) return;
    if (!window.confirm(`${ATTENDANCE_STATUS[target].label}으로 변경하시겠습니까?`)) return;
    setDraft((prev) =>
      prev.map((s) => (s.sessionId === session.sessionId ? { ...s, stdEnrAtdStsCode: target } : s))
    );
  };

  // 2차 확인 — '변경사항 저장' 클릭 시 한 번 더 묻고 부모 onSave로 위임(부모가 실제 저장 = 현재 mock updateStudentAttendance,
  // BE 연동 시 PUT으로 교체). 상태 변경(1차)·저장(2차) 이중 확인을 거쳐야만 출결이 반영된다.
  const handleSaveClick = () => {
    if (!window.confirm("변경사항을 저장하시겠습니까?")) return;
    onSave(draft);
  };

  return (
    <div
      // 사이드바(w-60=240px) 제외한 본문 영역 기준 중앙 정렬
      className="fixed inset-y-0 right-0 left-60 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="출결 수정"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* 헤더 */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <span className="truncate" title={student.studentName}>
                {student.studentName}
              </span>
              <span className="shrink-0 text-sm font-normal text-slate-400">{student.studentNo}</span>
            </h3>
            <p className="mt-0.5 truncate text-xs text-slate-400" title={lectureName}>
              {lectureName} · 출결 수정
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="닫기"
            className="-mr-1 shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* 집계 미리보기 (실시간) */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-4 text-sm">
            <Count label="출석" value={preview.present} dot={ATTENDANCE_STATUS.PRS.dot} />
            <Count label="지각" value={preview.late} dot={ATTENDANCE_STATUS.LAT.dot} />
            <Count label="결석" value={preview.absent} dot={ATTENDANCE_STATUS.ABS.dot} />
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold leading-none ${atRisk ? "text-red-600" : "text-slate-900"}`}>
              {preview.attendanceRate}%
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">출석률{atRisk ? " · 위험" : ""}</p>
          </div>
        </div>

        {/* 회차별 편집 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="mb-2 text-xs text-slate-400">
            회차(수업일)별 상태를 눌러 변경하세요. 총 {preview.totalSessions}회차.
          </p>
          <ul className="space-y-1.5">
            {draft.map((s, i) => {
              const meta = ATTENDANCE_STATUS[s.stdEnrAtdStsCode];
              return (
                <li
                  key={s.sessionId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="w-9 shrink-0 text-xs font-medium text-slate-400">{i + 1}회</span>
                    <span className="text-sm text-slate-700">{formatSessionDate(s.stdEnrAtdRegDate)}</span>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {STATUS_ORDER.map((code) => {
                      const active = s.stdEnrAtdStsCode === code;
                      const m = ATTENDANCE_STATUS[code];
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => requestStatusChange(s, code)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                            active
                              ? `${m.tag} font-semibold`
                              : "border-transparent text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <span className="text-xs text-slate-400">{dirty ? "● 변경사항 있음" : "변경사항 없음"}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={saving || !dirty}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-800 px-5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "저장 중…" : "변경사항 저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Count({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-600">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {label} <span className="font-semibold text-slate-900">{value}</span>
    </span>
  );
}
