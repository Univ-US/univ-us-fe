"use client";

// SLM-006 강의 자료 — 교수가 올린 자료(영상·PDF·이미지·문서)를 학기·과목별 확인/다운로드
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13).
// - 학기 드롭다운('특정 학기만' — 전체 옵션 없음, 최신 학기 기본)
// - 과목별 섹션 테이블(유형·제목·업로드일·크기·다운로드)
// - 다운로드 불가(열람 기간 만료 / 교수 제한): 회색 비활성 버튼 + 행 흐리게
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatFileSize } from "@/lib/lmsProfessorUploadApi"; // 파일 크기 정본(§21)
import {
  getStudentMaterials,
  MATERIAL_TYPE_META,
  type CourseMaterials,
  type Material,
  type SemesterMaterials,
} from "@/lib/lmsStudentMaterialsApi";

export default function StudentMaterialsPage() {
  const [semesters, setSemesters] = useState<SemesterMaterials[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // '특정 학기만' — 전체 옵션 없음. 기본 = 최신(첫) 학기.
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getStudentMaterials()
      .then((d) => {
        if (!alive) return;
        setSemesters(d);
        setSelected(d[0] ? `${d[0].year}-${d[0].termCode}` : null); // 최신 학기 기본 선택
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const keyOf = (s: SemesterMaterials) => `${s.year}-${s.termCode}`;
  const current = useMemo(
    () => semesters.find((s) => keyOf(s) === selected) ?? null,
    [semesters, selected]
  );

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      {/* 헤더 */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">강의 자료</h1>
          <p className="mt-1 text-sm text-slate-500">과목별 자료</p>
        </div>
        {selected != null && (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={loading}
            className="h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {semesters.map((s) => (
              <option key={keyOf(s)} value={keyOf(s)}>
                {s.semesterLabel}
              </option>
            ))}
          </select>
        )}
      </header>

      {/* mock 단계 안내 (§15) */}
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 강의 자료가 아닙니다.
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">강의 자료를 불러오지 못했습니다.</p>
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
      ) : !current || current.courses.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">이 학기의 강의 자료가 없습니다.</p>
      ) : (
        <div className="space-y-7">
          {current.courses.map((course) => (
            <CourseSection key={course.lecId} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseSection({ course }: { course: CourseMaterials }) {
  const handleDownload = (m: Material) => {
    if (!m.downloadable) return;
    // 🧪 mock 단계 — BE 연동 시 인증 blob 다운로드로 교체.
    window.alert("샘플 데이터입니다 (BE 연동 전) — 실제 파일 다운로드는 연동 후 동작합니다.");
  };

  return (
    <section>
      <h2 className="mb-2 border-b border-slate-200 pb-2 text-sm font-bold text-slate-800">
        {course.courseName}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
              <th className="w-24 px-5 py-2.5 font-medium">유형</th>
              <th className="px-2 py-2.5 font-medium">제목</th>
              <th className="w-32 px-2 py-2.5 font-medium">업로드일</th>
              <th className="w-24 px-2 py-2.5 font-medium">크기</th>
              <th className="w-32 px-2 py-2.5 text-right font-medium">다운로드</th>
            </tr>
          </thead>
          <tbody>
            {course.materials.map((m) => {
              const meta = MATERIAL_TYPE_META[m.type];
              const locked = !m.downloadable;
              return (
                <tr
                  key={m.id}
                  className={`border-b border-slate-50 last:border-0 ${locked ? "opacity-50" : ""}`}
                >
                  <td className="px-5 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <span className="block truncate font-semibold text-slate-800" title={m.title}>
                      {m.title}
                    </span>
                  </td>
                  <td className="px-2 py-3 font-mono text-xs text-slate-500">{m.uploadDate}</td>
                  <td className="px-2 py-3 text-xs text-slate-500">{formatFileSize(m.size)}</td>
                  <td className="px-2 py-3 text-right">
                    {locked ? (
                      <span
                        title={m.lockedReason === "expired" ? "열람 기간 만료" : "교수 제한"}
                        className="inline-flex h-8 cursor-not-allowed items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-400"
                      >
                        🔒 다운로드 불가
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDownload(m)}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        ⤓ 다운로드
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
