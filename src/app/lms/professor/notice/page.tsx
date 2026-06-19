"use client";

// PLM-007 교수 공지사항 관리 — 담당 강의 공지 작성·수정·삭제 (좌 목록 선택 → 우 상세)
// BE 연동 완료(2026-06-15): lmsProfessorNoticeApi가 /api/lms/professor/notices 실호출. 교수 슬레이트 톤(§13).
//   - 구성(§21) = 상단 년도/학기(기본 둘 다 '전체') + 과목 드롭다운(첫 과목 자동 선택)
//     → 선택한 '한 과목'의 공지만 좌측 목록·클릭 시 우측 상세(SLM-009/PLM-006 패턴).
//   - 작성/수정 = 모달(PLM-005/006 관례). 본문 = Tiptap HTML → sanitizeLmsHtml 렌더(학생 SLM-009와 동일 형식).
//   - 이 화면이 작성한 공지가 곧 학생 SLM-009에 노출(같은 LECTURE_ANNOUNCEMENT). 교수는 담당 강의만 관리.
import { useCallback, useEffect, useMemo, useState } from "react";
import useEscapeClose from "@/components/lms/useEscapeClose";
import ProfessorRichTextEditor from "@/components/lms/ProfessorRichTextEditor";
import { sanitizeLmsHtml, htmlToPlainText } from "@/lib/lmsSanitize";
import { formatFileSize } from "@/lib/lmsProfessorUploadApi";
import { truncateLectureName, LECTURE_NAME_MAX } from "@/lib/lmsLectureName";
import { getCommonCodeList } from "@/lib/lmsCommonCode";
import {
  TERM_LABEL,
  NOTICE_ACCEPT,
  NOTICE_ALLOWED_EXTS,
  NOTICE_MAX_CONTENT,
  NOTICE_MAX_FILENAME,
  NOTICE_MAX_TITLE,
  NOTICE_MAX_TOTAL_SIZE,
  fileExtOf,
  getNoticeLectures,
  getCourseNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  downloadNoticeAttachment,
} from "@/lib/lmsProfessorNoticeApi";
import type { Notice, NoticeAttachment, NoticeLecture } from "@/types/lmsProfessorNotice";
import "@/components/lms/lms-content.css"; // 본문 HTML 렌더 스타일(.lms-content)

const NOTICE_PREVIEW_MAX = 28; // 목록 카드 본문 미리보기 글자 수

// 교수 슬레이트 톤(§13) — 포커스 링 slate-500, 1차 버튼 slate-800
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500";
const labelClass = "text-sm font-semibold text-slate-700";

const semLabelOf = (year: number, termCode: string) =>
  `${year}년 ${TERM_LABEL[termCode] ?? termCode}`;

// 빈 에디터 문서("<p></p>")는 ""로 정규화 (PLM-005/006 관례)
const normalizeHtml = (html: string) => (html === "<p></p>" ? "" : html);

// 본문 HTML → 목록 미리보기용 한 줄 요약
const previewOf = (html: string) => {
  const text = htmlToPlainText(html);
  return text.length > NOTICE_PREVIEW_MAX ? `${text.slice(0, NOTICE_PREVIEW_MAX)}…` : text;
};

// 선택된 (년도, 학기) 조합에 매칭되는 담당 강의들. 둘 다 'all'이면 전 강의.
const matchLectures = (
  year: number | "all",
  term: string | "all",
  lecs: NoticeLecture[]
): NoticeLecture[] =>
  lecs.filter(
    (l) => (year === "all" || l.semYear === year) && (term === "all" || l.semTerm === term)
  );

interface FormState {
  lecId: number | "";
  title: string;
  content: string; // HTML
  files: File[];
  removeAttachmentIds: number[];
}

const EMPTY_FORM: FormState = {
  lecId: "",
  title: "",
  content: "",
  files: [],
  removeAttachmentIds: [],
};

export default function ProfessorNoticePage() {
  // 드롭다운/구조 (PLM-006 패턴)
  const [lectures, setLectures] = useState<NoticeLecture[]>([]);
  const [termOrder, setTermOrder] = useState<string[]>([]); // 학기 정렬 순서(공통코드 SEM_TERM CODE_ORDER)
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [selectedLecId, setSelectedLecId] = useState<number | null>(null);

  // 선택 과목의 공지(최신순) + 선택된 공지
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0); // CRUD 후 강제 재조회

  // 작성/수정 모달
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // 마운트: 학기 정렬 순서(공통코드 SEM_TERM) 로드
  useEffect(() => {
    getCommonCodeList("SEM_TERM").then((list) => setTermOrder(list.map((c) => c.codeVal)));
  }, []);

  // 마운트: 담당 강의 → 첫 과목 선택
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const lecs = await getNoticeLectures();
        if (!alive) return;
        setLectures(lecs);
        const first = matchLectures("all", "all", lecs)[0]?.lecId ?? null;
        setSelectedLecId(first);
        if (first == null) setLoading(false);
      } catch {
        if (alive) {
          setError(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 선택 과목 공지 조회 (과목/재조회틱 변경 시)
  useEffect(() => {
    if (selectedLecId == null) {
      setNotices([]);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const list = await getCourseNotices(selectedLecId);
        if (alive) setNotices(list);
      } catch {
        if (alive) {
          setError(true);
          setNotices([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedLecId, reloadTick]);

  // 과목 변경/목록 변동 시 기본 선택(첫 항목). 현재 선택이 목록에 있으면 유지.
  useEffect(() => {
    if (notices.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!notices.some((n) => n.noticeId === selectedId)) {
      setSelectedId(notices[0].noticeId);
    }
  }, [notices, selectedId]);

  // 드롭다운 옵션 (담당 강의에서 유도)
  const filteredLectures = useMemo(
    () => matchLectures(yearFilter, termFilter, lectures),
    [yearFilter, termFilter, lectures]
  );
  const yearOptions = useMemo(
    () => [...new Set(lectures.map((l) => l.semYear))].sort((a, b) => b - a),
    [lectures]
  );
  const termOptions = useMemo(
    () =>
      [...new Set(lectures.map((l) => l.semTerm))].sort(
        (a, b) => termOrder.indexOf(a) - termOrder.indexOf(b)
      ),
    [lectures, termOrder]
  );
  const selectedLecture = useMemo(
    () => lectures.find((l) => l.lecId === selectedLecId) ?? null,
    [lectures, selectedLecId]
  );
  const selected = useMemo(
    () => notices.find((n) => n.noticeId === selectedId) ?? null,
    [notices, selectedId]
  );

  // 년도/학기 변경 → 강의 좁힘 + 첫 과목 선택 (각 축 독립, PLM-006 동일)
  const applyLectureFilter = (year: number | "all", term: string | "all") => {
    const lecId = matchLectures(year, term, lectures)[0]?.lecId ?? null;
    setSelectedLecId(lecId);
    if (lecId == null) {
      setNotices([]);
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

  // ── 폼 검증 ──
  const requiredOk =
    form.lecId !== "" && form.title.trim() !== "" && normalizeHtml(form.content) !== "";

  // 수정 시 변경 없음이면 비활성 (dirty 가드)
  const dirty = useMemo(() => {
    if (!editing) return true;
    return (
      form.title !== editing.lecAnnTitle ||
      normalizeHtml(form.content) !== normalizeHtml(editing.lecAnnContent) ||
      form.files.length > 0 ||
      form.removeAttachmentIds.length > 0
    );
  }, [editing, form]);

  // 첨부 합계(유지될 기존 첨부 + 새로 고른 파일) — 100MB 캡 표시용
  const attachTotalSize = useMemo(() => {
    const keptExisting = editing
      ? editing.attachments
          .filter((a) => !form.removeAttachmentIds.includes(a.attachmentId))
          .reduce((s, a) => s + a.fileSize, 0)
      : 0;
    return keptExisting + form.files.reduce((s, f) => s + f.size, 0);
  }, [editing, form.removeAttachmentIds, form.files]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setActionError(null);
  }, []);

  // ESC = ✕/취소 (저장 중엔 무시) — LMS 모달 관례
  useEscapeClose(formOpen && !saving, closeForm);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, lecId: selectedLecId ?? "" });
    setActionError(null);
    setFormOpen(true);
  };

  const openEdit = (n: Notice) => {
    setEditing(n);
    setForm({ lecId: n.lecId, title: n.lecAnnTitle, content: n.lecAnnContent, files: [], removeAttachmentIds: [] });
    setActionError(null);
    setFormOpen(true);
  };

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    // 첨부 합계 제한 — 유지될 기존 첨부 + 이미 고른 새 파일 + 이번 선택분을 합산해 100MB 이내까지만 추가
    const keptExistingSize = editing
      ? editing.attachments
          .filter((a) => !form.removeAttachmentIds.includes(a.attachmentId))
          .reduce((s, a) => s + a.fileSize, 0)
      : 0;
    let runningTotal = keptExistingSize + form.files.reduce((s, f) => s + f.size, 0);
    const next: File[] = [];
    let skippedForSize = false;
    for (const f of Array.from(list)) {
      if (!NOTICE_ALLOWED_EXTS.includes(fileExtOf(f.name))) {
        window.alert(`허용되지 않는 파일 형식입니다: ${f.name}`);
        continue;
      }
      if (f.name.length > NOTICE_MAX_FILENAME) {
        window.alert(`파일명이 너무 깁니다(최대 ${NOTICE_MAX_FILENAME}자): ${f.name}`);
        continue;
      }
      if (runningTotal + f.size > NOTICE_MAX_TOTAL_SIZE) {
        skippedForSize = true;
        continue;
      }
      runningTotal += f.size;
      next.push(f);
    }
    if (skippedForSize) {
      window.alert(
        `첨부 합계는 최대 100MB까지입니다. 용량을 초과하는 일부 파일은 추가되지 않았습니다. (현재 합계 ${formatFileSize(runningTotal)})`
      );
    }
    if (next.length > 0) setForm((p) => ({ ...p, files: [...p.files, ...next] }));
  };

  const handleSubmit = async () => {
    if (!requiredOk || saving || (editing && !dirty)) return;
    setSaving(true);
    setActionError(null);
    const wasEdit = editing != null;
    try {
      const input = {
        lecId: Number(form.lecId),
        title: form.title.trim(),
        content: normalizeHtml(form.content),
        files: form.files,
        removeAttachmentIds: form.removeAttachmentIds,
      };
      if (editing) {
        const updated = await updateNotice(editing.noticeId, input);
        setSelectedId(updated.noticeId);
      } else {
        const created = await createNotice(input);
        // 등록한 공지의 과목으로 전환(현재 필터에 없으면 필터 해제 후 그 과목 선택)
        const inFilter = matchLectures(yearFilter, termFilter, lectures).some(
          (l) => l.lecId === created.lecId
        );
        if (!inFilter) {
          setYearFilter("all");
          setTermFilter("all");
        }
        setSelectedLecId(created.lecId);
        setSelectedId(created.noticeId);
      }
      closeForm();
      setReloadTick((t) => t + 1);
    } catch {
      setActionError(wasEdit ? "공지 수정에 실패했습니다." : "공지 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (n: Notice) => {
    if (!window.confirm(`'${n.lecAnnTitle}' 공지를 삭제할까요?`)) return;
    setActionError(null);
    try {
      await deleteNotice(n.noticeId);
      if (editing?.noticeId === n.noticeId) closeForm();
      if (selectedId === n.noticeId) setSelectedId(null);
      setReloadTick((t) => t + 1);
    } catch {
      setActionError("공지 삭제에 실패했습니다.");
    }
  };

  // 다시 시도 — 담당 강의가 비었으면(로드 실패) 강의부터 재로드, 아니면 현재 과목 재조회
  const retry = async () => {
    setError(false);
    if (lectures.length > 0) {
      setReloadTick((t) => t + 1);
      return;
    }
    setLoading(true);
    try {
      const lecs = await getNoticeLectures();
      setLectures(lecs);
      const first = matchLectures("all", "all", lecs)[0]?.lecId ?? null;
      setSelectedLecId(first);
      if (first == null) setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-8">
      <div className="mx-auto max-w-6xl">
        {/* 헤더 — 좌: 제목+선택 과목·건수 / 우: 년도·학기·과목 드롭다운 + 공지 작성 (§21 레이아웃) */}
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900">공지사항 관리</h1>
            <p
              className="mt-1 flex items-center gap-1 text-sm text-slate-500"
              title={selectedLecture?.courseName ?? undefined}
            >
              <span className="min-w-0 truncate">{selectedLecture?.courseName ?? "과목 선택"}</span>
              <span className="shrink-0">· 공지 {notices.length}건</span>
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <select
              value={yearFilter === "all" ? "" : String(yearFilter)}
              onChange={(e) => handleYearChange(e.target.value === "" ? "all" : Number(e.target.value))}
              disabled={lectures.length === 0}
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
              disabled={lectures.length === 0}
              className={`${selectClass} w-32`}
            >
              <option value="">전체 학기</option>
              {termOptions.map((t) => (
                <option key={t} value={t}>
                  {TERM_LABEL[t] ?? t}
                </option>
              ))}
            </select>
            {/* 과목 드롭다운 — 년도/학기로 좁힌 담당 강의, 첫 과목 자동 선택 */}
            <select
              value={selectedLecId ?? ""}
              onChange={(e) => setSelectedLecId(Number(e.target.value))}
              disabled={filteredLectures.length === 0}
              className={`${selectClass} w-64`}
            >
              {filteredLectures.length === 0 ? (
                <option value="" disabled>
                  담당 강의 없음
                </option>
              ) : (
                filteredLectures.map((l) => (
                  <option
                    key={l.lecId}
                    value={l.lecId}
                    title={l.courseName.length > LECTURE_NAME_MAX ? l.courseName : undefined}
                  >
                    {truncateLectureName(l.courseName)}
                    {l.lecSection != null ? ` · ${l.lecSection}반` : ""} · {semLabelOf(l.semYear, l.semTerm)}
                  </option>
                ))
              )}
            </select>
            {/* 공지 작성 — 모달 (필터 오른쪽 배치) */}
            <button
              type="button"
              onClick={openCreate}
              disabled={selectedLecId == null}
              className="h-9 shrink-0 rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              + 공지 작성
            </button>
          </div>
        </header>

        {/* 액션 에러 */}
        {actionError && (
          <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
            {actionError}
          </p>
        )}

        {/* 본문 — 좌 목록 / 우 상세 */}
        {error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">공지사항을 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              다시 시도
            </button>
          </div>
        ) : loading ? (
          <p className="py-16 text-center text-sm text-slate-400">불러오는 중…</p>
        ) : selectedLecId == null ? (
          <p className="py-16 text-center text-sm text-slate-400">담당 강의가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[22rem_1fr]">
            {/* 좌: 공지 목록 */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-800">공지 목록</h2>
                <span className="text-[11px] text-slate-400">{notices.length}건</span>
              </div>
              {notices.length === 0 ? (
                <p className="px-4 py-14 text-center text-sm text-slate-400">
                  이 과목의 공지가 없습니다.
                  <br />
                  <span className="text-xs">‘+ 공지 작성’으로 첫 공지를 등록하세요.</span>
                </p>
              ) : (
                <ul className="p-2">
                  {notices.map((n) => {
                    const active = n.noticeId === selectedId;
                    const preview = previewOf(n.lecAnnContent);
                    return (
                      <li key={n.noticeId}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(n.noticeId)}
                          className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                            active ? "bg-slate-100" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                              {truncateLectureName(n.courseName)}
                              {n.lecSection != null ? ` · ${n.lecSection}반` : ""}
                            </span>
                            <span className="shrink-0 text-xs text-slate-400">{n.listDate}</span>
                          </div>
                          <div className="mt-1.5">
                            <span className="block break-words text-[15px] font-bold leading-snug text-slate-900">
                              {n.lecAnnTitle}
                            </span>
                            {preview && (
                              <span className="mt-1 block truncate text-xs text-slate-400">
                                {preview}
                              </span>
                            )}
                            {n.attachments.length > 0 && (
                              <span className="mt-1 inline-block text-[11px] text-slate-400">
                                📎 첨부 {n.attachments.length}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 우: 공지 상세 */}
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6">
              {!selected ? (
                <p className="py-16 text-center text-sm text-slate-400">공지를 선택하세요.</p>
              ) : (
                <NoticeDetail
                  notice={selected}
                  onEdit={() => openEdit(selected)}
                  onDelete={() => handleDelete(selected)}
                />
              )}
            </section>
          </div>
        )}
      </div>

      {/* 작성/수정 모달 — '+ 공지 작성' / 상세 '수정'으로 열림.
          ESC=✕(LMS 모달 관례), 백드롭 클릭 닫기는 입력 유실 방지로 미적용.
          pl-64(사이드바 w-60 + 여백)·pr-4 비대칭 → 다이얼로그는 콘텐츠 영역 기준 가운데 */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pl-64 pr-4">
          <section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="min-w-0 truncate text-base font-bold text-slate-800">
                {editing ? `공지 수정 — ${editing.lecAnnTitle}` : "공지 작성"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="닫기"
                className="shrink-0 text-lg leading-none text-slate-400 hover:text-slate-600 disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className={labelClass}>
                  대상 과목 <span className="text-rose-500">*</span>
                </label>
                {/* 수정 시 과목 변경 불가 — 신규 등록에서만 선택 */}
                <select
                  className={`${selectClass} mt-2 h-10 w-full`}
                  value={form.lecId === "" ? "" : String(form.lecId)}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lecId: e.target.value === "" ? "" : Number(e.target.value) }))
                  }
                  disabled={!!editing}
                >
                  <option value="">과목을 선택하세요</option>
                  {lectures.map((l) => (
                    <option
                      key={l.lecId}
                      value={String(l.lecId)}
                      title={l.courseName.length > LECTURE_NAME_MAX ? l.courseName : undefined}
                    >
                      {truncateLectureName(l.courseName)}
                      {l.lecSection != null ? ` · ${l.lecSection}반` : ""} · {semLabelOf(l.semYear, l.semTerm)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className={labelClass}>
                    제목 <span className="text-rose-500">*</span>
                  </label>
                  {/* 글자수 카운터 — LEC_ANN_TITLE VARCHAR2(200) (내용 에디터 카운터와 동일 스타일) */}
                  <span className="text-xs text-slate-400">
                    {form.title.length}/{NOTICE_MAX_TITLE}
                  </span>
                </div>
                <input
                  className={`${inputClass} mt-2`}
                  value={form.title}
                  maxLength={NOTICE_MAX_TITLE}
                  placeholder="공지 제목을 입력하세요"
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div>
                <label className={labelClass}>
                  내용 <span className="text-rose-500">*</span>
                </label>
                <div className="mt-2">
                  <ProfessorRichTextEditor
                    value={form.content}
                    onChange={(html) => setForm((p) => ({ ...p, content: html }))}
                    placeholder="공지 내용을 입력하세요."
                    maxLength={NOTICE_MAX_CONTENT}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* 첨부 — 다중(추가 + 기존 개별 제거) */}
              <div>
                <label className={labelClass}>
                  첨부 파일 (선택)
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {attachTotalSize > 0
                      ? `· 합계 ${formatFileSize(attachTotalSize)} / 100MB`
                      : "· 전체 합계 최대 100MB"}
                  </span>
                </label>
                <div className="mt-2">
                  <label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                    파일 선택
                    <input
                      type="file"
                      multiple
                      accept={NOTICE_ACCEPT}
                      className="hidden"
                      onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {(editing?.attachments.length || form.files.length > 0) ? (
                  <ul className="mt-2 space-y-1">
                    {editing?.attachments.map((att) => {
                      const removed = form.removeAttachmentIds.includes(att.attachmentId);
                      return (
                        <li key={att.attachmentId} className="flex items-center gap-2 text-sm">
                          <span
                            className={`min-w-0 flex-1 truncate ${removed ? "text-rose-500 line-through" : "text-slate-600"}`}
                            title={att.fileName}
                          >
                            {att.fileName}
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">{formatFileSize(att.fileSize)}</span>
                          <button
                            type="button"
                            className="shrink-0 text-xs text-slate-400 hover:text-rose-500"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                removeAttachmentIds: removed
                                  ? p.removeAttachmentIds.filter((id) => id !== att.attachmentId)
                                  : [...p.removeAttachmentIds, att.attachmentId],
                              }))
                            }
                          >
                            {removed ? "되돌리기" : "✕ 제거"}
                          </button>
                        </li>
                      );
                    })}
                    {form.files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate text-slate-700" title={f.name}>{f.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">{formatFileSize(f.size)}</span>
                        <button
                          type="button"
                          className="shrink-0 text-xs text-slate-400 hover:text-rose-500"
                          onClick={() => setForm((p) => ({ ...p, files: p.files.filter((_, j) => j !== i) }))}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            {actionError && <p className="mt-3 text-sm font-semibold text-rose-600">{actionError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!requiredOk || saving || (!!editing && !dirty)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? "저장 중…" : editing ? "수정 완료" : "등록"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

// 공지 상세 — 본문 HTML은 sanitizeLmsHtml 정화 후 .lms-content로 렌더(학생 SLM-009와 동일 표시)
function NoticeDetail({
  notice,
  onEdit,
  onDelete,
}: {
  notice: Notice;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const contentHtml = notice.lecAnnContent?.trim() ? sanitizeLmsHtml(notice.lecAnnContent) : "";
  const handleDownload = async (att: NoticeAttachment) => {
    try {
      await downloadNoticeAttachment(att.attachmentId, att.fileName);
    } catch {
      window.alert("파일 다운로드에 실패했습니다.");
    }
  };

  return (
    <article>
      {/* 과목·공지 배지 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          {truncateLectureName(notice.courseName)}
          {notice.lecSection != null ? ` · ${notice.lecSection}반` : ""}
        </span>
        <span className="rounded-md bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-white">
          공지
        </span>
      </div>

      <h3 className="mt-2 break-words text-xl font-bold text-slate-900">{notice.lecAnnTitle}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 pb-4 text-xs text-slate-500">
        <span>👤 {notice.author} 교수</span>
        <span>📅 {notice.lecAnnRegDate}</span>
      </div>

      {/* 본문 */}
      {contentHtml ? (
        <div className="lms-content py-5" dangerouslySetInnerHTML={{ __html: contentHtml }} />
      ) : (
        <p className="py-10 text-center text-sm text-slate-400">작성된 내용이 없습니다.</p>
      )}

      {/* 첨부 */}
      {notice.attachments.length > 0 && (
        <div className="space-y-2">
          {notice.attachments.map((a) => (
            <div
              key={a.attachmentId}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <span className="text-lg">📄</span>
              <span
                className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700"
                title={a.fileName}
              >
                {a.fileName}
              </span>
              <span className="shrink-0 text-xs text-slate-400">{formatFileSize(a.fileSize)}</span>
              <button
                type="button"
                onClick={() => handleDownload(a)}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                ⤓ 다운로드
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 액션 — 수정·삭제 */}
      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          수정
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
        >
          삭제
        </button>
      </div>
    </article>
  );
}
