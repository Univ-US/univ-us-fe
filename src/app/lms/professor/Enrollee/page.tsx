"use client";

// PLM-003 — 교수 "수강생 현황" (강의별 수강생 목록 + 출석·과제 현황)
// BE 공식 명세 연동(2026-06-10): 서버 페이지네이션/검색/필터/정렬 + Excel 내보내기.
// - 상단: 학기(기본 '전체')/강의 드롭다운 + 이름·학번 검색 + 필터(제출/정렬) + 명단 내보내기
// - 통계 카드 3개(summary: 검색 전체 기준, 필터·정렬·페이지엔 안 바뀜)
// - 목록 테이블 + 서버 페이지네이션(page 0-based)
// - '상세' 클릭 → PLM-003-01 상세 리포트 모달
// ⚠️ 실패 시 가짜 데이터로 가리지 않고 에러 상태 표기(describeApiError = 상태코드 + 다시 시도).
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import StudentReportDialog from "@/components/lms/StudentReportDialog";
import {
  getSemesters,
  getLectures,
  getLectureStudents,
  getStudentReport,
  getCommonCodeMap,
  exportEnrollees,
  semesterLabel,
  lectureLabel,
  resolveImageUrl,
  EMPTY_LECTURE_STUDENTS,
  type Semester,
  type Lecture,
  type CourseStudentRow,
  type LectureStudentsResponse,
  type StudentReport,
  type StudentsQuery,
} from "@/lib/lmsProfessorStudentsApi";
import { describeApiError } from "@/lib/lmsApiError";

const PAGE_SIZE = 10;

type Submission = "" | "complete" | "incomplete";
type Sort = "name" | "studentNo" | "attendance" | "score"; // 기본 name
type Order = "asc" | "desc";

export default function ProfessorStudentsPage() {
  // 드롭다운/구조
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, string>>({}); // LEC_VAL_STATUS
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedSemId, setSelectedSemId] = useState<number | "all">("all");
  const [selectedLecId, setSelectedLecId] = useState<number | null>(null);

  // 목록/통계
  const [data, setData] = useState<LectureStudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색/필터/정렬/페이지 (서버 파라미터)
  const [keyword, setKeyword] = useState(""); // 입력값
  const [appliedKeyword, setAppliedKeyword] = useState(""); // 실제 검색어(엔터/검색 버튼으로만 반영)
  const [submission, setSubmission] = useState<Submission>("");
  const [sort, setSort] = useState<Sort>("name");
  const [order, setOrder] = useState<Order>("asc");
  const [page, setPage] = useState(0); // 0-based
  const [filterOpen, setFilterOpen] = useState(false);
  // 필터 패널 드래프트(‘확인’ 전까지 서버 미적용)
  const [draftSubmission, setDraftSubmission] = useState<Submission>("");
  const [draftSort, setDraftSort] = useState<Sort>("name");
  const [draftOrder, setDraftOrder] = useState<Order>("asc");

  // 내보내기/모달
  const [exporting, setExporting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // 검색 실행: 엔터 또는 '검색' 버튼으로만 호출(입력 중엔 서버 호출 안 함 — DB 부하 방지)
  const submitSearch = () => {
    setAppliedKeyword(keyword.trim());
    setPage(0);
  };

  // 구조 로드(마운트): 학기라벨 + 학기 + (전체)강의 → 첫 강의 선택
  useEffect(() => {
    (async () => {
      try {
        const tMap = await getCommonCodeMap("SEM_TERM");
        const stMap = await getCommonCodeMap("LEC_VAL_STATUS");
        const sems = await getSemesters();
        const lecs = await getLectures(); // 기본 '전체'
        setTermMap(tMap);
        setStatusMap(stMap);
        setSemesters(sems);
        setLectures(lecs);
        setSelectedSemId("all");
        const lecId = lecs[0]?.lecId ?? null;
        setSelectedLecId(lecId);
        if (lecId == null) {
          setData(EMPTY_LECTURE_STUDENTS);
          setLoading(false);
        }
        // lecId 있으면 아래 목록 effect가 조회
      } catch (e) {
        setError(describeApiError(e));
        setLoading(false);
      }
    })();
  }, []);

  // 목록 조회: 강의/검색/필터/정렬/페이지 변경 시 서버 재조회
  useEffect(() => {
    if (selectedLecId == null) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const q: StudentsQuery = {
          search: appliedKeyword,
          submission,
          sort,
          order,
          page,
          size: PAGE_SIZE,
        };
        const res = await getLectureStudents(selectedLecId, q);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          setError(describeApiError(e));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedLecId, appliedKeyword, submission, sort, order, page]);

  // 학기 변경 → 강의 목록 재조회 + 첫 강의 선택 (페이지 0)
  const handleSemesterChange = async (sem: number | "all") => {
    setSelectedSemId(sem);
    setPage(0);
    try {
      const lecs = sem === "all" ? await getLectures() : await getLectures(sem);
      setLectures(lecs);
      const lecId = lecs[0]?.lecId ?? null;
      setSelectedLecId(lecId);
      if (lecId == null) setData(EMPTY_LECTURE_STUDENTS);
    } catch (e) {
      setError(describeApiError(e));
    }
  };

  const handleLectureChange = (lecId: number) => {
    setSelectedLecId(lecId);
    setPage(0);
  };

  // 필터 패널: 열 때 현재 적용값을 드래프트로 복사 → 선택은 드래프트만 변경 → '확인'에서만 적용
  const openFilter = () => {
    setDraftSubmission(submission);
    setDraftSort(sort);
    setDraftOrder(order);
    setFilterOpen(true);
  };
  const resetDraft = () => {
    setDraftSubmission("");
    setDraftSort("name");
    setDraftOrder("asc");
  };
  const confirmFilter = () => {
    setSubmission(draftSubmission);
    setSort(draftSort);
    setOrder(draftOrder);
    setPage(0);
    setFilterOpen(false);
  };

  const handleExport = async () => {
    if (selectedLecId == null) return;
    setExporting(true);
    setError(null);
    try {
      await exportEnrollees(selectedLecId, {
        search: appliedKeyword,
        submission,
        sort,
        order,
      });
    } catch (e) {
      setError(`명단 내보내기 실패 — ${describeApiError(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const openReport = async (row: CourseStudentRow) => {
    if (selectedLecId == null) return;
    setReportOpen(true);
    setReportLoading(true);
    setReport(null);
    setReportError(null);
    try {
      setReport(await getStudentReport(selectedLecId, row.memberId));
    } catch (e) {
      setReportError(describeApiError(e));
    } finally {
      setReportLoading(false);
    }
  };

  // 다시 시도: 현재 조건으로 목록 강제 재조회
  const retry = useCallback(async () => {
    if (selectedLecId == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getLectureStudents(selectedLecId, {
        search: appliedKeyword,
        submission,
        sort,
        order,
        page,
        size: PAGE_SIZE,
      });
      setData(res);
    } catch (e) {
      setError(describeApiError(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedLecId, appliedKeyword, submission, sort, order, page]);

  const summary = data?.summary;
  const pagination = data?.pagination;
  const students = data?.students ?? [];
  const selectedLectureName =
    lectures.find((l) => l.lecId === selectedLecId)?.lecName ?? "강의 선택";
  // 응답 lecture의 강의 상태(lecValStatus) → 목록 헤더 배지
  const lecStatusCode = data?.lecture?.lecValStatus ?? null;
  const lecStatusLabel = lecStatusCode ? statusMap[lecStatusCode] ?? lecStatusCode : null;

  // 페이지네이션(서버 0-based → 표시 1-based). 0~10명이어도 최소 1페이지.
  const totalElements = pagination?.totalElements ?? 0;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const currentPage = page + 1;
  const startIdx = page * PAGE_SIZE;
  const filterActive = !!submission || sort !== "name" || order !== "asc";
  // 드래프트 정렬 기준 = 과제제출이면 'submission', 아니면 draftSort
  const draftCriterion: Sort | "submission" = draftSubmission ? "submission" : draftSort;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">수강생 현황</h1>
            <p className="text-sm text-slate-500">
              {selectedLectureName} · {summary?.totalStudents ?? 0}명
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={String(selectedSemId)}
              onChange={(e) => {
                const v = e.target.value;
                handleSemesterChange(v === "all" ? "all" : Number(v));
              }}
              className={`${selectClass} w-36`}
            >
              <option value="all">전체</option>
              {semesters.map((s) => (
                <option key={s.semId} value={s.semId}>
                  {semesterLabel(s, termMap)}
                </option>
              ))}
            </select>
            <select
              value={selectedLecId ?? ""}
              onChange={(e) => handleLectureChange(Number(e.target.value))}
              disabled={lectures.length === 0}
              className={`${selectClass} w-64 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
            >
              {lectures.length === 0 ? (
                <option value="" disabled>
                  등록된 강의 없음
                </option>
              ) : (
                lectures.map((l) => (
                  <option key={l.lecId} value={l.lecId}>
                    {lectureLabel(l, termMap, statusMap)}
                  </option>
                ))
              )}
            </select>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
              }}
              placeholder="🔍 이름 또는 학번 검색"
              className="w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30"
            />
            <Button variant="outline" size="default" onClick={submitSearch}>
              검색
            </Button>
          </div>
        </header>

        {/* 에러 안내 (가짜 데이터로 가리지 않음) */}
        {error && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">⚠ {error}</p>
            <Button variant="outline" size="sm" onClick={retry} disabled={loading}>
              다시 시도
            </Button>
          </div>
        )}

        {/* 통계 카드 */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="👥" tag="수강 인원" value={summary ? `${summary.totalStudents}명` : "-"} sub="전체 수강생" />
          <StatCard icon="％" tag="출석률" value={summary ? `${summary.averageAttendanceRate}%` : "-"} sub="평균 출석률" />
          <StatCard icon="📄" tag="제출률" value={summary ? `${summary.averageSubmissionRate}%` : "-"} sub="과제 제출률" />
        </section>

        {/* 수강생 목록 */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-800">
                {selectedLectureName} — 수강생 목록
              </h2>
              {lecStatusLabel && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${lecStatusBadgeClass(
                    lecStatusCode
                  )}`}
                >
                  {lecStatusLabel}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {/* 필터(제출 상태/정렬) 팝오버 */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (filterOpen ? setFilterOpen(false) : openFilter())}
                  className={filterActive ? "border-slate-400 text-slate-900" : ""}
                >
                  {filterActive ? "● 필터" : "필터"}
                </Button>
                {filterOpen && (
                  <>
                    {/* 바깥 클릭 = 취소(미적용) */}
                    <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                      {/* 정렬 기준: 이름/학번/출석률/평균점수/과제제출 (택1) — 드래프트 */}
                      <label className="mb-1 block text-xs font-medium text-slate-500">정렬 기준</label>
                      <select
                        value={draftCriterion}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "submission") {
                            setDraftSubmission("complete");
                            setDraftSort("name");
                            setDraftOrder("asc");
                          } else {
                            setDraftSort(v as Sort);
                            setDraftSubmission("");
                          }
                        }}
                        className={`${selectClass} mb-2 w-full`}
                      >
                        <option value="name">이름</option>
                        <option value="studentNo">학번</option>
                        <option value="attendance">출석률</option>
                        <option value="score">평균 점수</option>
                        <option value="submission">과제 제출</option>
                      </select>

                      {/* 과제 제출이면 제출완료/미제출, 그 외엔 오름/내림차순 */}
                      {draftCriterion === "submission" ? (
                        <select
                          value={draftSubmission}
                          onChange={(e) => setDraftSubmission(e.target.value as Submission)}
                          className={`${selectClass} w-full`}
                        >
                          <option value="complete">제출 완료</option>
                          <option value="incomplete">미제출</option>
                        </select>
                      ) : (
                        <select
                          value={draftOrder}
                          onChange={(e) => setDraftOrder(e.target.value as Order)}
                          className={`${selectClass} w-full`}
                        >
                          <option value="asc">오름차순</option>
                          <option value="desc">내림차순</option>
                        </select>
                      )}

                      {/* 확인 = 적용 + 닫힘 / 초기화 = 드래프트 기본값 */}
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={resetDraft}
                          className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
                        >
                          필터 초기화
                        </button>
                        <Button
                          size="sm"
                          onClick={confirmFilter}
                          className="bg-slate-800 text-white hover:bg-slate-700"
                        >
                          확인
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || selectedLecId == null}>
                {exporting ? "내보내는 중…" : "⤓ 명단 내보내기"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="px-5 py-3 font-medium">학생</th>
                  <th className="px-5 py-3 font-medium">출석률</th>
                  <th className="px-5 py-3 font-medium">과제 제출</th>
                  <th className="px-5 py-3 font-medium">평균 점수</th>
                  <th className="py-3 pl-5 pr-[84px] font-medium text-right">상세</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                      불러오는 중…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-red-400">
                      데이터를 불러오지 못했습니다. 위 ‘다시 시도’를 눌러주세요.
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                      표시할 수강생이 없습니다.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.enrollmentId} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-xs font-semibold text-white">
                            {resolveImageUrl(s.imageUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={resolveImageUrl(s.imageUrl)!} alt="" className="h-full w-full object-cover" />
                            ) : (
                              (s.studentName.trim()[0] ?? "?")
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{s.studentName}</p>
                            <p className="text-xs text-slate-400">{s.studentNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${attendanceBarColor(s.attendanceRate)}`}
                              style={{ width: `${Math.min(100, s.attendanceRate)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">{s.attendanceRate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${assignmentBadgeColor(
                            s.submittedCount,
                            s.totalAssignments
                          )}`}
                        >
                          {s.submittedCount} / {s.totalAssignments}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${scoreColor(s.averageScore)}`}>
                          {s.averageScore != null ? s.averageScore : "-"}
                        </span>
                      </td>
                      <td className="py-3 pl-5 pr-[84px] text-right">
                        <button
                          type="button"
                          onClick={() => openReport(s)}
                          className="text-sm font-medium text-slate-700 hover:underline"
                        >
                          상세 ›
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 (10명 이하여도 1페이지 표기) */}
          {!loading && !error && totalElements > 0 && (
            <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400">
                전체 {totalElements}명 중 {startIdx + 1}~{Math.min(startIdx + PAGE_SIZE, totalElements)} 표시 · 페이지당 {PAGE_SIZE}명
              </p>
              <div className="flex items-center gap-1">
                <PageBtn label="‹" disabled={currentPage === 1} onClick={() => setPage(page - 1)} />
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PageBtn key={p} label={String(p)} active={p === currentPage} onClick={() => setPage(p - 1)} />
                ))}
                <PageBtn label="›" disabled={currentPage === totalPages} onClick={() => setPage(page + 1)} />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* PLM-003-01 상세 리포트 모달 */}
      <StudentReportDialog
        open={reportOpen}
        loading={reportLoading}
        report={report}
        error={reportError}
        onClose={() => setReportOpen(false)}
        onSendMessage={() => {
          /* 메시지 기능은 이 API 범위 밖(별도 설계) */
        }}
      />
    </main>
  );
}

// ── 헬퍼 ────────────────────────────────────────────────────
const selectClass =
  "shrink-0 truncate rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30";

function StatCard({ icon, tag, value, sub }: { icon: string; tag: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">{icon}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{tag}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function PageBtn({
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:text-slate-300 ${
        active ? "bg-slate-800 font-semibold text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

// 강의 상태(LEC_VAL_STATUS) 배지 색
function lecStatusBadgeClass(code: string | null) {
  switch (code) {
    case "PROG":
      return "bg-emerald-100 text-emerald-700"; // 강의진행중
    case "OPEN":
      return "bg-sky-100 text-sky-700"; // 수강신청중
    case "CLSD":
      return "bg-slate-100 text-slate-500"; // 강의종료
    case "CNCL":
      return "bg-red-100 text-red-600"; // 폐강
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function attendanceBarColor(rate: number) {
  if (rate >= 85) return "bg-emerald-500";
  if (rate >= 70) return "bg-amber-400";
  return "bg-red-400";
}

function assignmentBadgeColor(done: number, total: number) {
  const ratio = total ? done / total : 0;
  if (ratio >= 1) return "bg-emerald-100 text-emerald-700";
  if (ratio >= 0.5) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-600";
}

function scoreColor(score: number | null) {
  if (score == null) return "text-slate-400";
  if (score >= 80) return "text-slate-900";
  if (score >= 60) return "text-amber-600";
  return "text-red-500";
}
