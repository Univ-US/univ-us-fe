"use client";

// ─────────────────────────────────────────────────────────────
// [폼] PLM-005-01 강의 자료 등록·수정 폼 — ProfessorMaterialUploadDialog(모달) 본문
// - 등록 폼은 상시 노출하지 않음: '새 자료 업로드' 버튼 → 모달로만 표시(2026-06-11 확정)
// - ✅ BE 실연동: 폼이 직접 createUpload/updateUpload 호출(진행률 = axios onUploadProgress),
//   성공 시 onSubmit(저장된 Material) 콜백 → 페이지가 목록 재조회. 실패 시 describeApiError 표기.
// - ⭐ 첨부 다중(2026-06-11 정책: 교체 없음): 여러 파일 선택/드롭 가능, 수정 시 기존 첨부 유지 +
//   새 파일 추가 + 기존 첨부 개별 ✕ 제거(제거 예약 → '수정 완료' 시 적용, 되돌리기 가능)
// - 제출 전 런타임 검증: 제목 필수(trim) / 파일별 확장자·파일명 255·5GB / 신규 파일 합계 5GB(초과 시 alert)
// - 교수 화면 색상 컨벤션(네이비/슬레이트) — 드롭존·포커스 링도 slate 계열
// ─────────────────────────────────────────────────────────────
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ProfessorRichTextEditor from "@/components/lms/ProfessorRichTextEditor";
import {
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXTS,
  UPLOAD_MAX_FILENAME,
  UPLOAD_MAX_SIZE,
  UPLOAD_MAX_TITLE,
  createUpload,
  fileExtOf,
  formatFileSize,
  isVideoExt,
  updateUpload,
  type Attachment,
  type Lecture,
  type Material,
} from "@/lib/lmsProfessorUploadApi";
import { describeApiError } from "@/lib/lmsApiError";
import { truncateLectureName, LECTURE_NAME_MAX } from "@/lib/lmsLectureName";

interface ProfessorMaterialUploadFormProps {
  lectures: Lecture[];
  termMap: Record<string, string>; // SEM_TERM 공통코드 (codeVal→라벨) — 드롭다운 학기 표기
  mode?: "create" | "edit";
  // 수정 모드 초기값 (등록 모드면 미사용)
  initial?: { lecId: number; title: string; content: string };
  initialAttachments?: Attachment[]; // 수정 모드: 기존 첨부 목록 (카드 표시 + 개별 ✕ 제거)
  editUploadId?: number; // 수정 모드 대상 자료 ID
  onSubmit: (saved: Material) => void; // BE 저장 성공 시 호출 (저장된 자료)
  onCancel?: () => void; // 모달 닫기
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30";

// 빈 에디터 문서("<p></p>")는 빈 문자열로 정규화 — BE가 null(CLOB)로 저장
const normalizeContent = (html: string) => (!html || html === "<p></p>" ? "" : html);

export default function ProfessorMaterialUploadForm({
  lectures,
  termMap,
  mode = "create",
  initial,
  initialAttachments = [],
  editUploadId,
  onSubmit,
  onCancel,
}: ProfessorMaterialUploadFormProps) {
  const [lecId, setLecId] = useState<number>(initial?.lecId ?? lectures[0]?.lecId ?? 0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [files, setFiles] = useState<File[]>([]); // 새로 추가할 파일들 (다중)
  const [removedIds, setRemovedIds] = useState<number[]>([]); // 제거 예약된 기존 첨부 ID들
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 파일 선택/드롭 시 즉시 검증 — 파일별(확장자/파일명/5GB) + 신규 파일 합계 5GB
  const pickFiles = (picked: FileList | File[]) => {
    const incoming = Array.from(picked);
    const accepted: File[] = [];
    for (const f of incoming) {
      const ext = fileExtOf(f.name);
      if (!UPLOAD_ALLOWED_EXTS.includes(ext)) {
        setError(
          `'${f.name}' — 허용되지 않는 파일 형식입니다. 영상(MP4·AVI·MOV·WMV)·음성(MP3·M4A·WAV)·문서(PDF·HWP·DOC·PPT·XLS·TXT)·이미지(JPG·PNG·GIF)·ZIP만 업로드할 수 있습니다.`
        );
        return;
      }
      if (f.name.length > UPLOAD_MAX_FILENAME) {
        setError(`'${f.name}' — 파일명이 너무 깁니다(최대 ${UPLOAD_MAX_FILENAME}자).`);
        return;
      }
      if (f.size > UPLOAD_MAX_SIZE) {
        alert(
          `파일 용량 제한을 초과했습니다.\n단일 파일·전체 합계 각각 최대 5GB까지 업로드할 수 있습니다.\n(선택한 파일: ${f.name} · ${formatFileSize(f.size)})`
        );
        setError("파일 용량 제한(단일 파일·전체 합계 각 최대 5GB)을 초과해 업로드할 수 없습니다.");
        return;
      }
      accepted.push(f);
    }
    // 신규 파일 합계 검증 (기존 대기 파일 + 이번 선택분)
    const total = [...files, ...accepted].reduce((sum, f) => sum + f.size, 0);
    if (total > UPLOAD_MAX_SIZE) {
      alert(
        `업로드 파일 전체 합계가 5GB를 초과합니다.\n(현재 합계: ${formatFileSize(total)})`
      );
      setError("업로드 파일 전체 합계는 5GB를 초과할 수 없습니다.");
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...accepted]);
  };

  const removePendingFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetAll = () => {
    setLecId(initial?.lecId ?? lectures[0]?.lecId ?? 0);
    setTitle(initial?.title ?? "");
    setContent(initial?.content ?? "");
    setFiles([]);
    setRemovedIds([]);
    setError(null);
    setProgress(0);
  };

  const handleCancel = () => {
    resetAll();
    onCancel?.();
  };

  const handleUpload = async () => {
    if (uploading) return;
    const t = title.trim();
    if (!t) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (mode === "create" && !lecId) {
      setError("대상 과목(강의)을 선택해 주세요.");
      return;
    }
    // 파일은 선택 사항 — 설명 텍스트만으로도 자료 등록 가능
    const confirmMsg =
      mode === "edit"
        ? "이 내용으로 강의 자료를 수정 업로드하시겠습니까?"
        : "이 내용으로 강의 자료를 업로드하시겠습니까?";
    if (!confirm(confirmMsg)) return;

    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const input = {
        title: t,
        content: normalizeContent(content),
        files,
        removeAttachmentIds: mode === "edit" ? removedIds : undefined,
      };
      const saved =
        mode === "edit"
          ? await updateUpload(editUploadId!, input, setProgress)
          : await createUpload(lecId, input, setProgress);
      onSubmit(saved);
      if (mode === "create") resetAll();
    } catch (err) {
      // 실패를 가짜 성공으로 가리지 않는다 — 서버/검증 에러 그대로 표기
      setError(describeApiError(err));
    } finally {
      setUploading(false);
    }
  };

  // 드롭다운 라벨: 과목명(20자 제한) · N반 · 연도 학기(공통코드 라벨)
  const lectureLabel = (l: Lecture) =>
    `${truncateLectureName(l.courseName)} · ${l.lecSection ?? "-"}반 · ${l.year} ${termMap[l.termCode] ?? l.termCode}`;

  // 업로드 버튼 활성 조건 — 등록: 전부 빈칸이면 비활성 / 수정: 변경(텍스트·추가 파일·제거 예약) 없으면 비활성
  const dirty =
    mode === "edit"
      ? title !== (initial?.title ?? "") ||
        normalizeContent(content) !== normalizeContent(initial?.content ?? "") ||
        files.length > 0 ||
        removedIds.length > 0
      : title.trim() !== "" || normalizeContent(content) !== "" || files.length > 0;

  // 수정 모드: 기존 첨부 (제거 예약 여부에 따라 표시 분기)
  const existingAttachments = mode === "edit" ? initialAttachments : [];

  return (
    <div>
      {/* 대상 과목 + 제목 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">대상 과목</label>
          {/* 수정 모드에서는 대상 과목 변경 불가(disabled) — 등록 모드에서만 선택 */}
          <select
            className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`}
            value={String(lecId)}
            onChange={(e) => setLecId(Number(e.target.value))}
            disabled={uploading || mode === "edit"}
          >
            {lectures.length === 0 ? (
              <option value="0">담당 강의가 없습니다</option>
            ) : (
              lectures.map((l) => (
                <option
                  key={l.lecId}
                  value={String(l.lecId)}
                  title={l.courseName.length > LECTURE_NAME_MAX ? l.courseName : undefined}
                >
                  {lectureLabel(l)}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">제목</label>
          {/* 제목 최대 500자 = DB LEC_UPL_TITLE VARCHAR2(500 CHAR) 한도(BE 동일 기준 검증) */}
          <input
            type="text"
            className={inputClass}
            placeholder="예: Week 8 - 동적 프로그래밍"
            maxLength={UPLOAD_MAX_TITLE}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
          />
          {/* 글자 수 카운터 — 한도 도달 시 강조 (에디터 카운터와 동일 스타일) */}
          <div className="mt-1 flex justify-end">
            <span
              className={`text-[11px] ${
                title.length >= UPLOAD_MAX_TITLE ? "font-semibold text-red-500" : "text-slate-400"
              }`}
            >
              {title.length}/{UPLOAD_MAX_TITLE}
            </span>
          </div>
        </div>
      </div>

      {/* 강의 설명 — Tiptap 리치텍스트 (트라이얼). 값은 HTML 문자열(DB CLOB 저장) */}
      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">강의 설명</label>
        <ProfessorRichTextEditor
          value={content}
          onChange={setContent}
          placeholder="강의 내용 및 학습 목표를 입력하세요."
          disabled={uploading}
          maxLength={4000}
        />
      </div>

      {/* 파일 업로드 드롭존 — 클릭 또는 드래그&드롭, 다중 선택 가능 */}
      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          파일 업로드 <span className="font-normal text-slate-400">(선택 · 여러 개 가능)</span>
        </label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !uploading) inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (uploading) return;
            if (e.dataTransfer.files?.length) pickFiles(e.dataTransfer.files);
          }}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver
              ? "border-slate-500 bg-slate-100"
              : "border-slate-300 bg-slate-50 hover:border-slate-400"
          } ${uploading ? "cursor-not-allowed opacity-70" : ""}`}
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
            📹
          </div>
          <p className="text-sm font-medium text-slate-700">
            영상 또는 파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="mt-1 text-xs text-slate-400">
            영상(MP4·AVI·MOV·WMV) · 음성(MP3·M4A·WAV) · 문서(PDF·HWP·DOC·PPT·XLS·TXT) ·
            이미지(JPG·PNG·GIF) · ZIP — 단일 파일·전체 합계 각 최대 5GB
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={UPLOAD_ACCEPT}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) pickFiles(e.target.files);
              e.target.value = ""; // 같은 파일 재선택 가능하도록 초기화
            }}
          />
        </div>

        {/* 수정 모드: 기존 첨부 카드들 — ✕로 개별 제거 예약(수정 완료 시 적용), 되돌리기 가능 */}
        {existingAttachments.map((att) =>
          removedIds.includes(att.attachmentId) ? (
            <div
              key={att.attachmentId}
              className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3"
            >
              <p className="min-w-0 flex-1 truncate text-xs text-red-600">
                &apos;{att.fileName}&apos; 첨부가 제거됩니다 — &apos;수정 완료&apos; 시 적용
              </p>
              <button
                type="button"
                onClick={() =>
                  setRemovedIds((prev) => prev.filter((id) => id !== att.attachmentId))
                }
                disabled={uploading}
                className="shrink-0 text-xs font-medium text-slate-500 underline hover:text-slate-700 disabled:cursor-not-allowed"
              >
                되돌리기
              </button>
            </div>
          ) : (
            <div
              key={att.attachmentId}
              className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"
            >
              <span className="text-lg">{isVideoExt(att.fileExt ?? "") ? "🎬" : "📄"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{att.fileName}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {att.fileSize == null ? "-" : formatFileSize(att.fileSize)}
              </span>
              <button
                type="button"
                aria-label={`${att.fileName} 제거`}
                onClick={() => setRemovedIds((prev) => [...prev, att.attachmentId])}
                disabled={uploading}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:cursor-not-allowed"
              >
                ✕
              </button>
            </div>
          )
        )}

        {/* 새로 추가할 파일 카드들 */}
        {files.map((f, idx) => (
          <div
            key={`${f.name}-${idx}`}
            className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"
          >
            <span className="text-lg">{isVideoExt(fileExtOf(f.name)) ? "🎬" : "📄"}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{f.name}</p>
              <p className="text-xs text-slate-500">
                {uploading ? `업로드 중… ${progress}%` : mode === "edit" ? "추가될 파일" : "업로드 대기"}
              </p>
            </div>
            <span className="shrink-0 text-xs text-slate-400">{formatFileSize(f.size)}</span>
            {!uploading && (
              <button
                type="button"
                aria-label={`${f.name} 제거`}
                onClick={() => removePendingFile(idx)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {/* 업로드 진행률 (요청 단위 — 전체 파일 합산 진행률) */}
        {uploading && files.length > 0 && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-700 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* 검증/서버 에러 */}
      {error && (
        <p className="mt-3 break-words rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {/* 액션 */}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={uploading}>
          취소
        </Button>
        <Button
          onClick={handleUpload}
          disabled={uploading || !dirty}
          className="bg-slate-800 text-white hover:bg-slate-700"
        >
          {/* 완료 버튼명: 등록='업로드' / 수정='수정 완료' */}
          {uploading ? "업로드 중…" : mode === "edit" ? "수정 완료" : "⤓ 업로드"}
        </Button>
      </div>
    </div>
  );
}
