"use client";

// PLM-006 교수 과제 관리 — 과제 등록·수정·삭제 + 과목별 제출/채점 현황 (상세 채점은 PLM-004 채점 현황)
// ⚠️ mock 단계: lib/lmsProfessorAssignmentsApi.ts 가 mock 데이터로 동작 — BE 연동 시 lib만 교체, 이 페이지는 유지
// - 학기 필터(기본 '전체 학기') → 과목별 카드로 그룹 표시
// - 등록 폼: 대상 과목·마감 일시·과제명 필수 / 만점(기본 100)·설명·첨부(다중) 선택
// - 수정: 행 '수정' → 폼 프리필(과목은 변경 불가) + dirty 가드 / 삭제: confirm 경유
import { useCallback, useEffect, useMemo, useState } from "react";
import useEscapeClose from "@/components/lms/useEscapeClose";
import LmsRichTextEditor from "@/components/lms/LmsRichTextEditor";
import { htmlToPlainText } from "@/lib/lmsSanitize";
import { truncateLectureName, LECTURE_NAME_MAX } from "@/lib/lmsLectureName";
import {
  ASN_STATUS_LABEL,
  ASSIGNMENT_ACCEPT,
  ASSIGNMENT_ALLOWED_EXTS,
  ASSIGNMENT_MAX_DESC,
  ASSIGNMENT_MAX_FILENAME,
  ASSIGNMENT_MAX_TITLE,
  TERM_LABEL,
  createAssignment,
  deleteAssignment,
  fileExtOf,
  getAssignmentLectures,
  getAssignments,
  updateAssignment,
  type Assignment,
  type AssignmentLecture,
} from "@/lib/lmsProfessorAssignmentsApi";

const selectClass =
  "h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100";
const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
const labelClass = "text-sm font-semibold text-slate-700";

const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];

const PAGE_SIZE = 5; // 과제 목록 페이지당 행 수 (사용자 지정 — 타 화면 10건과 다름)

/** "YYYY-MM-DDTHH:mm" → "YYYY.MM.DD HH:mm" (표시용) */
const formatDue = (v: string) => {
  const [d, t] = v.split("T");
  return d && t ? `${d.replaceAll("-", ".")} ${t}` : v;
};

const semLabelOf = (year: number, termCode: string) =>
  `${year}년 ${TERM_LABEL[termCode] ?? termCode}`;

/** 빈 에디터 문서("<p></p>")는 ""로 정규화 — BE가 null 저장 (PLM-005 관례) */
const normalizeHtml = (html: string) => (html === "<p></p>" ? "" : html);

const statusBadgeClass = (valStatus: string) => {
  if (valStatus === "AVL") return "bg-emerald-50 text-emerald-700";
  if (valStatus === "CLS" || valStatus === "NOP") return "bg-slate-100 text-slate-500";
  return "bg-amber-50 text-amber-700"; // MOD/LAT 등
};

interface FormState {
  lecId: number | "";
  title: string;
  description: string;
  dueDate: string;
  files: File[];
  removeAttachmentIds: number[];
}

const EMPTY_FORM: FormState = {
  lecId: "",
  title: "",
  description: "",
  dueDate: "",
  files: [],
  removeAttachmentIds: [],
};

export default function ProfessorAssignmentsPage() {
  const [lectures, setLectures] = useState<AssignmentLecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 년도·학기 분리 필터 (PLM-005 목록 필터 패턴 — AND 조합, 기본 '전체')
  const [yearFilter, setYearFilter] = useState<string>("all"); // "all" | "2026"
  const [termFilter, setTermFilter] = useState<string>("all"); // "all" | "SM1"…

  // 과목 카드별 현재 페이지(1부터) — 필터 변경 시 전체 리셋, 건수 감소 시 렌더에서 마지막 페이지로 클램프
  const [pages, setPages] = useState<Record<number, number>>({});
  const setCardPage = (lecId: number, p: number) => setPages((prev) => ({ ...prev, [lecId]: p }));
  useEffect(() => {
    setPages({});
  }, [yearFilter, termFilter]);

  const [formOpen, setFormOpen] = useState(false); // 등록/수정 모달 열림
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lecs, asns] = await Promise.all([getAssignmentLectures(), getAssignments()]);
      setLectures(lecs);
      setAssignments(asns);
    } catch {
      // 가짜 데이터로 가리지 않고 에러 상태 표기 (grading 패턴)
      setError("과제 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── 필터 옵션: 보유 과제에서 유도 (년도 내림차순 / 학기 TERM_ORDER 순) ──
  const yearOptions = useMemo(
    () => [...new Set(assignments.map((a) => a.year))].sort((x, y) => y - x),
    [assignments]
  );
  const termOptions = useMemo(
    () =>
      [...new Set(assignments.map((a) => a.termCode))].sort(
        (x, y) => TERM_ORDER.indexOf(x) - TERM_ORDER.indexOf(y)
      ),
    [assignments]
  );

  const filtered = useMemo(
    () =>
      assignments.filter(
        (a) =>
          (yearFilter === "all" || String(a.year) === yearFilter) &&
          (termFilter === "all" || a.termCode === termFilter)
      ),
    [assignments, yearFilter, termFilter]
  );

  // ── 과목별 그룹 (최신 학기 우선 → 과목명) ──
  const grouped = useMemo(() => {
    const map = new Map<number, Assignment[]>();
    filtered.forEach((a) => {
      const rows = map.get(a.lecId) ?? [];
      rows.push(a);
      map.set(a.lecId, rows);
    });
    return [...map.values()]
      .map((rows) => ({
        head: rows[0],
        rows: [...rows].sort((x, y) => y.dueDate.localeCompare(x.dueDate)),
      }))
      .sort(
        (x, y) =>
          y.head.year - x.head.year ||
          TERM_ORDER.indexOf(x.head.termCode) - TERM_ORDER.indexOf(y.head.termCode) ||
          x.head.courseName.localeCompare(y.head.courseName, "ko")
      );
  }, [filtered]);

  // ── 폼 검증 (만점은 100 고정 — 입력 없음) ──
  const requiredOk = form.lecId !== "" && form.title.trim() !== "" && form.dueDate !== "";

  // 수정 시 변경 없음이면 비활성 (dirty 가드 — PLM-005 관례)
  const dirty = useMemo(() => {
    if (!editing) return true;
    return (
      form.title !== editing.title ||
      normalizeHtml(form.description) !== normalizeHtml(editing.description ?? "") ||
      form.dueDate !== editing.dueDate ||
      form.files.length > 0 ||
      form.removeAttachmentIds.length > 0
    );
  }, [editing, form]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setActionError(null);
  }, []);

  // ESC = ✕/취소와 동일 처리 (LMS 모달 관례 — 저장 중엔 무시)
  useEscapeClose(formOpen && !saving, closeForm);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setActionError(null);
    setFormOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setEditing(a);
    setForm({
      lecId: a.lecId,
      title: a.title,
      description: a.description ?? "",
      dueDate: a.dueDate,
      files: [],
      removeAttachmentIds: [],
    });
    setActionError(null);
    setFormOpen(true);
  };

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next: File[] = [];
    for (const f of Array.from(list)) {
      const ext = fileExtOf(f.name);
      if (!ASSIGNMENT_ALLOWED_EXTS.includes(ext)) {
        window.alert(`허용되지 않는 파일 형식입니다: ${f.name}`);
        continue;
      }
      if (f.name.length > ASSIGNMENT_MAX_FILENAME) {
        window.alert(`파일명이 너무 깁니다(최대 ${ASSIGNMENT_MAX_FILENAME}자): ${f.name}`);
        continue;
      }
      next.push(f);
    }
    if (next.length > 0) setForm((p) => ({ ...p, files: [...p.files, ...next] }));
  };

  const handleSubmit = async () => {
    if (!requiredOk || saving || (editing && !dirty)) return;
    setSaving(true);
    setActionError(null);
    try {
      const input = {
        lecId: Number(form.lecId),
        title: form.title.trim(),
        description: normalizeHtml(form.description),
        dueDate: form.dueDate,
        files: form.files,
        removeAttachmentIds: form.removeAttachmentIds,
      };
      if (editing) {
        await updateAssignment(editing.assignmentId, input);
      } else {
        await createAssignment(input);
      }
      closeForm();
      await load();
    } catch {
      setActionError(editing ? "과제 수정에 실패했습니다." : "과제 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Assignment) => {
    const warn =
      a.submittedCount > 0
        ? `'${a.title}' 과제에 제출물 ${a.submittedCount}건이 있습니다. 정말 삭제할까요?`
        : `'${a.title}' 과제를 삭제할까요?`;
    if (!window.confirm(warn)) return;
    setActionError(null);
    try {
      await deleteAssignment(a.assignmentId);
      if (editing?.assignmentId === a.assignmentId) closeForm();
      await load();
    } catch {
      setActionError("과제 삭제에 실패했습니다.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">과제 관리</h1>
            {/* 년도·학기 표기는 필터 드롭다운으로 충분 — 부제는 건수만 (사용자 지시) */}
            <p className="text-sm text-slate-500">등록 과제 {filtered.length}건</p>
          </div>
          {/* 년도·학기 분리 필터 — 본인 과제 보유분에서 옵션 유도, 기본 '전체'·'전체' (PLM-005 패턴) */}
          <div className="flex gap-2">
            <select
              className={selectClass}
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              disabled={loading}
            >
              <option value="all">전체 년도</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              disabled={loading}
            >
              <option value="all">전체 학기</option>
              {termOptions.map((t) => (
                <option key={t} value={t}>
                  {TERM_LABEL[t] ?? t}
                </option>
              ))}
            </select>
            {/* 과제 등록 — 폼은 모달로 (필터 오른쪽 배치) */}
            <button
              type="button"
              onClick={openCreate}
              disabled={loading || !!error}
              className="h-9 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              + 과제 등록
            </button>
          </div>
        </header>

        {error ? (
          // 개요 로드 실패 — 가짜 데이터로 가리지 않고 에러 표기 + 재시도 (grading 패턴)
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              다시 시도
            </button>
          </section>
        ) : (
          <>
            {/* 과제 등록/수정 모달 — '+ 과제 등록' 버튼/행 '수정'으로 열림.
                ESC=✕와 동일(LMS 모달 관례), 백드롭 클릭 닫기는 입력 유실 방지를 위해 미적용 */}
            {formOpen && (
            // pl-64(사이드바 w-60 + 여백 1rem)·pr-4 비대칭 패딩 → 백드롭은 전체 덮되 다이얼로그는 콘텐츠 영역 기준 가운데
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pl-64 pr-4">
            <section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">
                  {editing ? `과제 수정 — ${editing.title}` : "과제 등록"}
                </h2>
                <div className="flex items-center gap-3">
                  {editing && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      수정 중
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    aria-label="닫기"
                    className="text-lg leading-none text-slate-400 hover:text-slate-600 disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    대상 과목 <span className="text-rose-500">*</span>
                  </label>
                  {/* 수정 시 과목 변경 불가(소속 데이터가 달라지므로) — 신규 등록에서만 선택 */}
                  <select
                    className={`${selectClass} mt-2 h-10 w-full`}
                    value={form.lecId === "" ? "" : String(form.lecId)}
                    onChange={(e) => setForm((p) => ({ ...p, lecId: e.target.value === "" ? "" : Number(e.target.value) }))}
                    disabled={loading || !!editing}
                  >
                    <option value="">과목을 선택하세요</option>
                    {lectures.map((l) => (
                      <option
                        key={l.lecId}
                        value={String(l.lecId)}
                        title={l.courseName.length > LECTURE_NAME_MAX ? l.courseName : undefined}
                      >
                        {truncateLectureName(l.courseName)}
                        {l.lecSection != null ? ` · ${l.lecSection}반` : ""} · {semLabelOf(l.year, l.termCode)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    마감 일시 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    className={`${inputClass} mt-2`}
                    value={form.dueDate}
                    onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    과제명 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={`${inputClass} mt-2`}
                    value={form.title}
                    maxLength={ASSIGNMENT_MAX_TITLE}
                    placeholder="예: Week 8 - 동적 프로그래밍 구현 과제"
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClass}>과제 설명</label>
                {/* Tiptap 에디터 (PLM-005와 동일 공용 컴포넌트) — HTML 저장, 텍스트 4000자 제한 */}
                <div className="mt-2">
                  <LmsRichTextEditor
                    value={form.description}
                    onChange={(html) => setForm((p) => ({ ...p, description: html }))}
                    placeholder="과제 내용, 제출 형식, 유의사항을 상세히 작성하세요."
                    maxLength={ASSIGNMENT_MAX_DESC}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* 첨부 — 다중(PLM-005 정책: 수정은 추가 + 기존 개별 제거) */}
              <div className="mt-4">
                <label className={labelClass}>첨부 파일 (선택)</label>
                {/* 네이티브 input은 숨김 — 브라우저 기본 "선택된 파일 없음" 문구 제거, 선택 파일은 아래 칩으로 표시 */}
                <div className="mt-2">
                  <label className="inline-flex cursor-pointer items-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                    파일 선택
                    <input
                      type="file"
                      multiple
                      accept={ASSIGNMENT_ACCEPT}
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
                          <span className={removed ? "text-rose-500 line-through" : "text-slate-600"}>
                            {att.fileName}
                          </span>
                          <button
                            type="button"
                            className="text-xs text-slate-400 hover:text-rose-500"
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
                        <span className="text-emerald-700">{f.name}</span>
                        <button
                          type="button"
                          className="text-xs text-slate-400 hover:text-rose-500"
                          onClick={() => setForm((p) => ({ ...p, files: p.files.filter((_, j) => j !== i) }))}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
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
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {saving ? "저장 중…" : editing ? "수정 완료" : "과제 등록"}
                </button>
              </div>
            </section>
            </div>
            )}

            {/* 과목별 과제 카드 */}
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-400">불러오는 중…</p>
            ) : grouped.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                {yearFilter === "all" && termFilter === "all"
                  ? "등록된 과제가 없습니다."
                  : "선택한 년도·학기에 해당하는 과제가 없습니다."}
              </p>
            ) : (
              grouped.map(({ head, rows }) => {
                // 카드별 페이지네이션 — 5건/페이지, 1페이지 시작 (삭제 등으로 건수 줄면 마지막 페이지로 보정)
                const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
                const page = Math.min(pages[head.lecId] ?? 1, totalPages);
                const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                return (
                <section key={head.lecId} className="mb-6">
                  <div className="mb-2 flex items-end justify-between gap-2">
                    {/* 강의명만 CSS 폭 기준 말줄임, '· N반 학기'는 유지 */}
                    <h3 className="flex min-w-0 items-baseline gap-1 text-sm font-bold text-slate-700">
                      <span className="min-w-0 truncate" title={head.courseName}>{head.courseName}</span>
                      <span className="shrink-0 font-bold">
                        {head.lecSection != null ? `· ${head.lecSection}반` : ""}
                      </span>
                      <span className="shrink-0 font-medium text-slate-400">{semLabelOf(head.year, head.termCode)}</span>
                    </h3>
                    <span className="shrink-0 text-xs text-slate-400">{rows.length}건</span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* table-fixed — 내용 길이와 무관하게 컬럼 폭 고정(과제명만 남은 폭 사용, 긴 제목은 truncate) */}
                    <table className="w-full table-fixed text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                          <th className="px-4 py-2.5 font-medium">과제명</th>
                          <th className="w-40 px-4 py-2.5 font-medium">마감 일시</th>
                          <th className="w-28 px-4 py-2.5 font-medium">제출 현황</th>
                          <th className="w-28 px-4 py-2.5 font-medium">채점</th>
                          <th className="w-24 px-4 py-2.5 font-medium">상태</th>
                          <th className="w-24 px-4 py-2.5 text-right font-medium">관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((a) => (
                          <tr key={a.assignmentId} className="border-b border-slate-50 last:border-0">
                            <td className="px-4 py-3">
                              {/* 제목·설명 모두 1줄 말줄임(컬럼 폭 기준 자동 '...') — 원문은 hover 툴팁.
                                  첨부 배지는 truncate 영역 밖(shrink-0)에 둬 긴 설명에 밀려 사라지지 않게 함 */}
                              <div className="flex items-center gap-2">
                                <p className="min-w-0 truncate font-semibold text-slate-800" title={a.title}>
                                  {a.title}
                                </p>
                                {a.attachments.length > 0 && (
                                  <span className="shrink-0 rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">
                                    첨부 {a.attachments.length}
                                  </span>
                                )}
                              </div>
                              {(() => {
                                const descText = a.description ? htmlToPlainText(a.description) : "";
                                return (
                                  <p className="truncate text-xs text-slate-400" title={descText || undefined}>
                                    {descText || "—"}
                                  </p>
                                );
                              })()}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                              {formatDue(a.dueDate)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  a.totalStudents > 0 && a.submittedCount >= a.totalStudents
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {a.submittedCount} / {a.totalStudents}명
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {a.ungradedCount > 0 ? (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                                  미채점 {a.ungradedCount}
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  채점완료
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(a.valStatus)}`}>
                                {ASN_STATUS_LABEL[a.valStatus] ?? a.valStatus}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openEdit(a)}
                                className="text-xs font-semibold text-slate-500 hover:text-emerald-700"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(a)}
                                className="ml-3 text-xs font-semibold text-slate-500 hover:text-rose-600"
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* 페이지네이션 — 가운데 정렬·항상 표시 (어드민 강의 관리 관례) */}
                    <div className="flex items-center justify-center gap-1 border-t border-slate-100 py-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setCardPage(head.lecId, page - 1)}
                        className="h-7 w-7 rounded text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCardPage(head.lecId, n)}
                          className={`h-7 min-w-7 rounded px-1 text-sm ${
                            n === page
                              ? "bg-emerald-700 font-semibold text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setCardPage(head.lecId, page + 1)}
                        className="h-7 w-7 rounded text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </section>
                );
              })
            )}
          </>
        )}
      </div>
    </main>
  );
}
