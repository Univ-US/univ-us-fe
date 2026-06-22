"use client";

// SLM-009 공지사항 — 수강 과목 1개 선택 → 그 과목 공지를 page/size로 서버 조회(클라 slice 없음, 교수 PLM-005 미러).
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { truncateLectureName, LECTURE_NAME_MAX } from "@/lib/lmsLectureName";
import { sanitizeLmsHtml, htmlToPlainText } from "@/lib/lmsSanitize";
import { describeApiError } from "@/lib/lmsApiError";
import { getLmsAvatarColor, getLmsAvatarInitial } from "@/lib/lmsAvatar";
import { resolveImageUrl } from "@/lib/lmsProfessorStudentsApi";
import { getCommonCodeList } from "@/lib/lmsCommonCode";
import { formatFileSize } from "@/lib/lmsStudentAssignmentsApi";
import {
  downloadStudentNoticeAttachment,
  getStudentNoticeLectures,
  getStudentNotices,
} from "@/lib/lmsStudentNoticeApi";
import type { Lecture, Notice, NoticeAttachment } from "@/types/lmsStudentNotice";
import "@/components/lms/lms-content.css";

const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const semLabelOf = (
  year: number,
  termCode: string,
  termMap: Record<string, string>
) => `${year}년 ${termMap[termCode] ?? termCode}`;

type Toast = {
  type: "success" | "error";
  message: string;
};

// (년도, 학기) 조합에 매칭되는 수강 과목들. 둘 다 'all'이면 전체
const matchLectures = (
  year: number | "all",
  term: string | "all",
  lectures: Lecture[]
): Lecture[] =>
  lectures.filter(
    (course) =>
      (year === "all" || course.semYear === year) &&
      (term === "all" || course.semTerm === term)
  );

const NOTICE_PREVIEW_MAX = 20;
const NOTICE_PAGE_SIZE = 8;

function noticeSummary(html: string): string {
  const text = htmlToPlainText(html);
  return text.length > NOTICE_PREVIEW_MAX ? `${text.slice(0, NOTICE_PREVIEW_MAX)}...` : text;
}

export default function StudentNoticePage() {
  // 수강 과목 드롭다운 (마운트 1회 — 년도/학기/과목 필터 소스)
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [lecturesLoading, setLecturesLoading] = useState(true);
  const [lecturesError, setLecturesError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [selectedLecId, setSelectedLecId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  // 선택 과목 공지 1페이지(서버 응답)
  const [notices, setNotices] = useState<Notice[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [noticesError, setNoticesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
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

  const showToast = useCallback((nextToast: Toast) => {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // 수강 과목 드롭다운 로드 + 첫 과목 자동 선택
  const loadLectures = useCallback(() => {
    setLecturesLoading(true);
    setLecturesError(null);
    let alive = true;
    getStudentNoticeLectures()
      .then((data) => {
        if (!alive) return;
        setLectures(data);
        setSelectedLecId(data[0]?.lecId ?? null);
      })
      .catch((err) => alive && setLecturesError(describeApiError(err)))
      .finally(() => alive && setLecturesLoading(false));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => loadLectures(), [loadLectures]);

  // 선택 과목 + page → 공지 페이지 서버 조회
  const loadNotices = useCallback((lecId: number, p: number) => {
    const reqId = ++reqIdRef.current;
    setNoticesLoading(true);
    setNoticesError(null);
    getStudentNotices({ lecId, page: p, size: NOTICE_PAGE_SIZE })
      .then((data) => {
        if (reqId !== reqIdRef.current) return; // stale 응답 무시
        setNotices(data.content);
        setTotalElements(data.totalElements);
        setTotalPages(data.totalPages);
        setHasLoaded(true);
      })
      .catch((err) => {
        if (reqId === reqIdRef.current) setNoticesError(describeApiError(err));
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setNoticesLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedLecId == null) {
      setNotices([]);
      setTotalElements(0);
      setTotalPages(0);
      setHasLoaded(false);
      return;
    }
    loadNotices(selectedLecId, page);
  }, [selectedLecId, page, loadNotices]);

  const yearOptions = useMemo(
    () => [...new Set(lectures.map((course) => course.semYear))].sort((a, b) => b - a),
    [lectures]
  );
  const termOptions = termOrder;
  const filteredLectures = useMemo(
    () => matchLectures(yearFilter, termFilter, lectures),
    [yearFilter, termFilter, lectures]
  );
  const selectedLecture = useMemo(
    () => lectures.find((course) => course.lecId === selectedLecId) ?? null,
    [lectures, selectedLecId]
  );

  // 과목/필터 변경 → 선택 과목 교체 + page 0 리셋
  const selectLecture = (lecId: number | null) => {
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

  // 현재 페이지 공지 변경 → 선택 공지 보정(현재 페이지에 없으면 첫 공지)
  useEffect(() => {
    if (notices.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!notices.some((notice) => notice.noticeId === selectedId)) {
      setSelectedId(notices[0].noticeId);
    }
  }, [notices, selectedId]);

  const selected = useMemo(
    () => notices.find((notice) => notice.noticeId === selectedId) ?? null,
    [notices, selectedId]
  );
  const startIndex = page * NOTICE_PAGE_SIZE;

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border-primary/20 bg-primary/5 text-primary"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      )}

      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">공지사항</h1>
          <p
            className="mt-1 flex items-center gap-1 text-sm text-slate-500"
            title={selectedLecture?.courseName ?? undefined}
          >
            <span className="min-w-0 truncate">{selectedLecture?.courseName ?? "과목 선택"}</span>
            <span className="shrink-0">· 공지 {totalElements}건</span>
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
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}년
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
            {termOptions.map((term) => (
              <option key={term} value={term}>
                {termMap[term] ?? term}
              </option>
            ))}
          </select>
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
              filteredLectures.map((course) => (
                <option
                  key={course.lecId}
                  value={course.lecId}
                  title={course.courseName.length > LECTURE_NAME_MAX ? course.courseName : undefined}
                >
                  {truncateLectureName(course.courseName)}
                  {course.lecSection != null ? ` · ${course.lecSection}반` : ""} ·{" "}
                  {semLabelOf(course.semYear, course.semTerm, termMap)}
                </option>
              ))
            )}
          </select>
        </div>
      </header>

      {lecturesError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">{lecturesError}</p>
          <button
            type="button"
            onClick={loadLectures}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            다시 시도
          </button>
        </div>
      ) : lecturesLoading ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중...</p>
      ) : selectedLecId == null ? (
        <p className="py-16 text-center text-sm text-slate-400">표시할 공지가 없습니다.</p>
      ) : noticesError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">{noticesError}</p>
          <button
            type="button"
            onClick={() => loadNotices(selectedLecId, page)}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            다시 시도
          </button>
        </div>
      ) : !hasLoaded && noticesLoading ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중...</p>
      ) : notices.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">선택한 과목의 공지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[22rem_1fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">공지 목록</h2>
              <span className="text-[11px] text-slate-400">{totalElements}건</span>
            </div>
            <ul className="p-2">
              {notices.map((notice) => {
                const active = notice.noticeId === selectedId;
                const summary = noticeSummary(notice.lecAnnContent);
                return (
                  <li key={notice.noticeId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(notice.noticeId)}
                      className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                        active ? "bg-primary/5" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          {selectedLecture?.courseName ?? ""}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{notice.listDate}</span>
                      </div>
                      <div className="mt-1.5">
                        <span className="block text-[15px] font-bold leading-snug text-slate-900">
                          {notice.lecAnnTitle}
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
            {totalPages > 1 && (
              <NoticePager
                page={page}
                totalPages={totalPages}
                totalItems={totalElements}
                startIndex={startIndex}
                visibleCount={notices.length}
                onChange={setPage}
              />
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            {!selected ? (
              <p className="py-16 text-center text-sm text-slate-400">공지를 선택하세요.</p>
            ) : (
              <NoticeDetail notice={selected} onToast={showToast} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function NoticePager({
  page,
  totalPages,
  totalItems,
  startIndex,
  visibleCount,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  visibleCount: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
      <span className="text-[11px] text-slate-400">
        총 {totalItems}건 중 {startIndex + 1}-{startIndex + visibleCount} 표시
      </span>
      <div className="flex items-center gap-1">
        <PageBtn disabled={page === 0} onClick={() => onChange(page - 1)}>
          이전
        </PageBtn>
        {Array.from({ length: totalPages }).map((_, i) => (
          <PageBtn key={i} active={i === page} onClick={() => onChange(i)}>
            {i + 1}
          </PageBtn>
        ))}
        <PageBtn disabled={page === totalPages - 1} onClick={() => onChange(page + 1)}>
          다음
        </PageBtn>
      </div>
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
      onClick={onClick}
      disabled={disabled}
      className={`min-w-8 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
        active
          ? "bg-primary text-white"
          : "border border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:border-transparent disabled:hover:bg-transparent`}
    >
      {children}
    </button>
  );
}

function NoticeDetail({
  notice,
  onToast,
}: {
  notice: Notice;
  onToast: (toast: Toast) => void;
}) {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (attachment: NoticeAttachment) => {
    setDownloadingId(attachment.attachmentId);
    try {
      await downloadStudentNoticeAttachment(attachment);
      onToast({ type: "success", message: "다운로드를 시작했습니다." });
    } catch (err) {
      onToast({ type: "error", message: describeApiError(err) });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <article>
      <h3 className="text-xl font-bold text-slate-900">{notice.lecAnnTitle}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 pb-4 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <AuthorAvatar
            src={notice.authorImageUrl}
            seed={notice.professorLmsPrfId}
            name={notice.author}
          />
          <span className="font-medium text-slate-700">{notice.author}</span>
        </span>
        <span>{notice.lecAnnRegDate}</span>
      </div>

      {notice.lecAnnContent?.trim() ? (
        <div
          className="lms-content py-5"
          dangerouslySetInnerHTML={{ __html: sanitizeLmsHtml(notice.lecAnnContent) }}
        />
      ) : (
        <p className="py-10 text-center text-sm text-slate-400">작성된 내용이 없습니다.</p>
      )}

      {notice.attachments.length > 0 && (
        <div className="space-y-2">
          {notice.attachments.map((attachment) => (
            <div
              key={attachment.attachmentId}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <span className="text-lg">첨부</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                {attachment.fileName}
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {attachment.fileSize == null ? "-" : formatFileSize(attachment.fileSize)}
              </span>
              <button
                type="button"
                onClick={() => void handleDownload(attachment)}
                disabled={downloadingId === attachment.attachmentId}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloadingId === attachment.attachmentId ? "처리 중" : "다운로드"}
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

// 작성자 아바타 — 기본 프로필 규칙(lib/lmsAvatar): 업로드 이미지가 있으면 그 이미지,
// 없으면 사람 식별자(교수 lmsPrfId) 시드 색 원형 + 이름 이니셜. 같은 교수는 어느 화면에서나 같은 색.
function AuthorAvatar({
  src,
  seed,
  name,
}: {
  src?: string | null;
  seed: string | number | null | undefined;
  name: string;
}) {
  const img = resolveImageUrl(src);
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white ${getLmsAvatarColor(seed)}`}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={name} className="h-full w-full object-cover" />
      ) : (
        getLmsAvatarInitial(name)
      )}
    </span>
  );
}
