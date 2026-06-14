"use client";

// SLM-002 학생 대시보드 — 출석률 요약 통계 + 수강 중인 강의 + 과제 현황(선택 과목별)
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13).
// - 통계 5종(수강 과목·전체 학점·평균 출석률·미제출·채점 완료)
// - 수강 중인 강의(학점·교수·강의시간·출석률, ⭐행 클릭=과목 선택) ↔ 과제 현황(선택 과목의 과제·마감일시·상태 배지)
import { useCallback, useEffect, useState } from "react";
import {
  getStudentDashboard,
  type LectureTime,
  type StudentAssignmentStatus,
  type StudentDashboard,
} from "@/lib/lmsStudentDashboardApi";

// 출석률 색상 — ≥95 초록(에메랄드) / ≥80 노랑(앰버) / 그 외 빨강(로즈)
const attendanceColor = (rate: number) =>
  rate >= 95 ? "text-emerald-600" : rate >= 80 ? "text-amber-600" : "text-rose-600";

// 요일코드 → 한글 라벨 (BE: LEC_TIM_DAY_CODE MON~SUN)
const DAY_LABEL: Record<string, string> = { MON: "월", TUE: "화", WED: "수", THU: "목", FRI: "금", SAT: "토", SUN: "일" };
// 강의 시간 1슬롯 표시 — "월 10:00~12:00" (요일별 행 분리·시작~종료)
const formatLectureTime = (t: LectureTime) => `${DAY_LABEL[t.dayCode] ?? t.dayCode} ${t.start}~${t.end}`;

// 과제 상태 배지
const STATUS_BADGE: Record<StudentAssignmentStatus, { label: string; cls: string; dot: string }> = {
  NSB: { label: "미제출", cls: "text-rose-600", dot: "bg-rose-500" },
  SBM: { label: "제출", cls: "text-amber-600", dot: "bg-amber-500" },
  GRD: { label: "채점완료", cls: "text-emerald-600", dot: "bg-emerald-500" },
};

// 학기 드롭다운(§21 년도/학기 분리)
const TERM_LABEL: Record<string, string> = { SM1: "1학기", SMR: "여름 계절", SM2: "2학기", WNT: "겨울 계절" };
const TERM_OPTIONS = ["SM1", "SMR", "SM2", "WNT"];
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100";

// 인수인계용 안내 박스의 테이블명 칩 스타일(모노스페이스) — SLM-006/009와 동일
const TBL_CLS =
  "rounded bg-white px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200";

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 년도·학기 분리 드롭다운 (데코 — 기본값=현재 학기, 실제 전환은 BE 연동 후)
  const [selYear, setSelYear] = useState<number | null>(null);
  const [selTerm, setSelTerm] = useState<string | null>(null);
  // '수강 중인 강의'에서 선택한 과목 → '과제 현황'이 이 과목 과제만 표시(첫 과목 기본)
  const [selectedLecId, setSelectedLecId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getStudentDashboard()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setSelYear(d.year);
        setSelTerm(d.termCode);
        setSelectedLecId(d.courses[0]?.lecId ?? null); // 첫 과목 자동 선택
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  // 년도 옵션 — 현재 학기 기준 최근 3개년 (데코)
  const yearOptions = data ? [data.year, data.year - 1, data.year - 2] : [];
  // 선택 과목 + 그 과목의 과제(과제 현황 영역)
  const selectedCourse = data?.courses.find((c) => c.lecId === selectedLecId) ?? null;
  const courseAssignments = (data?.assignments ?? []).filter((a) => a.lecId === selectedLecId);
  // 선택 과목 기준 통계 카드 값(미제출=NSB·채점완료=GRD)
  const courseUnsubmitted = courseAssignments.filter((a) => a.status === "NSB").length;
  const courseGraded = courseAssignments.filter((a) => a.status === "GRD").length;

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* 헤더 */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
          {/* 부제 스코프 중복 금지(§21): 학기는 우측 드롭다운이 표시 → 인사말만 */}
          <p className="mt-1 text-sm text-slate-500">안녕하세요, {data?.studentName ?? "학생"}님</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* 년도·학기 분리(§21) — 데코, 실제 학기 전환은 BE 연동 후 */}
          <select
            value={selYear ?? ""}
            onChange={(e) => setSelYear(Number(e.target.value))}
            disabled={loading || !data}
            className={`${selectClass} w-28`}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={selTerm ?? ""}
            onChange={(e) => setSelTerm(e.target.value)}
            disabled={loading || !data}
            className={`${selectClass} w-32`}
          >
            {TERM_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {TERM_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* mock 단계 안내 (§15) */}
      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 수강·과제 데이터가 아닙니다.
      </div>

      {/* 인수인계용 — 이 화면 구현에 필요한 BE 테이블(정본=CLAUDE-DB.md). BE 연동 후 이 박스 삭제. */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <p className="mb-1.5 font-semibold text-slate-700">🗄 BE 연동 테이블 (이 화면 구현 시 필요)</p>
        <ul className="space-y-1">
          <li>
            <code className={TBL_CLS}>LECTURE_STUDENT_ENROLLMENT</code> — 현재 학기 수강 강의(LMS_PRF_ID=학생, 상태 != ‘DRP’) → 수강 과목·전체 학점·수강 중인 강의 목록
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE</code> + <code className={TBL_CLS}>LECTURE_CODE</code> — 강의·과목명(LEC_COD_NAME)·학점(LEC_CREDIT)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_TIME</code> — 강의 시간(요일 LEC_TIM_DAY_CODE·시작 LEC_TIM_STR_TIME~종료 LEC_TIM_END_TIME, ⭐요일별 행 분리)
          </li>
          <li>
            <code className={TBL_CLS}>LMS_PROFILE</code> + <code className={TBL_CLS}>MEMBER</code> — 담당 교수명(<code className={TBL_CLS}>LECTURE.LMS_PRF_ID</code> → LMS_PROFILE → MEMBER_NAME)
          </li>
          <li>
            <code className={TBL_CLS}>STUDENT_ENROLLMENT_ATTENDANCE</code> — 출석(STD_ENR_ATD_STS_CODE: PRS/LAT/ABS/ELV/EXC) → 과목별 출석률·평균 출석률
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_ASSIGNMENT</code> — 과제(제목 LEC_ASN_TITLE·마감 LEC_ASN_DUE_DATE·LEC_ID) → 과제 현황
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_ASSIGNMENT_SUBMISSION</code> — 학생 제출 상태(LEC_ASN_SBM_STATUS: NSB 미제출/SBM 제출/GRD 채점완료/RTN 반려) → 과제 상태·미제출·채점완료 카운트
          </li>
          <li>
            <code className={TBL_CLS}>SEMESTERS</code> — 학기(SEM_YEAR·SEM_TERM) → 현재 학기 산정·년도/학기 드롭다운
          </li>
        </ul>

        <p className="mt-3 mb-1.5 font-semibold text-slate-700">📐 구현 규칙 · 특이사항</p>
        <ul className="space-y-1">
          <li>
            · <b>현재 학기 스냅샷</b> — 년도/학기 = 현재 학기 기본·<code className={TBL_CLS}>전체</code> 없음(§21: 스냅샷/현황판은 현재 학기 기본). ⚠️ 현 드롭다운은 <b>데코</b> — 실제 학기 전환은 BE 연동 후.
          </li>
          <li>
            · <b>통계 카드 5</b> = <b>전체 3</b>(수강 과목·전체 학점·평균 출석률) + <b>선택 과목 2</b>(미제출=NSB·채점완료=GRD, 선택 과목 과제에서 파생).
          </li>
          <li>
            · ⭐ <b>마스터-디테일</b>: ‘수강 중인 강의’ 행 클릭 → <b>과제 현황·미제출·채점완료 카드가 그 과목 기준</b>(첫 과목 자동 선택).
          </li>
          <li>
            · <b>평균 출석률 색</b> = <b>≥95 초록 / ≥80 노랑 / 그 외 빨강</b>(수강 강의 출석률 % 동일 로직 <code className={TBL_CLS}>attendanceColor</code>). 산식 = PRS/전체 출석기록(과목 평균 or 전체) — BE 결정.
          </li>
          <li>
            · <b>강의 시간</b> = <code className={TBL_CLS}>LECTURE_TIME</code> 행 그대로(요일별 분리·시작~종료, <b>같은 시간이라도 병합 금지</b>).
          </li>
          <li>
            · <b>수강 범위</b> = 현재 학기 신청 강의(<code className={TBL_CLS}>LEC_STD_ENR_STATUS != ‘DRP’</code>). 폐강(CNCL) 포함 여부는 BE 정책(‘수강 중’이라 진행 강의 위주).
          </li>
          <li>
            · <b>과제 현황</b> = 선택 과목 과제(마감 desc)·상태 배지(NSB/SBM/GRD)·헤더 ‘총 N건’. <b>마감</b> = <code className={TBL_CLS}>LEC_ASN_DUE_DATE</code> → <code className={TBL_CLS}>YYYY.MM.DD HH:mm</code>(⭐마감 시각 중요).
          </li>
          <li>
            · <b>응답 형태</b> = <code className={TBL_CLS}>assignments[]</code>에 수강 과목 전체 과제 반환(<code className={TBL_CLS}>lecId</code> 포함), FE가 선택 과목으로 필터(과제 현황·미제출·채점완료 공통).
          </li>
          <li>
            · <b>BE 엔드포인트(안)</b> = <code className={TBL_CLS}>GET /api/lms/student/dashboard</code>(현재 학기 요약) — authenticated, 가드 <code className={TBL_CLS}>STU</code>·<code className={TBL_CLS}>ALU</code>.
          </li>
        </ul>
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">대시보드를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      ) : loading || !data ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : (
        <>
          {/* 통계 카드 5종 */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard icon="📖" value={data.stats.courseCount} unit="과목" label="수강 과목" />
            <StatCard icon="📋" value={data.stats.totalCredits} unit="학점" label="전체 학점" />
            <StatCard
              icon="％"
              value={data.stats.avgAttendance}
              unit="%"
              label="평균 출석률"
              valueColor={attendanceColor(data.stats.avgAttendance)}
            />
            {/* 미제출·채점완료 = 선택 과목 기준(과제 현황과 동일) */}
            <StatCard icon="⚠️" value={courseUnsubmitted} unit="건" label="미제출 과제" accent />
            <StatCard icon="✅" value={courseGraded} unit="건" label="채점 완료" />
          </div>

          {/* 2열: 수강 중인 강의(행 클릭=선택) ↔ 과제 현황(선택 과목) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 수강 중인 강의 */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">수강 중인 강의</h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  {data.courses.length}과목
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {data.courses.map((c) => {
                  const active = c.lecId === selectedLecId;
                  return (
                    <li key={c.lecId}>
                      <button
                        type="button"
                        onClick={() => setSelectedLecId(c.lecId)}
                        aria-pressed={active}
                        className={`flex w-full items-center gap-3 px-2 py-3 text-left transition-colors ${
                          active ? "bg-emerald-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{c.courseName}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                              {c.credit}학점
                            </span>
                            <span className="truncate">{c.professor} 교수</span>
                          </p>
                          {/* 강의 시간 — 요일별 각 LECTURE_TIME 행 분리(같은 시간이라도)·시작~종료 */}
                          <p className="mt-1 text-xs text-slate-500">
                            {c.times.map(formatLectureTime).join(" · ")}
                          </p>
                        </div>
                        <span className={`shrink-0 text-sm font-bold ${attendanceColor(c.attendanceRate)}`}>
                          {c.attendanceRate}%
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* 과제 현황 — '수강 중인 강의'에서 선택한 과목의 과제만 표시 */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-800">과제 현황</h2>
                {selectedCourse && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    총 {courseAssignments.length}건
                  </span>
                )}
              </div>
              {courseAssignments.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">이 과목의 과제가 없습니다.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {courseAssignments.map((a) => {
                    const badge = STATUS_BADGE[a.status];
                    return (
                      <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{a.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">마감 {a.due}</p>
                        </div>
                        <span className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold ${badge.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  unit,
  label,
  accent = false,
  valueColor,
}: {
  icon: string;
  value: number;
  unit: string;
  label: string;
  accent?: boolean;
  valueColor?: string; // 값 텍스트 색(미지정 시 slate-900) — 평균 출석률 임계 색용
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-base ${
            accent ? "bg-rose-50" : "bg-emerald-50"
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="leading-none">
        <span className={`text-2xl font-bold ${valueColor ?? "text-slate-900"}`}>{value}</span>
        <span className="ml-0.5 text-xs text-slate-400">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
