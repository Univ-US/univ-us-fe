"use client";

// SLM-009 공지사항 — 수강 과목 교수가 작성한 강의 공지 확인 (좌 목록 선택 → 우 상세)
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13). 질문은 채팅(SLM-008).
// - 학기 드롭다운(특정 학기·최신 기본) / 안읽은 공지는 굵게 + 점 표시 / 첨부파일 다운로드
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getStudentNotices,
  type Notice,
  type NoticeBlock,
} from "@/lib/lmsStudentNoticeApi";

const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];

export default function StudentNoticePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSem, setSelectedSem] = useState<string | null>(null); // "{year}-{termCode}"
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getStudentNotices()
      .then((d) => {
        if (!alive) return;
        setNotices(d);
        // 최신 학기 기본 선택
        const sems = uniqueSemesters(d);
        setSelectedSem(sems[0]?.key ?? null);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const semesters = useMemo(() => uniqueSemesters(notices), [notices]);

  // 선택 학기 공지 — 안읽음 먼저, 날짜 내림차순
  const list = useMemo(() => {
    const filtered = notices.filter((n) => `${n.year}-${n.termCode}` === selectedSem);
    return [...filtered].sort(
      (a, b) => Number(b.unread) - Number(a.unread) || b.date.localeCompare(a.date)
    );
  }, [notices, selectedSem]);

  // 학기 변경 시 기본 선택(featured 우선, 없으면 첫 항목)
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
  const unreadCount = useMemo(() => list.filter((n) => n.unread).length, [list]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* 헤더 */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">공지사항</h1>
          <p className="mt-1 text-sm text-slate-500">안읽음 {unreadCount}건</p>
        </div>
        {selectedSem != null && (
          <select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            disabled={loading}
            className="h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {semesters.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </header>

      {/* mock 단계 안내 (§15) */}
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 공지가 아닙니다.
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
        <p className="py-16 text-center text-sm text-slate-400">이 학기의 공지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[22rem_1fr]">
          {/* 좌: 공지 목록 */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">공지 목록</h2>
              <span className="text-[11px] text-slate-400">안읽음 {unreadCount}건</span>
            </div>
            <ul className="p-2">
              {list.map((n) => {
                const active = n.id === selectedId;
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
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            n.unread ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {n.courseName}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{n.listDate}</span>
                      </div>
                      <div className="mt-1.5 flex items-start gap-1.5">
                        {n.unread && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                        )}
                        <span
                          className={`text-sm ${
                            n.unread ? "font-bold text-slate-900" : "font-medium text-slate-600"
                          }`}
                        >
                          {n.title}
                        </span>
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
      {/* 배지 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          {notice.courseFullName}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
          공지
        </span>
      </div>

      {/* 제목 + 메타 */}
      <h3 className="mt-3 text-xl font-bold text-slate-900">{notice.title}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 pb-4 text-xs text-slate-500">
        <span>👤 {notice.author}</span>
        <span>📅 {notice.date}</span>
        <span>👁 조회 {notice.views}</span>
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

// 학기 옵션(최신순)
function uniqueSemesters(notices: Notice[]): { key: string; label: string }[] {
  const map = new Map<string, { key: string; label: string; year: number; termCode: string }>();
  for (const n of notices) {
    const key = `${n.year}-${n.termCode}`;
    if (!map.has(key)) map.set(key, { key, label: n.semesterLabel, year: n.year, termCode: n.termCode });
  }
  return [...map.values()]
    .sort((a, b) => b.year - a.year || TERM_ORDER.indexOf(b.termCode) - TERM_ORDER.indexOf(a.termCode))
    .map(({ key, label }) => ({ key, label }));
}
