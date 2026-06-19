"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { truncateLectureName, LECTURE_NAME_MAX } from "@/lib/lmsLectureName";
import { sanitizeLmsHtml, htmlToPlainText } from "@/lib/lmsSanitize";
import { describeApiError } from "@/lib/lmsApiError";
import { formatFileSize } from "@/lib/lmsStudentAssignmentsApi";
import {
  downloadStudentNoticeAttachment,
  getStudentNotices,
} from "@/lib/lmsStudentNoticeApi";
import type { Notice, NoticeAttachment } from "@/types/lmsStudentNotice";
import "@/components/lms/lms-content.css";

const TERM_LABEL: Record<string, string> = {
  SM1: "1학기",
  SMR: "여름 계절",
  SM2: "2학기",
  WNT: "겨울 계절",
};
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const semLabelOf = (year: number, termCode: string) =>
  `${year}년 ${TERM_LABEL[termCode] ?? termCode}`;

type Toast = {
  type: "success" | "error";
  message: string;
};

type CourseOption = {
  lecId: number;
  courseName: string;
  lecSection?: number | null;
  year: number;
  termCode: string;
};

function courseOptionsOf(notices: Notice[]): CourseOption[] {
  const map = new Map<number, CourseOption>();
  for (const notice of notices) {
    if (!map.has(notice.lecId)) {
      map.set(notice.lecId, {
        lecId: notice.lecId,
        courseName: notice.courseFullName,
        lecSection: notice.lecSection,
        year: notice.semYear,
        termCode: notice.semTerm,
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

const matchCourses = (
  year: number | "all",
  term: string | "all",
  opts: CourseOption[]
): CourseOption[] =>
  opts.filter(
    (course) =>
      (year === "all" || course.year === year) &&
      (term === "all" || course.termCode === term)
  );

const NOTICE_PREVIEW_MAX = 20;
const NOTICE_PAGE_SIZE = 8;

function noticeSummary(html: string): string {
  const text = htmlToPlainText(html);
  return text.length > NOTICE_PREVIEW_MAX ? `${text.slice(0, NOTICE_PREVIEW_MAX)}...` : text;
}

export default function StudentNoticePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [selectedLecId, setSelectedLecId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((nextToast: Toast) => {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentNotices();
      setNotices(data);
      setSelectedLecId((prev) => {
        const options = courseOptionsOf(data);
        return options.some((course) => course.lecId === prev)
          ? prev
          : options[0]?.lecId ?? null;
      });
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const courseOptions = useMemo(() => courseOptionsOf(notices), [notices]);
  const yearOptions = useMemo(
    () => [...new Set(courseOptions.map((course) => course.year))].sort((a, b) => b - a),
    [courseOptions]
  );
  const termOptions = useMemo(
    () =>
      [...new Set(courseOptions.map((course) => course.termCode))].sort(
        (a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b)
      ),
    [courseOptions]
  );
  const filteredCourses = useMemo(
    () => matchCourses(yearFilter, termFilter, courseOptions),
    [yearFilter, termFilter, courseOptions]
  );
  const selectedCourse = useMemo(
    () => courseOptions.find((course) => course.lecId === selectedLecId) ?? null,
    [courseOptions, selectedLecId]
  );

  const list = useMemo(() => {
    const filtered = notices.filter((notice) => notice.lecId === selectedLecId);
    return [...filtered].sort((a, b) => b.lecAnnRegDate.localeCompare(a.lecAnnRegDate));
  }, [notices, selectedLecId]);
  const totalPages = Math.max(1, Math.ceil(list.length / NOTICE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStartIndex = safePage * NOTICE_PAGE_SIZE;
  const pagedList = useMemo(
    () => list.slice(pageStartIndex, pageStartIndex + NOTICE_PAGE_SIZE),
    [list, pageStartIndex]
  );

  const handleYearChange = (year: number | "all") => {
    setYearFilter(year);
    setSelectedLecId(matchCourses(year, termFilter, courseOptions)[0]?.lecId ?? null);
  };

  const handleTermChange = (term: string | "all") => {
    setTermFilter(term);
    setSelectedLecId(matchCourses(yearFilter, term, courseOptions)[0]?.lecId ?? null);
  };

  useEffect(() => {
    setPage(0);
  }, [selectedLecId]);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  useEffect(() => {
    if (list.length === 0) {
      setSelectedId(null);
      return;
    }
    const selectable = pagedList.length > 0 ? pagedList : list;
    if (!selectable.some((notice) => notice.noticeId === selectedId)) {
      setSelectedId((selectable.find((notice) => notice.featured) ?? selectable[0]).noticeId);
    }
  }, [list, pagedList, selectedId]);

  const selected = useMemo(
    () => list.find((notice) => notice.noticeId === selectedId) ?? null,
    [list, selectedId]
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
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
            disabled={loading || courseOptions.length === 0}
            className={`${selectClass} w-32`}
          >
            <option value="">전체 학기</option>
            {termOptions.map((term) => (
              <option key={term} value={term}>
                {TERM_LABEL[term] ?? term}
              </option>
            ))}
          </select>
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
              filteredCourses.map((course) => (
                <option
                  key={course.lecId}
                  value={course.lecId}
                  title={course.courseName.length > LECTURE_NAME_MAX ? course.courseName : undefined}
                >
                  {truncateLectureName(course.courseName)}
                  {course.lecSection != null ? ` · ${course.lecSection}반` : ""} ·{" "}
                  {semLabelOf(course.year, course.termCode)}
                </option>
              ))
            )}
          </select>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      ) : loading ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중...</p>
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">선택한 과목의 공지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[22rem_1fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">공지 목록</h2>
              <span className="text-[11px] text-slate-400">{list.length}건</span>
            </div>
            <ul className="p-2">
              {pagedList.map((notice) => {
                const active = notice.noticeId === selectedId;
                const summary = noticeSummary(notice.lecAnnContent);
                return (
                  <li key={notice.noticeId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(notice.noticeId)}
                      className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                        active ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          {notice.courseName}
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
                page={safePage}
                totalPages={totalPages}
                totalItems={list.length}
                startIndex={pageStartIndex}
                visibleCount={pagedList.length}
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
          ? "bg-emerald-700 text-white"
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
          <AuthorAvatar src={notice.authorImageUrl} name={notice.author} />
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
