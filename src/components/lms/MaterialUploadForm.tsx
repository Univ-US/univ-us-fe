"use client";

// ─────────────────────────────────────────────────────────────
// [폼] PLM-005-01 강의 자료 등록·수정 폼 — MaterialUploadDialog(모달) 본문
// - 등록 폼은 상시 노출하지 않음: '새 자료 업로드' 버튼 → 모달로만 표시(2026-06-11 확정)
// - ⚠️ mock 단계: '업로드'는 simulateUpload 진행률 표시 후 onSubmit 콜백(BE 명세 후 실연결)
// - 제출 전 런타임 검증: 제목 필수(trim) / 파일 필수(등록 모드) / 확장자 화이트리스트 / 5GB 한도
// - 교수 화면 색상 컨벤션(네이비/슬레이트) — 드롭존·포커스 링도 slate 계열
// ─────────────────────────────────────────────────────────────
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import LmsRichTextEditor from "@/components/lms/LmsRichTextEditor";
import {
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXTS,
  UPLOAD_MAX_FILENAME,
  UPLOAD_MAX_SIZE,
  fileExtOf,
  formatFileSize,
  isVideoExt,
  simulateUpload,
  type CourseOption,
} from "@/lib/lmsProfessorUploadApi";

export interface MaterialFormResult {
  courseId: number;
  courseName: string;
  title: string;
  description: string;
  file: File | null; // 수정 모드에서 파일 미교체 시 null
}

interface MaterialUploadFormProps {
  courses: CourseOption[];
  mode?: "create" | "edit";
  // 수정 모드 초기값 (등록 모드면 미사용)
  initial?: { courseId: number; title: string; description: string };
  initialFileName?: string; // 수정 모드: 현재 파일명 표시용
  onSubmit: (result: MaterialFormResult) => void;
  onCancel?: () => void; // 모달이면 닫기. 인라인이면 생략(폼 리셋만)
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30";

export default function MaterialUploadForm({
  courses,
  mode = "create",
  initial,
  initialFileName,
  onSubmit,
  onCancel,
}: MaterialUploadFormProps) {
  const [courseId, setCourseId] = useState<number>(initial?.courseId ?? courses[0]?.courseId ?? 0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 파일 선택/드롭 시 즉시 검증 — 확장자 화이트리스트 + 5GB 한도
  const pickFile = (f: File) => {
    const ext = fileExtOf(f.name);
    if (!UPLOAD_ALLOWED_EXTS.includes(ext)) {
      setError(
        "허용되지 않는 파일 형식입니다. 영상(MP4·AVI·MOV·WMV)·음성(MP3·M4A·WAV)·문서(PDF·HWP·DOC·PPT·XLS·TXT)·이미지(JPG·PNG·GIF)·ZIP만 업로드할 수 있습니다."
      );
      return;
    }
    if (f.name.length > UPLOAD_MAX_FILENAME) {
      setError(`파일명이 너무 깁니다(최대 ${UPLOAD_MAX_FILENAME}자). 파일명을 줄인 뒤 다시 선택해 주세요.`);
      return;
    }
    if (f.size > UPLOAD_MAX_SIZE) {
      setError("파일 용량은 5GB를 초과할 수 없습니다.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const resetAll = () => {
    setCourseId(initial?.courseId ?? courses[0]?.courseId ?? 0);
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setFile(null);
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
    if (mode === "create" && !file) {
      setError("업로드할 파일을 선택해 주세요.");
      return;
    }
    // 검증 통과 후 최종 확인 — 실수 업로드 방지(사용자 요구)
    const confirmMsg =
      mode === "edit"
        ? "이 내용으로 강의 자료를 수정 업로드하시겠습니까?"
        : "이 내용으로 강의 자료를 업로드하시겠습니까?";
    if (!confirm(confirmMsg)) return;
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      // mock: 파일이 있을 때만 진행률 시뮬레이션 (수정 모드 파일 미교체 시 즉시 제출)
      if (file) await simulateUpload(setProgress);
      const courseName = courses.find((c) => c.courseId === courseId)?.courseName ?? "";
      onSubmit({ courseId, courseName, title: t, description: description.trim(), file });
      if (mode === "create") resetAll();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* 대상 과목 + 제목 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">대상 과목</label>
          {/* 수정 모드에서는 대상 과목 변경 불가(disabled) — 등록 모드에서만 선택 */}
          <select
            className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`}
            value={String(courseId)}
            onChange={(e) => setCourseId(Number(e.target.value))}
            disabled={uploading || mode === "edit"}
          >
            {courses.map((c) => (
              <option key={c.courseId} value={String(c.courseId)}>
                {c.courseName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">제목</label>
          {/* 제목 최대 500자 = DB LEC_UPL_TITLE VARCHAR2(500 CHAR) 한도(BE도 동일 기준 검증 예정) */}
          <input
            type="text"
            className={inputClass}
            placeholder="예: Week 8 - 동적 프로그래밍"
            maxLength={500}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
          />
        </div>
      </div>

      {/* 강의 설명 — Tiptap 리치텍스트 (트라이얼). 값은 HTML 문자열(DB CLOB 저장 전제).
          원복 시 이 블록을 기존 textarea로 되돌리면 끝(인터페이스 동일: description/setDescription) */}
      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">강의 설명</label>
        <LmsRichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="강의 내용 및 학습 목표를 입력하세요."
          disabled={uploading}
          maxLength={4000}
        />
      </div>

      {/* 파일 업로드 드롭존 — 클릭 또는 드래그&드롭 */}
      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          파일 업로드{mode === "create" && <span className="text-red-500"> *</span>}
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
            const f = e.dataTransfer.files?.[0];
            if (f) pickFile(f);
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
            이미지(JPG·PNG·GIF) · ZIP — 최대 5GB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={UPLOAD_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.target.value = ""; // 같은 파일 재선택 가능하도록 초기화
            }}
          />
        </div>

        {/* 수정 모드: 현재 파일 안내 (새 파일 선택 시 교체) */}
        {mode === "edit" && !file && initialFileName && (
          <p className="mt-2 text-xs text-slate-400">
            현재 파일: {initialFileName} (변경하려면 새 파일을 선택하세요)
          </p>
        )}

        {/* 선택된 파일 + 업로드 진행률 */}
        {file && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-lg">{isVideoExt(fileExtOf(file.name)) ? "🎬" : "📄"}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
              {uploading ? (
                <>
                  <p className="text-xs text-slate-500">업로드 중… {progress}%</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-slate-700 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500">업로드 대기</p>
              )}
            </div>
            <span className="shrink-0 text-xs text-slate-400">{formatFileSize(file.size)}</span>
            {!uploading && (
              <button
                type="button"
                aria-label="파일 제거"
                onClick={() => setFile(null)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* 검증 에러 */}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {/* 액션 */}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={uploading}>
          취소
        </Button>
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="bg-slate-800 text-white hover:bg-slate-700"
        >
          {/* 완료 버튼명: 등록='업로드' / 수정='수정 완료' */}
          {uploading ? "업로드 중…" : mode === "edit" ? "수정 완료" : "⤓ 업로드"}
        </Button>
      </div>
    </div>
  );
}
