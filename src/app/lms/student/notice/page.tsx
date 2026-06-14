"use client";

// SLM-009 공지사항 — 수강 과목 교수가 작성한 강의 공지 확인 (좌 목록 선택 → 우 상세)
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13). 질문은 채팅(SLM-008).
// - 필터 = 년도/학기(기본 둘 다 '전체') + 과목 드롭다운(첫 과목 자동 선택, SLM-006/PLM-006 패턴)
//   → 선택한 '한 과목'의 공지만 좌측 목록에 표시. 년도/학기는 수강 과목을 클라에서 좁힘.
// - 공지 정렬: 최신순(날짜 내림차순) / 첨부파일 다운로드 (읽음 유무 기능 없음)
import { useCallback, useEffect, useMemo, useState } from "react";
import { truncateLectureName, LECTURE_NAME_MAX } from "@/lib/lmsLectureName";
import {
  getStudentNotices,
  type Notice,
  type NoticeBlock,
} from "@/lib/lmsStudentNoticeApi";

const TERM_LABEL: Record<string, string> = { SM1: "1학기", SMR: "여름 계절", SM2: "2학기", WNT: "겨울 계절" };
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

// 인수인계용 안내 박스의 테이블명 칩 스타일(모노스페이스) — SLM-006과 동일
const TBL_CLS =
  "rounded bg-white px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200";

const semLabelOf = (year: number, termCode: string) =>
  `${year}년 ${TERM_LABEL[termCode] ?? termCode}`;

// 과목 드롭다운 1행 = 과목(강의) + 소속 학기(년도/학기로 좁힘·라벨 표기용)
type CourseOption = {
  lecId: number;
  courseName: string; // 전체 이름(courseFullName)
  lecSection?: number;
  year: number;
  termCode: string;
};

// 공지 → 과목(강의) 단위 옵션. lecId로 중복 제거, 최신 학기·과목명 순
function courseOptionsOf(notices: Notice[]): CourseOption[] {
  const map = new Map<number, CourseOption>();
  for (const n of notices) {
    if (!map.has(n.lecId)) {
      map.set(n.lecId, {
        lecId: n.lecId,
        courseName: n.courseFullName,
        lecSection: n.lecSection,
        year: n.year,
        termCode: n.termCode,
      });
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      b.year - a.year ||
      TERM_ORDER.indexOf(b.termCode) - TERM_ORDER.indexOf(a.termCode) ||
      a.courseName.localeCompare(b.courseName)
  );
}

// (년도, 학기) 조합에 매칭되는 과목들. 둘 다 'all'이면 전체 (SLM-006 동일)
const matchCourses = (
  year: number | "all",
  term: string | "all",
  opts: CourseOption[]
): CourseOption[] =>
  opts.filter(
    (c) => (year === "all" || c.year === year) && (term === "all" || c.termCode === term)
  );

const NOTICE_PREVIEW_MAX = 20; // 목록 카드 제목 아래 공지 내용 미리보기 글자 수

// 공지 본문 블록(NoticeBlock[]) → 한 줄 plain text 요약(목록 미리보기용)
function noticeSummary(blocks: NoticeBlock[]): string {
  const text = blocks
    .map((b) => (b.type === "list" ? b.items.join(" ") : b.text))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > NOTICE_PREVIEW_MAX ? `${text.slice(0, NOTICE_PREVIEW_MAX)}…` : text;
}

export default function StudentNoticePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 년도·학기 분리 필터 — 기본 둘 다 '전체'(§21)
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  // 선택된 과목(첫 과목 자동 선택) / 선택된 공지
  const [selectedLecId, setSelectedLecId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getStudentNotices()
      .then((d) => {
        if (!alive) return;
        setNotices(d);
        // 첫 과목 자동 선택
        setSelectedLecId(courseOptionsOf(d)[0]?.lecId ?? null);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const courseOptions = useMemo(() => courseOptionsOf(notices), [notices]);
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

  // 선택 과목 공지 — 날짜 내림차순(최신순)
  const list = useMemo(() => {
    const filtered = notices.filter((n) => n.lecId === selectedLecId);
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }, [notices, selectedLecId]);

  // 년도/학기 변경 → 과목 목록 좁힘 + 첫 과목 자동 선택 (각 축 독립, SLM-006 동일)
  const handleYearChange = (year: number | "all") => {
    setYearFilter(year);
    setSelectedLecId(matchCourses(year, termFilter, courseOptions)[0]?.lecId ?? null);
  };
  const handleTermChange = (term: string | "all") => {
    setTermFilter(term);
    setSelectedLecId(matchCourses(yearFilter, term, courseOptions)[0]?.lecId ?? null);
  };

  // 과목 변경 시 공지 기본 선택(featured 우선, 없으면 첫 항목)
  useEffect(() => {
    if (list.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!list.some((n) => n.id === selectedId)) {
      setSelectedId((list.find((n) => n.featured) ?? list[0]).id);
    }
  }, [list, selectedId]);

  const selected = useMemo(() => list.find((n) => n.id === selectedId) ?? null, [list, selectedId]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* 헤더 — 좌: 제목+선택 과목·공지 건수 / 우: 년도·학기·과목 드롭다운 (SLM-006 레이아웃) */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">공지사항</h1>
          <p
            className="mt-1 flex items-center gap-1 text-sm text-slate-500"
            title={selectedCourse?.courseName ?? undefined}
          >
            <span className="min-w-0 truncate">{selectedCourse?.courseName ?? "과목 선택"}</span>
            <span className="shrink-0">· 공지 {list.length}건</span>
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
        🧪 샘플 데이터(BE 연동 전) — 실제 공지가 아닙니다.
      </div>

      {/* 인수인계용 — 이 화면 구현에 필요한 BE 테이블(정본=CLAUDE-DB.md). BE 연동 후 이 박스 삭제. */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <p className="mb-1.5 font-semibold text-slate-700">🗄 BE 연동 테이블 (이 화면 구현 시 필요)</p>
        <ul className="space-y-1">
          <li>
            <code className={TBL_CLS}>LECTURE_ANNOUNCEMENT</code> — 공지 본체(제목·본문 CONTENT CLOB·등록일시 REG_DATE·LEC_ID로 강의 연결)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_ANNOUNCEMENT_ATTACHMENT</code> — 첨부(1:N 다중·유형 EXT_TYPE·크기 FIL_SIZE·상태 ATT_VAL_STATUS: ACT/DEL/EXPR/FAIL)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_STUDENT_ENROLLMENT</code> — 학생 수강 강의(LMS_PRF_ID=학생, 상태 != ‘DRP’) → 열람 가능한 공지 한정
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE</code> + <code className={TBL_CLS}>LECTURE_CODE</code> — 강의·과목명(LEC_COD_NAME)·분반(LEC_SECTION)
          </li>
          <li>
            <code className={TBL_CLS}>LMS_PROFILE</code> + <code className={TBL_CLS}>MEMBER</code> — 작성 교수(<code className={TBL_CLS}>LECTURE.LMS_PRF_ID</code> → LMS_PROFILE → MEMBER_NAME) = 작성자
          </li>
          <li>
            <code className={TBL_CLS}>LMS_PROFILE_IMAGE</code> — 작성 교수 프로필 사진 → <code className={TBL_CLS}>authorImageUrl</code>(ORG_URL·VAL_STATUS=1, 없으면 기본 프로필사진)
          </li>
          <li>
            <code className={TBL_CLS}>SEMESTERS</code> — 학기(SEM_YEAR·SEM_TERM — 년도/학기 필터·과목 라벨)
          </li>
          <li>
            ⚠️ <code className={TBL_CLS}>LECTURE_ANNOUNCEMENT_READ_LOG</code> — 읽음 로그 테이블이나 <b>이 화면은 읽음 기능 미사용 → 안 씀</b>
          </li>
        </ul>

        <p className="mt-3 mb-1.5 font-semibold text-slate-700">📐 구현 규칙 · 특이사항</p>
        <ul className="space-y-1">
          <li>
            · <b>화면 구성</b> = 년도·학기(기본 둘 다 ‘전체’) + 과목 드롭다운(첫 과목 자동 선택) → 선택 과목 1개의 공지만 좌측 목록·클릭 시 우측 상세(SLM-006/PLM-006 패턴). BE는 수강 과목 공지 전체 반환, FE가 좁힘.
          </li>
          <li>
            · <b>수강 범위 = 신청한 전부</b>(폐강 CNCL 포함 — 수강 내역과 동일 정책). 학생이 수강하지 않은 강의의 공지는 노출 금지.
          </li>
          <li>
            · <b>정렬</b> = 등록일시(<code className={TBL_CLS}>REG_DATE</code>) 내림차순(최신순).
          </li>
          <li>
            · ⚠️ <b>읽음/안읽음 기능 없음</b>(사용자 결정) — <code className={TBL_CLS}>READ_LOG</code>·안읽음 카운트·제목 앞 점 전부 제외.
          </li>
          <li>
            · ⚠️ <b>조회수 없음</b> — DB에 조회수 컬럼/테이블 없음.
          </li>
          <li>
            · <b>작성자</b> = 수강 과목 교수. 프로필 사진 = <code className={TBL_CLS}>LMS_PROFILE_IMAGE</code> → <code className={TBL_CLS}>authorImageUrl</code>(없으면 기본 프로필사진 실루엣).
          </li>
          <li>
            · <b>등록일시</b> = <code className={TBL_CLS}>REG_DATE</code> → 상세 <code className={TBL_CLS}>YYYY-MM-DD HH:mm</code>(날짜+시간), 좌측 목록은 짧은 날짜(MM.DD).
          </li>
          <li>
            · <b>목록 카드</b> = 과목 배지 + 날짜 / 굵은 제목 / 본문 미리보기 <b>20자</b>(<code className={TBL_CLS}>NOTICE_PREVIEW_MAX</code>).
          </li>
          <li>
            · <b>본문</b>(CONTENT) = 현재 mock은 구조화 블록(<code className={TBL_CLS}>NoticeBlock[]</code>)으로 레이아웃 시연. ⚠️ 실제 저장 형식(블록 JSON vs 교수 에디터 HTML)은 BE·교수 공지 작성 화면(PLM, 미구현) 결정 — HTML이면 <code className={TBL_CLS}>sanitizeLmsHtml</code> 정화 후 렌더(PLM-005 패턴).
          </li>
          <li>
            · <b>첨부 = 인증 다운로드 필수</b>(permitAll 아님) → BE 다운로드 엔드포인트(PLM-004-01 <code className={TBL_CLS}>downloadFile</code> 패턴). <code className={TBL_CLS}>&lt;a download&gt;</code>는 JWT 못 실어 blob fetch. 표시 첨부 = <code className={TBL_CLS}>ATT_VAL_STATUS=ACT</code>만.
          </li>
          <li>
            · <b>BE 엔드포인트(안)</b> = <code className={TBL_CLS}>GET /api/lms/student/notices</code>(수강 과목 공지 전체) — authenticated, 가드 <code className={TBL_CLS}>STU</code>·<code className={TBL_CLS}>ALU</code>.
          </li>
        </ul>
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">공지사항을 불러오지 못했습니다.</p>
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
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">이 과목의 공지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[22rem_1fr]">
          {/* 좌: 공지 목록 */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">공지 목록</h2>
              <span className="text-[11px] text-slate-400">{list.length}건</span>
            </div>
            <ul className="p-2">
              {list.map((n) => {
                const active = n.id === selectedId;
                const summary = noticeSummary(n.content);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                        active ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          {n.courseName}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{n.listDate}</span>
                      </div>
                      <div className="mt-1.5">
                        <span className="block text-[15px] font-bold leading-snug text-slate-900">
                          {n.title}
                        </span>
                        {summary && (
                          <span className="mt-1 block truncate text-xs text-slate-400">{summary}</span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 우: 공지 상세 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            {!selected ? (
              <p className="py-16 text-center text-sm text-slate-400">공지를 선택하세요.</p>
            ) : (
              <NoticeDetail notice={selected} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function NoticeDetail({ notice }: { notice: Notice }) {
  const handleDownload = () => {
    // 🧪 mock 단계 — BE 연동 시 인증 blob 다운로드로 교체.
    window.alert("샘플 데이터입니다 (BE 연동 전) — 실제 파일 다운로드는 연동 후 동작합니다.");
  };

  return (
    <article>
      {/* 제목 + 메타 (과목·'공지' 배지는 좌측 목록/드롭다운에서 이미 아는 정보라 생략) */}
      <h3 className="text-xl font-bold text-slate-900">{notice.title}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 pb-4 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <AuthorAvatar src={notice.authorImageUrl} name={notice.author} />
          <span className="font-medium text-slate-700">{notice.author}</span>
        </span>
        <span>📅 {notice.date}</span>
      </div>

      {/* 본문 */}
      <div className="space-y-3 py-5">
        {notice.content.map((b, i) => (
          <NoticeBlockView key={i} block={b} />
        ))}
      </div>

      {/* 첨부 */}
      {notice.attachment && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-lg">📄</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
            {notice.attachment.fileName}
          </span>
          <span className="shrink-0 text-xs text-slate-400">{notice.attachment.size}</span>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            ⤓ 다운로드
          </button>
        </div>
      )}
    </article>
  );
}

// 작성 교수 프로필 아바타 — BE 연동 시 authorImageUrl(LMS_PROFILE_IMAGE) 사진 표시, 없으면 기본 프로필사진(실루엣)
function AuthorAvatar({ src, name }: { src?: string | null; name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-6 w-6 text-slate-400">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6Z" />
        </svg>
      )}
    </span>
  );
}

function NoticeBlockView({ block }: { block: NoticeBlock }) {
  if (block.type === "heading") {
    return <h4 className="pt-1 text-sm font-bold text-slate-800">{block.text}</h4>;
  }
  if (block.type === "list") {
    return (
      <ul className="space-y-1.5 pl-1">
        {block.items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
            <span className="text-slate-400">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm leading-relaxed text-slate-600">{block.text}</p>;
}
