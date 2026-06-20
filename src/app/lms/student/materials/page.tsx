"use client";

// SLM-006 강의 자료 — 학생이 수강 중인 강의의 업로드 자료를 과목별 확인하고 첨부를 다운로드한다.
// 서버 페이지네이션: 수강 과목 1개 선택 → 그 과목 자료를 page/size로 서버 조회(클라 slice 없음, 교수 PLM-005 미러).
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isVideoExt } from "@/lib/lmsProfessorUploadApi"; // 영상 확장자 판정(교수 업로드와 동일)
import { htmlToPlainText } from "@/lib/lmsSanitize"; // 강의 내용 컬럼 요약(content HTML → plain text)
import { truncateLectureName, LECTURE_NAME_MAX } from "@/lib/lmsLectureName";
import StudentMaterialViewDialog from "@/components/lms/StudentMaterialViewDialog";
import { getStudentMaterialLectures, getStudentMaterials } from "@/lib/lmsStudentMaterialsApi";
import { getCommonCodeList } from "@/lib/lmsCommonCode";
import type { Lecture, Material } from "@/types/lmsStudentMaterials";

// 강의 자료 테이블 페이지네이션 — 선택 과목 자료를 10건 단위로 서버 조회한다.
const MATERIALS_PAGE_SIZE = 10;
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const semLabelOf = (year: number, termCode: string, termMap: Record<string, string>) =>
  `${year}년 ${termMap[termCode] ?? termCode}`;

// (년도, 학기) 조합에 매칭되는 수강 과목들. 둘 다 'all'이면 전체
const matchLectures = (
  year: number | "all",
  term: string | "all",
  lectures: Lecture[]
): Lecture[] =>
  lectures.filter(
    (c) => (year === "all" || c.semYear === year) && (term === "all" || c.semTerm === term)
  );

export default function StudentMaterialsPage() {
  // 수강 과목 드롭다운 (마운트 1회 로드 — 년도/학기/과목 필터 소스)
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [lecturesLoading, setLecturesLoading] = useState(true);
  const [lecturesError, setLecturesError] = useState(false);
  // 년도·학기 분리 필터 — 기본 둘 다 '전체'
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  // 선택된 과목 + 서버 페이지 (0-based)
  const [selectedLecId, setSelectedLecId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  // 선택 과목 자료 1페이지(서버 응답) — null=미로드. 새 요청 성공 시에만 교체(로딩 중 이전 페이지 유지)
  const [materials, setMaterials] = useState<Material[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState(false);
  // '강의 보기' 모달 대상 (null = 닫힘)
  const [viewing, setViewing] = useState<Material | null>(null);
  // 학기 코드→라벨 / 표시순서 (공통코드 — 로드 전 []·{} 폴백)
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [termOrder, setTermOrder] = useState<string[]>([]);
  // 경쟁 요청 가드 (과목/페이지 빠른 전환 시 stale 응답 무시)
  const reqIdRef = useRef(0);

  useEffect(() => {
    void getCommonCodeList("SEM_TERM").then((list) => {
      setTermOrder(list.map((c) => c.codeVal));
      setTermMap(Object.fromEntries(list.map((c) => [c.codeVal, c.codeName])));
    });
  }, []);

  // 수강 과목 드롭다운 로드 + 첫 과목 자동 선택
  const loadLectures = useCallback(() => {
    setLecturesLoading(true);
    setLecturesError(false);
    let alive = true;
    getStudentMaterialLectures()
      .then((data) => {
        if (!alive) return;
        setLectures(data);
        setSelectedLecId(data[0]?.lecId ?? null);
      })
      .catch(() => alive && setLecturesError(true))
      .finally(() => alive && setLecturesLoading(false));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => loadLectures(), [loadLectures]);

  // 선택 과목 + page → 자료 페이지 서버 조회
  const loadMaterials = useCallback((lecId: number, p: number) => {
    const reqId = ++reqIdRef.current;
    setMaterialsLoading(true);
    setMaterialsError(false);
    getStudentMaterials({ lecId, page: p, size: MATERIALS_PAGE_SIZE })
      .then((data) => {
        if (reqId !== reqIdRef.current) return; // stale 응답 무시
        setMaterials(data.content);
        setTotalElements(data.totalElements);
        setTotalPages(data.totalPages);
        setHasLoaded(true);
      })
      .catch(() => {
        if (reqId === reqIdRef.current) setMaterialsError(true);
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setMaterialsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedLecId == null) {
      setMaterials([]);
      setTotalElements(0);
      setTotalPages(0);
      setHasLoaded(false);
      return;
    }
    loadMaterials(selectedLecId, page);
  }, [selectedLecId, page, loadMaterials]);

  const yearOptions = useMemo(
    () => [...new Set(lectures.map((c) => c.semYear))].sort((a, b) => b - a),
    [lectures]
  );
  // 학기 필터는 데이터 유무와 무관하게 항상 학기 노출(공통코드 표시 순서)
  const termOptions = termOrder;
  const filteredLectures = useMemo(
    () => matchLectures(yearFilter, termFilter, lectures),
    [yearFilter, termFilter, lectures]
  );
  const selectedLecture = useMemo(
    () => lectures.find((c) => c.lecId === selectedLecId) ?? null,
    [lectures, selectedLecId]
  );

  // 과목/필터 변경 → 선택 과목 교체 + page 0 리셋 (열린 모달 닫기)
  const selectLecture = (lecId: number | null) => {
    setViewing(null);
    setSelectedLecId(lecId);
    setPage(0);
  };
  const handleYearChange = (year: number | "all") => {
    setYearFilter(year);
    selectLecture(matchLectures(year, termFilter, lectures)[0]?.lecId ?? null);
  };
  const handleTermChange = (term: string | "all") => {
    setTermFilter(term);
    selectLecture(matchLectures(yearFilter, term, lectures)[0]?.lecId ?? null);
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      {/* 헤더 — 좌: 제목+선택 과목·자료 수(서버 totalElements) / 우: 년도·학기·과목 드롭다운 */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">강의 자료</h1>
          <p
            className="mt-1 flex items-center gap-1 text-sm text-slate-500"
            title={selectedLecture?.courseName ?? undefined}
          >
            <span className="min-w-0 truncate">{selectedLecture?.courseName ?? "과목 선택"}</span>
            <span className="shrink-0">· 자료 {totalElements}건</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <select
            value={yearFilter === "all" ? "" : String(yearFilter)}
            onChange={(e) => handleYearChange(e.target.value === "" ? "all" : Number(e.target.value))}
            disabled={lecturesLoading || lectures.length === 0}
            className={`${selectClass} w-28`}
          >
            <option value="">전체 연도</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={termFilter === "all" ? "" : termFilter}
            onChange={(e) => handleTermChange(e.target.value === "" ? "all" : e.target.value)}
            disabled={lecturesLoading || lectures.length === 0}
            className={`${selectClass} w-32`}
          >
            <option value="">전체 학기</option>
            {termOptions.map((t) => (
              <option key={t} value={t}>
                {termMap[t] ?? t}
              </option>
            ))}
          </select>
          {/* 과목 드롭다운 — 년도/학기로 좁힌 수강 과목, 첫 과목 자동 선택 */}
          <select
            value={selectedLecId ?? ""}
            onChange={(e) => selectLecture(Number(e.target.value))}
            disabled={filteredLectures.length === 0}
            className={`${selectClass} w-64`}
          >
            {filteredLectures.length === 0 ? (
              <option value="" disabled>
                수강 과목 없음
              </option>
            ) : (
              filteredLectures.map((c) => (
                <option
                  key={c.lecId}
                  value={c.lecId}
                  title={c.courseName.length > LECTURE_NAME_MAX ? c.courseName : undefined}
                >
                  {truncateLectureName(c.courseName)}
                  {c.lecSection != null ? ` · ${c.lecSection}반` : ""} · {semLabelOf(c.semYear, c.semTerm, termMap)}
                </option>
              ))
            )}
          </select>
        </div>
      </header>

      {lecturesError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">강의 자료를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={loadLectures}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      ) : lecturesLoading ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : selectedLecId == null ? (
        <p className="py-16 text-center text-sm text-slate-400">표시할 강의 자료가 없습니다.</p>
      ) : materialsError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">강의 자료를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => loadMaterials(selectedLecId, page)}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <MaterialsTable
          materials={materials}
          page={page}
          totalPages={totalPages}
          loading={materialsLoading && !hasLoaded}
          onView={setViewing}
          onPageChange={setPage}
        />
      )}

      <StudentMaterialViewDialog
        open={viewing !== null}
        material={viewing}
        courseName={selectedLecture?.courseName}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

function MaterialsTable({
  materials,
  page,
  totalPages,
  loading,
  onView,
  onPageChange,
}: {
  materials: Material[];
  page: number;
  totalPages: number;
  loading: boolean;
  onView: (m: Material) => void;
  onPageChange: (p: number) => void;
}) {
  if (materials.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
        {loading ? "불러오는 중…" : "이 과목의 강의 자료가 없습니다."}
      </p>
    );
  }

  const multiPage = totalPages > 1;
  // 다중 페이지일 때만 빈 행으로 높이 고정(페이지 이동 시 표 높이 안정). 단일 페이지는 자연 높이.
  const padCount = multiPage ? MATERIALS_PAGE_SIZE - materials.length : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
            <th className="px-5 py-2.5 font-medium">제목</th>
            <th className="px-2 py-2.5 font-medium">강의 내용</th>
            <th className="w-32 px-2 py-2.5 font-medium">업로드일</th>
            <th className="w-28 px-2 py-2.5 font-medium">유형</th>
            <th className="w-28 px-2 py-2.5 text-right font-medium">보기</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m) => {
            const hasFile = m.attachments.length > 0;
            const contentSummary = m.lecUplContent?.trim() ? htmlToPlainText(m.lecUplContent) : "";
            return (
              <tr key={m.uploadId} className="border-b border-slate-50 last:border-0">
                {/* 제목 */}
                <td className="px-5 py-3">
                  <span className="block truncate font-semibold text-slate-800" title={m.lecUplTitle}>
                    {m.lecUplTitle}
                  </span>
                </td>
                {/* 강의 내용 — 교수 본문(content) plain text 요약. 없으면 — */}
                <td className="px-2 py-3">
                  {contentSummary ? (
                    <span className="block truncate text-xs text-slate-500" title={contentSummary}>
                      {contentSummary}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                {/* 업로드일 */}
                <td className="px-2 py-3 font-mono text-xs text-slate-500">{m.lecUplRegDate}</td>
                {/* 유형 — 첫 첨부 확장자 배지 + 나머지 +N. 첨부 없으면 — (교수 업로드 미러) */}
                <td className="px-2 py-3">
                  {hasFile ? (
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                          isVideoExt(m.attachments[0].fileExt ?? "")
                            ? "bg-red-100 text-red-600"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isVideoExt(m.attachments[0].fileExt ?? "") ? "🎬" : "📄"}{" "}
                        {m.attachments[0].fileExt ?? "-"}
                      </span>
                      {m.attachments.length > 1 && (
                        <span className="text-xs text-slate-400">+{m.attachments.length - 1}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                {/* 강의 보기 — 모달에서 본문(content) + 첨부 열람/다운로드 */}
                <td className="px-2 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onView(m)}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    강의 보기
                  </button>
                </td>
              </tr>
            );
          })}
          {Array.from({ length: padCount }).map((_, i) => (
            <tr key={`pad-${i}`} aria-hidden className="border-b border-slate-50 last:border-0">
              <td colSpan={5} className="px-5 py-3">
                <span className="block h-6" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 페이저 — 다중 페이지일 때만 노출(에메랄드 학생 테마). page 변경 시 서버 재조회 */}
      {multiPage && <MaterialsPager page={page} totalPages={totalPages} onChange={onPageChange} />}
    </div>
  );
}

function MaterialsPager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 border-t border-slate-100 px-5 py-2.5">
      <PageBtn disabled={page === 0} onClick={() => onChange(page - 1)}>
        ‹
      </PageBtn>
      {Array.from({ length: totalPages }).map((_, i) => (
        <PageBtn key={i} active={i === page} onClick={() => onChange(i)}>
          {i + 1}
        </PageBtn>
      ))}
      <PageBtn disabled={page === totalPages - 1} onClick={() => onChange(page + 1)}>
        ›
      </PageBtn>
    </div>
  );
}

function PageBtn({
  children,
  active = false,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
