"use client";

// SLM-006 강의 자료 — 교수가 올린 자료(제목·본문·첨부)를 과목별 확인 + '강의 보기' 모달 열람/다운로드
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13).
// - 구성 = PLM-006(과제 관리)·PLM-003 패턴: 년도/학기(기본 둘 다 '전체') + 과목 드롭다운(첫 과목 자동 선택)
//   → 선택한 '한 과목'의 자료만 표시. 년도/학기는 수강 과목을 클라에서 좁힘.
// - 자료 구조 = 교수 강의 업로드(PLM-005) 미러: 자료 1건 = 제목 + 본문(content) + 첨부 0..N.
//   테이블 컬럼: 제목 · 강의 내용(content 요약 plain text) · 업로드일 · 유형(첫 첨부 배지 🎬/📄 +N, 0개→'—') · '강의 보기' 액션. (크기는 모달 첨부에 표기)
//   페이지네이션: 선택 과목 자료를 10건/페이지로 클라 슬라이스(다중 페이지일 때만 페이저+높이 고정). 과목 전환 시 key로 0페이지 리셋.
// - '강의 보기' → StudentMaterialViewDialog 모달(본문 content + 첨부 다운로드). 열람 제한(만료/교수 제한)은 모달 내 첨부 다운로드만 🔒(보기·본문은 항상 가능).
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { isVideoExt } from "@/lib/lmsProfessorUploadApi"; // 영상 확장자 판정(교수 업로드와 동일)
import { htmlToPlainText } from "@/lib/lmsSanitize"; // 강의 내용 컬럼 요약(content HTML → plain text)
import { truncateLectureName, LECTURE_NAME_MAX } from "@/lib/lmsLectureName";
import StudentMaterialViewDialog from "@/components/lms/StudentMaterialViewDialog";
import {
  getStudentMaterials,
  type CourseMaterials,
  type Material,
  type SemesterMaterials,
} from "@/lib/lmsStudentMaterialsApi";

const TERM_LABEL: Record<string, string> = { SM1: "1학기", SMR: "여름 계절", SM2: "2학기", WNT: "겨울 계절" };
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];
// 강의 자료 테이블 페이지네이션 — 한 페이지당 자료 수(목업 클라 슬라이스). BE 연동 시 §21 서버 페이지네이션 전환 대상.
const MATERIALS_PAGE_SIZE = 10;
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

// 인수인계용 안내 박스의 테이블명 칩 스타일(모노스페이스)
const TBL_CLS =
  "rounded bg-white px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200";

const semLabelOf = (year: number, termCode: string) =>
  `${year}년 ${TERM_LABEL[termCode] ?? termCode}`;

// 과목 드롭다운 1행 = 과목 + 소속 학기(년도/학기로 좁힘·라벨 표기용)
type CourseOption = CourseMaterials & { year: number; termCode: string };

// (년도, 학기) 조합에 매칭되는 과목들. 둘 다 'all'이면 전체 (PLM-006 동일)
const matchCourses = (
  year: number | "all",
  term: string | "all",
  opts: CourseOption[]
): CourseOption[] =>
  opts.filter(
    (c) => (year === "all" || c.year === year) && (term === "all" || c.termCode === term)
  );

export default function StudentMaterialsPage() {
  const [semesters, setSemesters] = useState<SemesterMaterials[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 년도·학기 분리 필터 — 기본 둘 다 '전체'(§21)
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  // 선택된 과목 (첫 과목 자동 선택)
  const [selectedLecId, setSelectedLecId] = useState<number | null>(null);
  // '강의 보기' 모달 대상 (null = 닫힘)
  const [viewing, setViewing] = useState<Material | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getStudentMaterials()
      .then((d) => {
        if (!alive) return;
        setSemesters(d);
        const first = d.flatMap((s) => s.courses)[0]; // 첫 과목 자동 선택
        setSelectedLecId(first ? first.lecId : null);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  // 학기별 과목을 평면화 — 각 과목에 소속 학기(년도/학기) 부착 (드롭다운 옵션 소스)
  const courseOptions = useMemo<CourseOption[]>(
    () =>
      semesters.flatMap((s) =>
        s.courses.map((c) => ({ ...c, year: s.year, termCode: s.termCode }))
      ),
    [semesters]
  );

  const yearOptions = useMemo(
    () => [...new Set(courseOptions.map((c) => c.year))].sort((a, b) => b - a),
    [courseOptions]
  );
  const termOptions = useMemo(
    () =>
      [...new Set(courseOptions.map((c) => c.termCode))].sort(
        (a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b)
      ),
    [courseOptions]
  );
  const filteredCourses = useMemo(
    () => matchCourses(yearFilter, termFilter, courseOptions),
    [yearFilter, termFilter, courseOptions]
  );
  const selectedCourse = useMemo(
    () => courseOptions.find((c) => c.lecId === selectedLecId) ?? null,
    [courseOptions, selectedLecId]
  );

  // 년도/학기 변경 → 과목 목록 좁힘 + 첫 과목 자동 선택 (각 축 독립, PLM-006 동일)
  const handleYearChange = (year: number | "all") => {
    setViewing(null); // 필터 전환 시 열린 모달 닫기(stale 방어)
    setYearFilter(year);
    setSelectedLecId(matchCourses(year, termFilter, courseOptions)[0]?.lecId ?? null);
  };
  const handleTermChange = (term: string | "all") => {
    setViewing(null);
    setTermFilter(term);
    setSelectedLecId(matchCourses(yearFilter, term, courseOptions)[0]?.lecId ?? null);
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      {/* 헤더 — 좌: 제목+선택 과목·자료 수 / 우: 년도·학기·과목 드롭다운 (PLM-006 레이아웃) */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">강의 자료</h1>
          <p
            className="mt-1 flex items-center gap-1 text-sm text-slate-500"
            title={selectedCourse?.courseName ?? undefined}
          >
            <span className="min-w-0 truncate">{selectedCourse?.courseName ?? "과목 선택"}</span>
            <span className="shrink-0">· 자료 {selectedCourse?.materials.length ?? 0}건</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <select
            value={yearFilter === "all" ? "" : String(yearFilter)}
            onChange={(e) => handleYearChange(e.target.value === "" ? "all" : Number(e.target.value))}
            disabled={loading || courseOptions.length === 0}
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
            disabled={loading || courseOptions.length === 0}
            className={`${selectClass} w-32`}
          >
            <option value="">전체 학기</option>
            {termOptions.map((t) => (
              <option key={t} value={t}>
                {TERM_LABEL[t] ?? t}
              </option>
            ))}
          </select>
          {/* 과목 드롭다운 — 년도/학기로 좁힌 수강 과목, 첫 과목 자동 선택 */}
          <select
            value={selectedLecId ?? ""}
            onChange={(e) => setSelectedLecId(Number(e.target.value))}
            disabled={filteredCourses.length === 0}
            className={`${selectClass} w-64`}
          >
            {filteredCourses.length === 0 ? (
              <option value="" disabled>
                수강 과목 없음
              </option>
            ) : (
              filteredCourses.map((c) => (
                <option
                  key={c.lecId}
                  value={c.lecId}
                  title={c.courseName.length > LECTURE_NAME_MAX ? c.courseName : undefined}
                >
                  {truncateLectureName(c.courseName)}
                  {c.lecSection != null ? ` · ${c.lecSection}반` : ""} · {semLabelOf(c.year, c.termCode)}
                </option>
              ))
            )}
          </select>
        </div>
      </header>

      {/* mock 단계 안내 (§15) */}
      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 강의 자료가 아닙니다.
      </div>

      {/* 인수인계용 — 이 화면 구현에 필요한 BE 테이블(정본=CLAUDE-DB.md). BE 연동 후 이 박스 삭제. */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <p className="mb-1.5 font-semibold text-slate-700">🗄 BE 연동 테이블 (이 화면 구현 시 필요)</p>
        <ul className="space-y-1">
          <li>
            <code className={TBL_CLS}>SEMESTERS</code> — 학기(년도·학기 — 필터·과목 라벨)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_STUDENT_ENROLLMENT</code> — 학생 수강 강의(LMS_PRF_ID=학생) → 열람 가능한 강의 한정
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE</code> + <code className={TBL_CLS}>LECTURE_CODE</code> — 강의·과목명(LEC_COD_NAME)·분반(LEC_SECTION)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_UPLOADING</code> — 자료 본체(제목 LEC_UPL_TITLE·본문 LEC_UPL_CONTENT·업로드일 LEC_UPL_REG_DATE·LEC_ID로 강의 연결)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_UPLOADING_ATTACHMENT</code> — 첨부(1:N 다중·유형=EXT_TYPE·크기 FIL_SIZE·상태 ATT_VAL_STATUS: ACT/DEL/EXPR/FAIL)
          </li>
        </ul>

        <p className="mt-3 mb-1.5 font-semibold text-slate-700">📐 구현 규칙 · 특이사항</p>
        <ul className="space-y-1">
          <li>
            · <b>화면 구성</b> = 년도·학기(기본 둘 다 ‘전체’) + 과목 드롭다운(첫 과목 자동 선택) → 선택 과목 1개의 자료만 표시(PLM-006 패턴). BE는 학기 무관 전체 반환, FE가 좁힘.
          </li>
          <li>
            · <b>페이지네이션</b> = 선택 과목 자료 <b>10건/페이지</b>(<code className={TBL_CLS}>MATERIALS_PAGE_SIZE=10</code>). 현 목업은 클라 슬라이스 — BE 연동 시 §21 서버 페이지네이션(page 0-based·size) 전환 대상.
          </li>
          <li>
            · <b>행 액션 = ‘강의 보기’(모달)</b> — 교수 업로드(제목·본문 <code className={TBL_CLS}>LEC_UPL_CONTENT</code>·첨부)를 그대로 열람. 다운로드는 모달 안 첨부별. ⚠️ <b>열람 제한(만료·교수 제한)은 첨부 다운로드만 막음</b>(보기·본문은 항상 가능).
          </li>
          <li>
            · <b>수강 범위 = 신청한 전부</b>(폐강 CNCL 포함 — 수강 내역과 동일 정책). 학생이 수강하지 않은 강의의 자료는 노출 금지.
          </li>
          <li>
            · ⭐ <b>자료 1건(<code className={TBL_CLS}>LECTURE_UPLOADING</code>) ↔ 첨부 0..N</b> — 교수 강의 업로드(PLM-005) 구조 미러. <b>유형</b> = 첫 첨부 확장자(<code className={TBL_CLS}>EXT_TYPE</code>) 배지(🎬 영상 / 📄 그 외) + 다중이면 <code className={TBL_CLS}>+N</code> / <b>크기</b> = 첨부 <code className={TBL_CLS}>FIL_SIZE</code> 합계(모달 첨부에 표기). <b>첨부 0개(텍스트 전용)</b> → 유형 <code className={TBL_CLS}>—</code>.
          </li>
          <li>
            · <b>유효/다운로드 도출</b>: 표시 첨부 = <code className={TBL_CLS}>ATT_VAL_STATUS=ACT</code>만(BE는 attachments에 ACT만 직렬화 권장 · DEL/FAIL 제외). <b>downloadable = 표시 첨부가 전부 ACT면 true</b>, 하나라도 <code className={TBL_CLS}>EXPR</code>이면 false(lockedReason=<code className={TBL_CLS}>expired</code>).
          </li>
          <li>
            · ⚠️ <code className={TBL_CLS}>EXPR</code>의 발생 조건/주체는 BE 정책 — 스키마에 학생별 ‘열람 기간’ 컬럼 없음(FE가 expired를 ‘열람 기간 만료’로 라벨링할 뿐). <b><code className={TBL_CLS}>restricted</code>(교수 제한)은 스키마 전용 컬럼 없음</b> → MVP는 <code className={TBL_CLS}>EXPR</code>만 채우고 restricted는 컬럼 추가 후 활성화. (목록의 ‘교수 제한’ 샘플은 컬럼 추가 후 UI 데모용.)
          </li>
          <li>
            · <b>인증 다운로드 필수</b> — 자료/첨부는 permitAll 아님 → BE 다운로드 엔드포인트(PLM-004-01 <code className={TBL_CLS}>downloadFile</code> 패턴). <code className={TBL_CLS}>&lt;a download&gt;</code>는 JWT 못 실어 blob fetch. ⚠️ <b>다중 첨부 실제 다운로드</b>(파일 개별 vs zip 묶음)는 BE/UX 결정.
          </li>
          <li>
            · <b>업로드일</b> = <code className={TBL_CLS}>LEC_UPL_REG_DATE</code> 날짜만(YYYY-MM-DD, 시각 의미 없음). <b>본문</b>(<code className={TBL_CLS}>LEC_UPL_CONTENT</code>, 교수 Tiptap HTML)은 테이블 ‘강의 내용’ 컬럼에 plain text 요약, ‘강의 보기’ 모달에서 <code className={TBL_CLS}>sanitizeLmsHtml</code> 정화 후 전체 렌더.
          </li>
        </ul>
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">강의 자료를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      ) : loading ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : !selectedCourse ? (
        <p className="py-16 text-center text-sm text-slate-400">표시할 강의 자료가 없습니다.</p>
      ) : (
        // 과목 전환 시 key로 MaterialsTable 리마운트 → 페이지 0으로 리셋
        <MaterialsTable key={selectedCourse.lecId} materials={selectedCourse.materials} onView={setViewing} />
      )}

      <StudentMaterialViewDialog
        open={viewing !== null}
        material={viewing}
        courseName={selectedCourse?.courseName}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

function MaterialsTable({
  materials,
  onView,
}: {
  materials: Material[];
  onView: (m: Material) => void;
}) {
  const [page, setPage] = useState(0);

  if (materials.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
        이 과목의 강의 자료가 없습니다.
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(materials.length / MATERIALS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = materials.slice(
    safePage * MATERIALS_PAGE_SIZE,
    safePage * MATERIALS_PAGE_SIZE + MATERIALS_PAGE_SIZE
  );
  const multiPage = totalPages > 1;
  // 다중 페이지일 때만 빈 행으로 높이 고정(페이지 이동 시 표 높이 안정). 단일 페이지는 자연 높이.
  const padCount = multiPage ? MATERIALS_PAGE_SIZE - pageRows.length : 0;

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
          {pageRows.map((m) => {
            const hasFile = m.attachments.length > 0;
            const contentSummary = m.content?.trim() ? htmlToPlainText(m.content) : "";
            return (
              <tr key={m.uploadId} className="border-b border-slate-50 last:border-0">
                {/* 제목 */}
                <td className="px-5 py-3">
                  <span className="block truncate font-semibold text-slate-800" title={m.title}>
                    {m.title}
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
                <td className="px-2 py-3 font-mono text-xs text-slate-500">{m.uploadedAt}</td>
                {/* 유형 — 첫 첨부 확장자 배지(🎬/📄) + 나머지 +N. 첨부 없으면 — (교수 업로드 미러) */}
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

      {/* 페이저 — 다중 페이지일 때만 노출(에메랄드 학생 테마) */}
      {multiPage && <MaterialsPager page={safePage} totalPages={totalPages} onChange={setPage} />}
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
