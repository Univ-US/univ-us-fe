"use client";

// ─────────────────────────────────────────────────────────────
// [교수] LMS 리치텍스트 에디터 — Tiptap 래퍼 (트라이얼 2026-06-11)
// - 제공 기능 5종 한정(사용자 확정): 굵게 · 기울임 · 밑줄 · 글자 크기 · 글자 색상
//   (StarterKit의 나머지 확장은 configure로 비활성 — 마크다운 단축키로도 헤딩/목록 안 생김)
// - 인터페이스 textarea 호환(value/onChange = HTML 문자열) → 원복 시 textarea로 한 줄 교체
// - ⚠️ Tiptap v3는 기본적으로 트랜잭션마다 리렌더하지 않음(shouldRerenderOnTransaction=false)
//   → 툴바 활성 상태는 반드시 useEditorState 구독으로 읽는다(렌더 시 isActive 직독은 stale →
//   "토글이 안 풀리는" 버그의 원인이었음)
// - SSR/정적 export: useEditor({ immediatelyRender:false })로 프리렌더 안전
// - 콘텐츠 스타일 = 공용 lms-content.css (학생 뷰와 표시 동일성)
// ─────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { CharacterCount } from "@tiptap/extensions";
import "./lms-content.css";

interface ProfessorRichTextEditorProps {
  value: string; // HTML
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  // 텍스트 글자 수 제한(HTML 길이 아님) — CharacterCount가 입력·붙여넣기 초과를 차단
  maxLength?: number;
}

// 글자 크기 프리셋 (기본 = 해제 → .lms-content 기본 크기)
const FONT_SIZES = [
  { label: "작게", value: "12px" },
  { label: "기본", value: "" },
  { label: "크게", value: "18px" },
  { label: "아주 크게", value: "24px" },
];

// 글자 색상 프리셋 (기본 = 해제 → slate-800)
const FONT_COLORS = [
  "#dc2626", // red-600
  "#d97706", // amber-600
  "#059669", // emerald-600
  "#2563eb", // blue-600
  "#7c3aed", // violet-600
];

export default function ProfessorRichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  maxLength,
}: ProfessorRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      // 필요 기능 외 확장 비활성(굵게·기울임·밑줄만 유지 + 문단/줄바꿈/실행취소)
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        strike: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      // 글자 크기·색상 (textStyle 마크 기반 — span style 인라인 저장)
      TextStyle,
      FontSize,
      Color,
      // 글자 수 제한 — limit 초과 입력/붙여넣기 차단 (maxLength 미지정 시 무제한)
      CharacterCount.configure({ limit: maxLength ?? null }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false, // 프리렌더(서버)에서는 생성하지 않음 — 하이드레이션 안전
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    editorProps: {
      attributes: { class: "lms-content" },
    },
  });

  // 툴바 활성 상태 구독 — 트랜잭션(토글·커서이동)마다 여기만 리렌더 트리거됨
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed?.isActive("bold") ?? false,
      italic: ed?.isActive("italic") ?? false,
      underline: ed?.isActive("underline") ?? false,
      fontSize: (ed?.getAttributes("textStyle").fontSize as string | undefined) ?? "",
      color: (ed?.getAttributes("textStyle").color as string | undefined) ?? "",
      isEmpty: ed?.isEmpty ?? true,
      characters: ed?.storage.characterCount.characters() ?? 0,
    }),
  });

  // 외부 value 변경(취소·원복, 수정모드 초기값) 동기화.
  // 입력 중(isFocused) 에코로 인한 setContent 재주입(커서·서식 깨짐)을 막기 위해 포커스 중엔 건너뜀.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (editor.getHTML() !== value) editor.commands.setContent(value || "");
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  // ⚠️ 플레이스홀더/카운터는 useEditorState 스냅샷을 쓰지 않는다 — 수정 모드처럼 내용이 채워진 채
  // 생성되면 첫 트랜잭션 전까지 스냅샷이 빈 문서(isEmpty/0자)로 남아 겹침 버그가 남(2026-06-11 발견).
  // 플레이스홀더 = value prop(항상 현재 HTML) 기준, 카운터 = 에디터 직접 읽기(리렌더는 구독이 보장).
  const showPlaceholder = !disabled && (!value || value === "<p></p>");
  const characters = editor?.storage.characterCount.characters() ?? 0;

  const btnClass = (active: boolean) =>
    `flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      active ? "bg-slate-700 text-white" : "text-slate-600 hover:bg-slate-200"
    }`;

  return (
    <div
      className={`lms-editor rounded-lg border border-slate-300 bg-white focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-500/30 ${
        disabled ? "opacity-70" : ""
      }`}
    >
      {/* 툴바 — 5기능: B · I · U · 글자크기 · 글자색 */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-1.5">
        <button
          type="button"
          title="굵게"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={btnClass(state?.bold ?? false)}
        >
          B
        </button>
        <button
          type="button"
          title="기울임"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`${btnClass(state?.italic ?? false)} italic`}
        >
          I
        </button>
        <button
          type="button"
          title="밑줄"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`${btnClass(state?.underline ?? false)} underline`}
        >
          U
        </button>

        <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden />

        {/* 글자 크기 */}
        <select
          title="글자 크기"
          disabled={disabled || !editor}
          value={state?.fontSize ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v) editor?.chain().focus().setFontSize(v).run();
            else editor?.chain().focus().unsetFontSize().run();
          }}
          className="h-7 rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-600 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {FONT_SIZES.map((s) => (
            <option key={s.label} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden />

        {/* 글자 색상 — 프리셋 스와치 + 기본(해제) */}
        <button
          type="button"
          title="기본 색"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().unsetColor().run()}
          className={btnClass(!state?.color)}
        >
          A
        </button>
        {FONT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={`글자색 ${c}`}
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().setColor(c).run()}
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 ${
              state?.color === c ? "ring-2 ring-slate-500 ring-offset-1" : ""
            }`}
          >
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c }} />
          </button>
        ))}
      </div>

      {/* 편집 영역 (+ 빈 문서 플레이스홀더) */}
      <div className="relative">
        {showPlaceholder && placeholder && (
          <p className="pointer-events-none absolute left-3 top-2 text-sm text-slate-400">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* 글자 수 카운터 — maxLength 지정 시에만. 한도 도달하면 강조 */}
      {maxLength != null && (
        <div className="flex justify-end px-3 pb-1.5">
          <span
            className={`text-[11px] ${
              characters >= maxLength ? "font-semibold text-red-500" : "text-slate-400"
            }`}
          >
            {characters}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
}
