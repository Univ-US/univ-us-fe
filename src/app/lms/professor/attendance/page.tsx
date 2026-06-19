"use client";

// PLM-008 — 교수 "출결 관리" (강의별 학생 출석·지각·결석 조회 및 수정)
// - 상단: 학기 + 강의 드롭다운 (담당 강의에서 유도)
// - 통계 카드 4개: 수강생 / 평균 출석률 / 지각 누계 / 결석 위험(≤70%)
// - 목록 테이블: 학생별 출석·지각·결석·출석률 + '수정'(회차 태그 편집 모달)
// - 출석률 70% 미만 학생은 붉은 배경 / 접근=교수(PROF) 전용 — ADM·SUA는 교수 LMS 미진입(어드민 출결 열람은 학교관리자 BO 별도 화면)
// ✅ BE 연동(2026-06-16): /api/lms/professor/attendance/** (lib: lmsProfessorAttendanceApi).
// ⚠️ 실패 시 가짜 데이터로 가리지 않고 에러 상태 표기(describeApiError).
import { useCallback, useEffect, useMemo, useState } from "react";
import ProfessorAttendanceEditDialog from "@/components/lms/ProfessorAttendanceEditDialog";
import {
  getAttendanceLectures,
  getLectureAttendance,
  updateStudentAttendance,
  summarize,
  termLabel,
  ATTENDANCE_STATUS,
  AT_RISK_THRESHOLD,
} from "@/lib/lmsProfessorAttendanceApi";
import type {
  AttendanceLecture,
  AttendanceSession,
  AttendanceStatus,
  AttendanceStudentRow,
  LectureAttendance,
} from "@/types/lmsProfessorAttendance";
import { describeApiError } from "@/lib/lmsApiError";
import { getLmsAvatarColor } from "@/lib/lmsAvatar";

// 학기 정렬 순서(SEM_TERM) — 학기 드롭다운 정렬용
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];

// (년도, 학기) 조합에 매칭되는 강의들. 둘 다 'all'이면 전체. — PLM-003 수강생 현황과 동일 패턴
const matchLectures = (
  year: number | "all",
  term: string | "all",
  lecs: AttendanceLecture[]
): AttendanceLecture[] =>
  lecs.filter((l) => (year === "all" || l.semYear === year) && (term === "all" || l.semTerm === term));

export default function ProfessorAttendancePage() {
  const [lectures, setLectures] = useState<AttendanceLecture[]>([]);
  // 년도·학기 분리 필터 — 기본값 둘 다 '전체'(전 화면 공통 규칙)
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [selectedLecId, setSelectedLecId] = useState<number | null>(null);

  const [data, setData] = useState<LectureAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 수정 모달
  const [editing, setEditing] = useState<AttendanceStudentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // 지각/결석 날짜 팝오버 — 키 `${memberId}-LAT` | `${memberId}-ABS`
  const [openPop, setOpenPop] = useState<string | null>(null);

  // 구조 로드(마운트): 담당 강의 → 기본 '전체/전체' → 첫 강의 선택
  useEffect(() => {
    (async () => {
      try {
        const lecs = await getAttendanceLectures();
        setLectures(lecs);
        // 딥링크(강의 내역 PLM-002 '출결 관리'): ?lecId= 가 담당 강의에 있으면 그 강의, 없으면 첫 강의
        const all = matchLectures("all", "all", lecs);
        const requested = new URLSearchParams(window.location.search).get("lecId");
        const requestedId = requested ? Number(requested) : null;
        const lecId =
          requestedId != null && all.some((l) => l.lecId === requestedId)
            ? requestedId
            : all[0]?.lecId ?? null;
        setSelectedLecId(lecId);
        if (lecId == null) setLoading(false);
      } catch (e) {
        setError(describeApiError(e));
        setLoading(false);
      }
    })();
  }, []);

  // 출결 조회: 선택 강의 변경 시
  const loadAttendance = useCallback(async (lecId: number) => {
    setLoading(true);
    setError(null);
    setOpenPop(null); // 강의/필터 변경 시 열린 팝오버 닫기
    try {
      const res = await getLectureAttendance(lecId);
      setData(res);
    } catch (e) {
      setError(describeApiError(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLecId == null) return;
    void loadAttendance(selectedLecId);
  }, [selectedLecId, loadAttendance]);

  // 년도/학기 옵션(담당 강의에서 유도 — 강의 있는 년도/학기만) + 필터링된 강의
  const yearOptions = useMemo(
    () => [...new Set(lectures.map((l) => l.semYear))].sort((a, b) => b - a),
    [lectures]
  );
  const termOptions = useMemo(
    () =>
      [...new Set(lectures.map((l) => l.semTerm))].sort(
        (a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b)
      ),
    [lectures]
  );
  const filteredLectures = useMemo(
    () => matchLectures(yearFilter, termFilter, lectures),
    [yearFilter, termFilter, lectures]
  );

  // 년도/학기 변경 → 강의 목록 좁힘 + 첫 강의 선택. 각 축 독립.
  const applyLectureFilter = (year: number | "all", term: string | "all") => {
    const lecId = matchLectures(year, term, lectures)[0]?.lecId ?? null;
    setSelectedLecId(lecId);
    if (lecId == null) {
      setData(null);
      setError(null);
      setLoading(false);
    }
  };
  const handleYearChange = (year: number | "all") => {
    setYearFilter(year);
    applyLectureFilter(year, termFilter);
  };
  const handleTermChange = (term: string | "all") => {
    setTermFilter(term);
    applyLectureFilter(yearFilter, term);
  };

  // 모달 저장: mock 저장 → 해당 행 교체 + 요약 재계산
  const handleSave = async (sessions: AttendanceSession[]) => {
    if (selectedLecId == null || !editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateStudentAttendance(selectedLecId, editing.memberId, sessions);
      setData((prev) => {
        if (!prev) return prev;
        const students = prev.students.map((s) => (s.memberId === updated.memberId ? updated : s));
        return { ...prev, students, summary: summarize(students) };
      });
      setEditing(null);
    } catch (e) {
      setSaveError(describeApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const summary = data?.summary;
  const students = data?.students ?? [];
  const lecture = data?.lecture ?? null;
  const lectureName = lecture?.lecName ?? "강의 선택";

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900">출결 관리</h1>
            <p className="flex items-center gap-1 text-sm text-slate-500" title={lectureName}>
              <span className="min-w-0 truncate">{lectureName}</span>
              <span className="shrink-0">· {summary?.totalStudents ?? 0}명</span>
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* 년도·학기 분리 필터 — 기본값 둘 다 '전체'(전 화면 공통 규칙) */}
            <select
              value={yearFilter === "all" ? "" : String(yearFilter)}
              onChange={(e) => handleYearChange(e.target.value === "" ? "all" : Number(e.target.value))}
              className={`${selectClass} w-28`}
            >
              <option value="">전체 년도</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              value={termFilter === "all" ? "" : termFilter}
              onChange={(e) => handleTermChange(e.target.value === "" ? "all" : e.target.value)}
              className={`${selectClass} w-32`}
            >
              <option value="">전체 학기</option>
              {termOptions.map((t) => (
                <option key={t} value={t}>
                  {termLabel(t)}
                </option>
              ))}
            </select>
            <select
              value={selectedLecId ?? ""}
              onChange={(e) => setSelectedLecId(Number(e.target.value))}
              disabled={filteredLectures.length === 0}
              className={`${selectClass} w-56 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
            >
              {filteredLectures.length === 0 ? (
                <option value="" disabled>
                  강의 없음
                </option>
              ) : (
                filteredLectures.map((l) => (
                  <option key={l.lecId} value={l.lecId} title={l.lecName}>
                    {l.lecName} · {l.lecSection}반
                  </option>
                ))
              )}
            </select>
          </div>
        </header>

        {/* 에러 안내 */}
        {error && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">⚠ {error}</p>
            <button
              type="button"
              onClick={() => selectedLecId != null && loadAttendance(selectedLecId)}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 통계 카드 4개 */}
        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="👥" tag="전체" value={summary ? `${summary.totalStudents}명` : "-"} sub="수강생" />
          <StatCard icon="✓" value={summary ? `${summary.averageAttendanceRate}%` : "-"} sub="평균 출석률" />
          <StatCard icon="⏱" value={summary ? `${summary.averageLateRate}%` : "-"} sub="평균 지각률" />
          <StatCard icon="⚠" value={summary ? `${summary.averageAbsentRate}%` : "-"} sub="평균 결석률" />
        </section>

        {/* 출결 현황 목록 */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <h2 className="flex min-w-0 items-center gap-1 text-base font-semibold text-slate-800">
              <span className="min-w-0 truncate" title={lectureName}>
                {lectureName}
              </span>
              <span className="shrink-0">— 출결 현황</span>
            </h2>
          </div>

          {/* 팝오버가 표 밖으로 펼쳐지므로 overflow 클리핑 없이(데스크톱 LMS, min-w로 폭 확보) */}
          <div>
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="px-5 py-3 font-medium">학생</th>
                  <th className="px-5 py-3 font-medium">출석</th>
                  <th className="px-5 py-3 font-medium">지각</th>
                  <th className="px-5 py-3 font-medium">결석</th>
                  <th className="px-5 py-3 font-medium">출석률</th>
                  <th className="py-3 pl-5 pr-5 text-right font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      불러오는 중…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-red-400">
                      데이터를 불러오지 못했습니다. 위 ‘다시 시도’를 눌러주세요.
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      표시할 수강생이 없습니다.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => {
                    const atRisk = s.attendanceRate < AT_RISK_THRESHOLD;
                    return (
                      <tr
                        key={s.enrollmentId}
                        className={`border-b border-slate-50 last:border-0 ${atRisk ? "bg-red-50/60" : ""}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ${getLmsAvatarColor(s.studentNo)} text-xs font-semibold text-white`}>
                              {s.studentName.trim()[0] ?? "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900" title={s.studentName}>
                                {s.studentName}
                              </p>
                              <p className="truncate text-xs text-slate-400">{s.studentNo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <CountCell value={s.present} dot={ATTENDANCE_STATUS.PRS.dot} />
                        </td>
                        <td className="px-5 py-3">
                          <AttendanceDateCell
                            status="LAT"
                            value={s.late}
                            sessions={s.sessions}
                            open={openPop === `${s.memberId}-LAT`}
                            onToggle={() =>
                              setOpenPop(openPop === `${s.memberId}-LAT` ? null : `${s.memberId}-LAT`)
                            }
                          />
                        </td>
                        <td className="px-5 py-3">
                          <AttendanceDateCell
                            status="ABS"
                            value={s.absent}
                            sessions={s.sessions}
                            open={openPop === `${s.memberId}-ABS`}
                            onToggle={() =>
                              setOpenPop(openPop === `${s.memberId}-ABS` ? null : `${s.memberId}-ABS`)
                            }
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${attendanceBarColor(s.attendanceRate)}`}
                                style={{ width: `${Math.min(100, s.attendanceRate)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold ${atRisk ? "text-red-600" : "text-slate-600"}`}>
                              {s.attendanceRate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pl-5 pr-5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSaveError(null);
                              setOpenPop(null);
                              setEditing(s);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            ✎ 수정
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 범례 (위험 행 표시 기준) */}
          {!loading && !error && students.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
              ⚠ 출석률 {AT_RISK_THRESHOLD}% 미만 학생은 붉은 배경으로 표시
            </div>
          )}
        </section>

        {/* 저장 실패 안내(모달 닫힘 후에도 표기) */}
        {saveError && (
          <p className="mt-3 text-sm text-red-600">⚠ 저장 실패 — {saveError}</p>
        )}
      </div>

      {/* 지각/결석 날짜 팝오버 바깥 클릭 닫기 백드롭 */}
      {openPop && <div className="fixed inset-0 z-40" onClick={() => setOpenPop(null)} />}

      {/* 출결 수정 모달 */}
      <ProfessorAttendanceEditDialog
        open={editing != null}
        student={editing}
        lectureName={lectureName}
        saving={saving}
        onClose={() => !saving && setEditing(null)}
        onSave={handleSave}
      />
    </main>
  );
}

// ── 헬퍼 ────────────────────────────────────────────────────
const selectClass =
  "shrink-0 truncate rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30";

type Tone = "slate" | "emerald" | "amber" | "red";
const TAG_TONE: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-500",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-600",
};

function StatCard({
  icon,
  tag,
  tagTone = "slate",
  value,
  sub,
}: {
  icon: string;
  tag?: string;
  tagTone?: Tone;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">{icon}</span>
        {tag && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TAG_TONE[tagTone]}`}>{tag}</span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function CountCell({ value, dot }: { value: number; dot: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${value > 0 ? dot : "bg-slate-200"}`} aria-hidden />
      <span className="font-medium text-slate-700">{value}</span>
    </span>
  );
}

// 지각/결석 셀 — 0이면 흐린 텍스트(클릭 불가), 1건 이상이면 클릭 시 해당 날짜 팝오버(어느 수업일에 지각/결석했는지)
function AttendanceDateCell({
  status,
  value,
  sessions,
  open,
  onToggle,
}: {
  status: AttendanceStatus; // "LAT" | "ABS"
  value: number;
  sessions: AttendanceSession[];
  open: boolean;
  onToggle: () => void;
}) {
  const meta = ATTENDANCE_STATUS[status];
  if (value === 0) {
    return (
      <span className="flex items-center gap-2 text-slate-400">
        <span className="h-2 w-2 rounded-full bg-slate-200" aria-hidden />0
      </span>
    );
  }
  const dates = sessions.filter((s) => s.stdEnrAtdStsCode === status).map((s) => s.stdEnrAtdRegDate);
  return (
    <span className="relative inline-block">
      {/* 클릭 어포던스 = 테두리 칩 + ▾ 캐럿 (클릭 불가한 '출석'은 평범한 텍스트라 한눈에 구분) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title={`${meta.label} 날짜 보기`}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm font-medium transition-colors ${
          open
            ? "border-slate-300 bg-slate-100 text-slate-900"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
        {value}
        <span className={`text-[10px] text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold text-slate-700">
            {meta.label} {value}회
          </p>
          <ul className="space-y-1.5">
            {dates.map((d) => (
              <li key={d} className="flex items-center gap-2 text-xs text-slate-600">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
                <span className="font-mono">{d.replace(/-/g, ".")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}

// 출석률 막대 색 — 교수 LMS 색상 표준(95/80, 2026-06-16): 정상 ≥95 · 경고 80~94 · 위험 <80
function attendanceBarColor(rate: number) {
  if (rate >= 95) return "bg-emerald-500";
  if (rate >= AT_RISK_THRESHOLD) return "bg-amber-400";
  return "bg-red-400";
}
