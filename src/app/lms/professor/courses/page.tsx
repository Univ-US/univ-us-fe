"use client";

// PLM-002 — 교수 "강의 내역" (학기별 담당 강의 목록 + 상단 KPI 요약)
// - 상단: 년도·학기 분리 필터(기본 둘 다 '전체' — §21) + 학기별 카드 분리(최신순)
// - KPI 스트립 4종: 담당 강의 / 총 수강생 / 미채점 과제 / 평균 출석률 (이번 학기 기준)
// - 각 학기 카드 행: 과목명+학수번호 · 수강생 · 강의 시간 · 평균 출석률(막대) · 미채점 · 관리
//   · 진행중 학기 = 미채점 'N건' 배지 / 마감 학기 = '마감' 배지(미채점 표시 안 함)
// - 색상: 교수 = 네이비/슬레이트(§13) · 출석률 막대 색 = 95/80 임계(§21)
// 🧪 mock-first: lib(lmsProfessorCoursesApi)이 mock 반환 — BE 명세 오면 lib만 실연결.
// ⚠️ 출력 규칙 §21: 건수=N건 / 인원=N명 / 빈값=- / 강의명 CSS truncate.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getProfessorCourses,
  type ProfessorCourseRow,
  type ProfessorSemesterCourses,
  type ProfessorCoursesOverview,
} from "@/lib/lmsProfessorCoursesApi";
import { getCommonCodeMap } from "@/lib/lmsProfessorStudentsApi";

const TERM_LABEL: Record<string, string> = {
  SM1: "1학기",
  SMR: "여름 계절",
  SM2: "2학기",
  WNT: "겨울 계절",
};
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];

const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100";

export default function ProfessorCoursesPage() {
  const [overview, setOverview] = useState<ProfessorCoursesOverview | null>(null);
  const [semesters, setSemesters] = useState<ProfessorSemesterCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [termMap, setTermMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getProfessorCourses();
      setOverview(data.overview);
      setSemesters(data.semesters);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 학기 드롭다운은 공통코드 SEM_TERM 기준 — 강의 데이터에 없는 미시작 학기('여름 계절')도 노출
  useEffect(() => {
    void getCommonCodeMap("SEM_TERM").then(setTermMap);
  }, []);

  const yearOptions = useMemo(
    () => [...new Set(semesters.map((s) => s.semYear))].sort((a, b) => b - a),
    [semesters],
  );
  // 학기 옵션 = 공통코드 SEM_TERM 전체(강의 유무 무관 — 미시작 '여름 계절'도 표시). 미로드 시 TERM_ORDER 상수 fallback.
  const termOptions = useMemo(() => {
    const codes = Object.keys(termMap);
    const base = codes.length > 0 ? codes : TERM_ORDER;
    return [...base].sort((a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b));
  }, [termMap]);

  const visible = useMemo(
    () =>
      semesters.filter(
        (s) =>
          (yearFilter === "all" || s.semYear === yearFilter) &&
          (termFilter === "all" || s.semTerm === termFilter),
      ),
    [semesters, yearFilter, termFilter],
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">강의 내역</h1>
          <p className="mt-1 text-sm text-slate-500">학기별 담당 강의와 수강 현황을 확인하세요.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={yearFilter === "all" ? "" : String(yearFilter)}
            onChange={(e) => setYearFilter(e.target.value === "" ? "all" : Number(e.target.value))}
            disabled={loading || semesters.length === 0}
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
            onChange={(e) => setTermFilter(e.target.value === "" ? "all" : e.target.value)}
            disabled={loading || semesters.length === 0}
            className={`${selectClass} w-32`}
          >
            <option value="">전체 학기</option>
            {termOptions.map((t) => (
              <option key={t} value={t}>
                {termMap[t] ?? TERM_LABEL[t] ?? t}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* KPI 스트립 — 이번 학기 기준 요약 */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon="📖"
          tag="진행중"
          tone="neutral"
          value={overview ? `${overview.courseCount}과목` : "-"}
          label="담당 강의"
        />
        <KpiCard
          icon="👥"
          tag=""
          tone="neutral"
          value={overview ? `${overview.studentTotal}명` : "-"}
          label="총 수강생"
        />
        <KpiCard
          icon="📋"
          tag=""
          tone="neutral"
          value={overview ? `${overview.ungradedTotal}건` : "-"}
          label="미채점 과제"
        />
        <KpiCard
          icon="％"
          tag=""
          tone="neutral"
          value={overview ? `${overview.avgAttendanceRate}%` : "-"}
          label="평균 출석률"
        />
      </section>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">강의 내역을 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            다시 시도
          </button>
        </div>
      ) : loading ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중...</p>
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">표시할 강의 내역이 없습니다.</p>
      ) : (
        <div className="space-y-6">
          {visible.map((sem) => (
            <SemesterCard key={`${sem.semYear}-${sem.semTerm}`} sem={sem} />
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  tag,
  tone,
  value,
  label,
}: {
  icon: string;
  tag: string;
  tone: "neutral" | "up" | "down" | "warn";
  value: string;
  label: string;
}) {
  // 톤: neutral=슬레이트 / up·down·warn=의미색(증감·경고) — §13의 '브랜드 강조 green 금지'와 별개인 의미색
  const toneClass = {
    neutral: "bg-slate-100 text-slate-500",
    up: "bg-emerald-50 text-emerald-600",
    down: "bg-rose-50 text-rose-600",
    warn: "bg-rose-50 text-rose-600",
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">
          {icon}
        </span>
        {tag && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{tag}</span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function SemesterCard({ sem }: { sem: ProfessorSemesterCourses }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-base font-bold text-slate-800">{sem.semesterLabel}</h2>
          {sem.inProgress ? (
            <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-white">
              진행중
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              마감
            </span>
          )}
        </div>
      </div>

      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
            <th className="px-5 py-2.5 font-medium">과목명</th>
            <th className="w-20 px-2 py-2.5 font-medium">수강생</th>
            <th className="w-44 px-2 py-2.5 font-medium">강의 시간</th>
            <th className="w-40 px-2 py-2.5 font-medium">평균 출석률</th>
            <th className="w-20 px-2 py-2.5 font-medium">미채점</th>
            <th className="w-52 px-5 py-2.5 text-right font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {sem.courses.map((course) => (
            <CourseRow key={course.lecId} course={course} closed={!sem.inProgress} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CourseRow({ course, closed }: { course: ProfessorCourseRow; closed: boolean }) {
  return (
    <tr className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50">
      <td className="px-5 py-3">
        <p className="truncate font-semibold text-slate-800" title={course.courseName}>
          {course.courseName}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          {course.lecSection}반
        </p>
      </td>
      <td className="px-2 py-3 text-slate-600">{course.studentCount}명</td>
      <td className="px-2 py-3 text-xs text-slate-500">{course.schedule || "-"}</td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${attendanceBarColor(course.attendanceRate)}`}
              style={{ width: `${Math.min(100, Math.max(0, course.attendanceRate))}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-700">
            {course.attendanceRate}%
          </span>
        </div>
      </td>
      <td className="px-2 py-3">
        {closed ? (
          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
            마감
          </span>
        ) : course.ungradedCount > 0 ? (
          <span className="inline-block rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
            {course.ungradedCount}건
          </span>
        ) : (
          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
            0건
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        {/* 출결 관리 / 과제 관리 — 이 강의(course.lecId)를 물고 해당 화면으로 딥링크 (2026-06-17 BE 실연동 후 구현).
            받는 쪽(attendance·assignments)이 마운트 시 ?lecId= 를 읽어 담당 강의에 있으면 그 강의 자동 선택,
            없으면 첫 강의 fallback. 필터는 '전체' 기본이라 과거 학기 강의도 드롭다운에 있어 매칭됨. */}
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/lms/professor/attendance?lecId=${course.lecId}`}
            className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            출결 관리
          </Link>
          <Link
            href={`/lms/professor/assignments?lecId=${course.lecId}`}
            className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            과제 관리
          </Link>
        </div>
      </td>
    </tr>
  );
}

// 출석률 막대 색 — §21 교수 LMS 공통 임계: 정상(초록)≥95 · 경고(노랑)80~94 · 위험(빨강)<80
function attendanceBarColor(rate: number) {
  if (rate >= 95) return "bg-emerald-500";
  if (rate >= 80) return "bg-amber-400";
  return "bg-red-400";
}
