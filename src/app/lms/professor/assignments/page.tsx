"use client";

// PLM-006 교수 과제 관리 — 과제 등록·수정·삭제 + 과목별 제출/채점 현황 (상세 채점은 PLM-004 채점 현황)
// ✅ BE 실연동 + 서버 페이지네이션(2026-06-13). 구성 = 수강생 현황(PLM-003)과 동일 패턴:
//   상단 년도/학기(기본 둘 다 '전체') + 과목 드롭다운(첫 과목 자동 선택) → 선택한 '한 과목'의 과제만 표시.
//   → 과목이 페이지 경계에서 쪼개지는 문제가 없음(한 번에 한 과목).
// - 마운트: 담당 강의(GET /assignments/lectures) 로드 → 첫 과목 선택
// - 목록: GET /assignments?lecId=&page=&size= (선택 과목 1개분, 서버 페이지네이션)
// - 년도/학기: 담당 강의를 클라에서 좁힘(과목 드롭다운 옵션) + 첫 과목 자동 선택
// - 등록 폼: 대상 과목(현재 과목 프리필)·마감 일시·과제명 필수 / 만점(100 고정)·설명·첨부(다중) 선택
// - 수정: 행 '수정' → 폼 프리필(과목은 변경 불가) + dirty 가드 / 삭제: confirm 경유
// - ⚠️ 실패 시 가짜 데이터로 가리지 않고 에러 상태 표기 + 재시도(grading 패턴)
import { useCallback, useEffect, useMemo, useState } from "react";
import useEscapeClose from "@/components/lms/useEscapeClose";
import ProfessorRichTextEditor from "@/components/lms/ProfessorRichTextEditor";
import { htmlToPlainText } from "@/lib/lmsSanitize";
import { truncateLectureName, LECTURE_NAME_MAX } from "@/lib/lmsLectureName";
import {
  ASSIGNMENT_ACCEPT,
  ASSIGNMENT_ALLOWED_EXTS,
  ASSIGNMENT_MAX_DESC,
  ASSIGNMENT_MAX_FILENAME,
  ASSIGNMENT_MAX_TITLE,
  createAssignment,
  deleteAssignment,
  fileExtOf,
  getAssignmentLectures,
  getCourseAssignments,
  updateAssignment,
} from "@/lib/lmsProfessorAssignmentsApi";
import type { Assignment, AssignmentLecture } from "@/types/lmsProfessorAssignments";
import { getCommonCodeMap } from "@/lib/lmsProfessorStudentsApi";
import { getCommonCodeList } from "@/lib/lmsCommonCode";

const selectClass =
  "h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
const labelClass = "text-sm font-semibold text-slate-700";

// 서버 페이지네이션 size — 선택 과목 과제 목록(타 화면과 통일 10건)
const PAGE_SIZE = 10;

/** "YYYY-MM-DDTHH:mm" → "YYYY.MM.DD HH:mm" (표시용) */
const formatDue = (v: string) => {
  const [d, t] = v.split("T");
  return d && t ? `${d.replaceAll("-", ".")} ${t}` : v;
};

/** 빈 에디터 문서("<p></p>")는 ""로 정규화 — BE가 null 저장 (PLM-005 관례) */
const normalizeHtml = (html: string) => (html === "<p></p>" ? "" : html);

const statusBadgeClass = (valStatus: string) => {
  if (valStatus === "AVL") return "bg-emerald-50 text-emerald-700";
  if (valStatus === "CLS" || valStatus === "NOP") return "bg-slate-100 text-slate-500";
  return "bg-amber-50 text-amber-700"; // MOD/LAT 등
};

// 선택된 (년도, 학기) 조합에 매칭되는 담당 강의들. 둘 다 'all'이면 전 강의 (PLM-003 동일).
const matchLectures = (
  year: number | "all",
  term: string | "all",
  lecs: AssignmentLecture[]
): AssignmentLecture[] =>
  lecs.filter(
    (l) => (year === "all" || l.semYear === year) && (term === "all" || l.semTerm === term)
  );

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
  // 드롭다운/구조 (PLM-003 패턴)
  const [lectures, setLectures] = useState<AssignmentLecture[]>([]); // 담당 강의 전체(년도/학기 필터는 클라)
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [selectedLecId, setSelectedLecId] = useState<number | null>(null);

  // 공통코드 라벨 맵 (PLM-003/004/005 패턴) — SEM_TERM 학기 · LEC_ASN_VAL_STATUS 과제 상태. 실패 시 {}(원본 코드 표시).
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [termOrder, setTermOrder] = useState<string[]>([]); // SEM_TERM 정렬 순서(DB CODE_ORDER) — 학기 드롭다운 정렬용
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const semLabelOf = (year: number, termCode: string) =>
    `${year}년 ${termMap[termCode] ?? termCode}`;

  // 선택 과목의 과제(서버 페이지)
  const [content, setContent] = useState<Assignment[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0); // 0-based

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 등록/수정/삭제 후 같은 lecId/page라도 강제 재조회하는 틱
  const [reloadTick, setReloadTick] = useState(0);

  const [formOpen, setFormOpen] = useState(false); // 등록/수정 모달 열림
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // 구조 로드(마운트): 담당 강의 → 첫 과목 선택 (PLM-003 동일)
  useEffect(() => {
    (async () => {
      try {
        const lecs = await getAssignmentLectures();
        setLectures(lecs);
        // 딥링크(강의 내역 PLM-002 '과제 관리'): ?lecId= 가 담당 강의에 있으면 그 강의, 없으면 첫 과목
        const all = matchLectures("all", "all", lecs);
        const requested = new URLSearchParams(window.location.search).get("lecId");
        const requestedId = requested ? Number(requested) : null;
        const lecId =
          requestedId != null && all.some((l) => l.lecId === requestedId)
            ? requestedId
            : all[0]?.lecId ?? null;
        setSelectedLecId(lecId);
        if (lecId == null) {
          // 담당 강의 없음 → 빈 상태(아래 목록 effect는 lecId null이면 미실행)
          setContent([]);
          setTotalElements(0);
          setTotalPages(1);
          setLoading(false);
        }
      } catch {
        // 가짜 데이터로 가리지 않고 에러 상태 표기
        setError("과제 목록을 불러오지 못했습니다.");
        setLoading(false);
      }
    })();
  }, []);

  // 공통코드 로드 (SEM_TERM · LEC_ASN_VAL_STATUS) — 실패해도 빈 값이라 화면은 동작(원본 코드 표시)
  // SEM_TERM은 list 1회로 정렬(termOrder=CODE_ORDER)·라벨맵(termMap) 둘 다 도출(단일 소스).
  useEffect(() => {
    (async () => {
      const [termList, s] = await Promise.all([
        getCommonCodeList("SEM_TERM"),
        getCommonCodeMap("LEC_ASN_VAL_STATUS"),
      ]);
      setTermOrder(termList.map((c) => c.codeVal));
      setTermMap(Object.fromEntries(termList.map((c) => [c.codeVal, c.codeName])));
      setStatusMap(s);
    })();
  }, []);

  // 목록 조회: 과목/페이지/재조회틱 변경 시 서버 재조회
  useEffect(() => {
    if (selectedLecId == null) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getCourseAssignments({ lecId: selectedLecId, page, size: PAGE_SIZE });
        if (cancelled) return;
        setContent(res.content);
        setTotalElements(res.totalElements);
        setTotalPages(Math.max(1, res.totalPages));
        // 삭제 등으로 현재 page가 범위를 벗어났으면 마지막 페이지로 보정
        if (res.totalPages > 0 && page > res.totalPages - 1) setPage(res.totalPages - 1);
      } catch {
        if (!cancelled) {
          setError("과제 목록을 불러오지 못했습니다.");
          setContent([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedLecId, page, reloadTick]);

  // 년도/학기 변경 → 강의 목록 클라 필터 + 첫 과목 선택 (페이지 0). 각 축 독립. (PLM-003 동일)
  const applyLectureFilter = (year: number | "all", term: string | "all") => {
    setPage(0);
    const matched = matchLectures(year, term, lectures);
    const lecId = matched[0]?.lecId ?? null;
    setSelectedLecId(lecId);
    if (lecId == null) {
      setContent([]);
      setTotalElements(0);
      setTotalPages(1);
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
  const handleLectureChange = (lecId: number) => {
    setSelectedLecId(lecId);
    setPage(0);
  };

  // 다시 시도 — 담당 강의 재로드(현재 선택 유지) 후 목록 재조회
  const retry = async () => {
    setError(null);
    setLoading(true);
    try {
      const lecs = await getAssignmentLectures();
      setLectures(lecs);
      const matched = matchLectures(yearFilter, termFilter, lecs);
      const keep = selectedLecId != null && matched.some((l) => l.lecId === selectedLecId);
      const lecId = keep ? selectedLecId : matched[0]?.lecId ?? null;
      setSelectedLecId(lecId);
      if (lecId == null) {
        setContent([]);
        setTotalElements(0);
        setTotalPages(1);
        setLoading(false);
      } else {
        setReloadTick((t) => t + 1); // 목록 effect 강제 재조회
      }
    } catch {
      setError("과제 목록을 불러오지 못했습니다.");
      setLoading(false);
    }
  };

  // 년도/학기 필터링된 강의(과목 드롭다운) + 옵션(담당 강의에서 유도)
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

  // ── 폼 검증 (만점은 100 고정 — 입력 없음) ──
  const requiredOk = form.lecId !== "" && form.title.trim() !== "" && form.dueDate !== "";

  // 수정 시 변경 없음이면 비활성 (dirty 가드 — PLM-005 관례)
  const dirty = useMemo(() => {
    if (!editing) return true;
    return (
      form.title !== editing.lecAsnTitle ||
      normalizeHtml(form.description) !== normalizeHtml(editing.lecAsnContent ?? "") ||
      form.dueDate !== editing.lecAsnDueDate ||
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

  // 등록 — 현재 보고 있는 과목을 기본 선택(다른 과목으로 변경 가능)
  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, lecId: selectedLecId ?? "" });
    setActionError(null);
    setFormOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setEditing(a);
    setForm({
      lecId: a.lecId,
      title: a.lecAsnTitle,
      description: a.lecAsnContent ?? "",
      dueDate: a.lecAsnDueDate,
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
    const wasEdit = editing != null;
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
        const created = await createAssignment(input);
        // 등록한 과제의 과목으로 전환(다른 과목에 등록했어도 보이게) — 현재 필터에 없으면 필터 해제
        const inFilter = matchLectures(yearFilter, termFilter, lectures).some((l) => l.lecId === created.lecId);
        if (!inFilter) {
          setYearFilter("all");
          setTermFilter("all");
        }
        setSelectedLecId(created.lecId);
        setPage(0);
      }
      closeForm();
      setReloadTick((t) => t + 1); // 현재 과목 페이지 재조회
    } catch {
      setActionError(wasEdit ? "과제 수정에 실패했습니다." : "과제 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Assignment) => {
    const warn =
      a.submittedCount > 0
        ? `'${a.lecAsnTitle}' 과제에 제출물 ${a.submittedCount}건이 있습니다. 정말 삭제할까요?`
        : `'${a.lecAsnTitle}' 과제를 삭제할까요?`;
    if (!window.confirm(warn)) return;
    setActionError(null);
    try {
      await deleteAssignment(a.assignmentId);
      if (editing?.assignmentId === a.assignmentId) closeForm();
      setReloadTick((t) => t + 1); // 현재 과목 재조회(마지막 1건 삭제 시 페이지 보정)
    } catch {
      setActionError("과제 삭제에 실패했습니다.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 — 좌: 제목+선택 과목·건수 / 우: 년도·학기·과목 드롭다운 + 과제 등록 (PLM-003 레이아웃) */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900">과제 관리</h1>
            <p
              className="flex items-center gap-1 text-sm text-slate-500"
              title={selectedLecture?.courseName ?? undefined}
            >
              <span className="min-w-0 truncate">{selectedLecture?.courseName ?? "과목 선택"}</span>
              <span className="shrink-0">· 등록 과제 {totalElements}건</span>
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* 년도·학기 분리 필터 — 기본값 둘 다 '전체'(전 화면 공통 규칙) */}
            <select
              value={yearFilter === "all" ? "" : String(yearFilter)}
              onChange={(e) => handleYearChange(e.target.value === "" ? "all" : Number(e.target.value))}
              disabled={loading && lectures.length === 0}
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
              disabled={loading && lectures.length === 0}
              className={`${selectClass} w-32`}
            >
              <option value="">전체 학기</option>
              {termOptions.map((t) => (
                <option key={t} value={t}>
                  {termMap[t] ?? t}
                </option>
              ))}
            </select>
            {/* 과목 드롭다운 — 년도/학기로 좁힌 담당 강의, 첫 과목 자동 선택 */}
            <select
              value={selectedLecId ?? ""}
              onChange={(e) => handleLectureChange(Number(e.target.value))}
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
            {/* 과제 등록 — 폼은 모달로 (필터 오른쪽 배치) */}
            <button
              type="button"
              onClick={openCreate}
              disabled={!!error || selectedLecId == null}
              className="h-9 shrink-0 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              + 과제 등록
            </button>
          </div>
        </header>

        {/* 등록/수정/삭제 등 액션 에러 */}
        {actionError && (
          <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
            {actionError}
          </p>
        )}

        {/* 과제 등록/수정 모달 — '+ 과제 등록' 버튼/행 '수정'으로 열림.
            ESC=✕와 동일(LMS 모달 관례), 백드롭 클릭 닫기는 입력 유실 방지를 위해 미적용 */}
        {formOpen && (
          // pl-64(사이드바 w-60 + 여백 1rem)·pr-4 비대칭 패딩 → 백드롭은 전체 덮되 다이얼로그는 콘텐츠 영역 기준 가운데
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pl-64 pr-4">
            <section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="min-w-0 truncate text-base font-bold text-slate-800">
                  {editing ? `과제 수정 — ${editing.lecAsnTitle}` : "과제 등록"}
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
                  <ProfessorRichTextEditor
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
                          <span
                            className={`min-w-0 flex-1 truncate ${removed ? "text-rose-500 line-through" : "text-slate-600"}`}
                            title={att.fileName}
                          >
                            {att.fileName}
                          </span>
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
                        <span className="min-w-0 flex-1 truncate text-emerald-700" title={f.name}>{f.name}</span>
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

        {/* 본문 — 선택 과목의 과제 목록 (단일 테이블 + 페이저) */}
        {error ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              다시 시도
            </button>
          </section>
        ) : loading ? (
          <p className="py-10 text-center text-sm text-slate-400">불러오는 중…</p>
        ) : selectedLecId == null ? (
          <p className="py-10 text-center text-sm text-slate-400">담당 강의가 없습니다.</p>
        ) : totalElements === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">이 과목에 등록된 과제가 없습니다.</p>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                {content.map((a) => (
                  <tr key={a.assignmentId} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      {/* 제목·설명 모두 1줄 말줄임(컬럼 폭 기준 자동 '...') — 원문은 hover 툴팁.
                          첨부 배지는 truncate 영역 밖(shrink-0)에 둬 긴 설명에 밀려 사라지지 않게 함 */}
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 truncate font-semibold text-slate-800" title={a.lecAsnTitle}>
                          {a.lecAsnTitle}
                        </p>
                        {a.attachments.length > 0 && (
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">
                            첨부 {a.attachments.length}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const descText = a.lecAsnContent ? htmlToPlainText(a.lecAsnContent) : "";
                        return (
                          <p className="truncate text-xs text-slate-400" title={descText || undefined}>
                            {descText || "—"}
                          </p>
                        );
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                      {formatDue(a.lecAsnDueDate)}
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
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(a.lecAsnValStatus)}`}>
                        {statusMap[a.lecAsnValStatus] ?? a.lecAsnValStatus}
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
            {/* 페이지네이션 — 가운데 정렬·항상 표시 */}
            <Pager page={page} totalPages={totalPages} onPage={setPage} />
          </section>
        )}
      </div>
    </main>
  );
}

// 페이지네이션 (PLM-005와 동일 구조, PLM-006 emerald 톤). 0건/1페이지여도 상시 표시.
function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number; // 0-based
  totalPages: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 border-t border-slate-100 py-2">
      <PageBtn label="‹" disabled={page === 0} onClick={() => onPage(page - 1)} />
      {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
        <PageBtn key={p} label={String(p + 1)} active={p === page} onClick={() => onPage(p)} />
      ))}
      <PageBtn label="›" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)} />
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
        active ? "bg-emerald-700 font-semibold text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}
