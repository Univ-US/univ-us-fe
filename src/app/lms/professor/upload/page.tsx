"use client";

// ─────────────────────────────────────────────────────────────
// PLM-005 — 교수 "강의 업로드" (영상·파일 업로드 & 텍스트 작성) — ✅ BE 실연동(2026-06-11)
// - 마운트 시 로드: 과목 드롭다운(GET /uploads/lectures) + 자료 목록(GET /uploads) + SEM_TERM 공통코드
// - 등록/수정: '새 자료 업로드'/'수정' → 모달(PLM-005-01, 폼이 BE 호출) → 성공 시 목록 재조회
// - 삭제: confirm → DELETE → 목록 재조회
// - 목록은 페이지당 최대 10건 + 빈 행 패딩으로 높이 고정(0건 포함, 페이저 상시 표시)
// - 유형 칼럼은 BE가 내려주는 확장자(EXT_TYPE) 문자열 그대로 표기(예: mp4·avi·pdf)
// - ⚠️ 실패 시 가짜 데이터로 가리지 않음 — describeApiError 표기 + 재시도
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import MaterialUploadDialog from "@/components/lms/MaterialUploadDialog";
import {
  deleteUpload,
  formatFileSize,
  getUploadLectures,
  getUploads,
  isVideoExt,
  type Lecture,
  type Material,
} from "@/lib/lmsProfessorUploadApi";
import { getCommonCodeMap } from "@/lib/lmsProfessorStudentsApi";
import { describeApiError } from "@/lib/lmsApiError";
import { htmlToPlainText } from "@/lib/lmsSanitize";

// 페이지당 표시 건수 (클라이언트 슬라이싱 — 자료 수가 화면 단위라 서버 페이지네이션은 추후)
const MATERIALS_PAGE_SIZE = 10;

// 학기 필터 옵션 정렬 순서 (공통코드 SEM_TERM — 연중 순서)
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];

export default function LectureUploadPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // 초기 로드 실패
  const [actionError, setActionError] = useState<string | null>(null); // 삭제/재조회 실패
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Material | null>(null);
  const [page, setPage] = useState(0);
  // 목록 년도/학기 필터 — "all" = '전체'(기본값). 변경 시 1페이지로 복귀
  const [yearFilter, setYearFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");

  // 초기 로드 — 드롭다운·목록·학기 라벨맵 병렬 (공통코드 실패는 빈 맵 폴백이라 치명적이지 않음)
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lectureList, uploadList, semTermMap] = await Promise.all([
        getUploadLectures(),
        getUploads(),
        getCommonCodeMap("SEM_TERM"),
      ]);
      setLectures(lectureList);
      setMaterials(uploadList);
      setTermMap(semTermMap);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const reloadUploads = async () => {
    try {
      setMaterials(await getUploads());
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  // 모달 저장 성공 — 목록 재조회 (등록이면 최신이 맨 위라 1페이지로)
  const handleDialogSubmit = async (saved: Material) => {
    const wasEdit = editTarget != null;
    setDialogOpen(false);
    setEditTarget(null);
    setActionError(null);
    await reloadUploads();
    if (!wasEdit) setPage(0);
    void saved; // 목록 재조회로 일관성 확보 — 단건 머지 대신 전체 갱신
  };

  const openCreateDialog = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (m: Material) => {
    setEditTarget(m);
    setDialogOpen(true);
  };

  const handleDelete = async (m: Material) => {
    if (!confirm(`'${m.title}' 자료를 삭제하시겠습니까?`)) return;
    setActionError(null);
    try {
      await deleteUpload(m.uploadId);
      await reloadUploads();
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  // 필터 옵션 — 보유 자료에서 유도(없는 년도/학기는 옵션에 안 띄움). 년도 내림차순, 학기는 연중 순서
  const yearOptions = useMemo(
    () => [...new Set(materials.map((m) => m.year))].sort((a, b) => b - a),
    [materials]
  );
  const termOptions = useMemo(
    () =>
      [...new Set(materials.map((m) => m.termCode))].sort(
        (a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b)
      ),
    [materials]
  );

  // 년도·학기 필터 적용(AND) → 페이지 슬라이스. 필터 결과 기준으로 건수·페이저 계산
  const filtered = materials.filter(
    (m) =>
      (yearFilter === "all" || String(m.year) === yearFilter) &&
      (termFilter === "all" || m.termCode === termFilter)
  );

  // 페이지 슬라이스 — 삭제/필터로 마지막 페이지가 사라져도 범위를 벗어나지 않게 클램프
  const totalPages = Math.max(1, Math.ceil(filtered.length / MATERIALS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(
    safePage * MATERIALS_PAGE_SIZE,
    safePage * MATERIALS_PAGE_SIZE + MATERIALS_PAGE_SIZE
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">강의 업로드</h1>
            <p className="text-sm text-slate-500">
              {loading ? "불러오는 중…" : `업로드된 자료 ${materials.length}건`}
            </p>
          </div>
          <Button
            onClick={openCreateDialog}
            disabled={loading || !!error}
            className="bg-slate-800 text-white hover:bg-slate-700"
          >
            새 자료 업로드
          </Button>
        </header>

        {error ? (
          // 초기 로드 실패 — 가짜 데이터로 가리지 않고 에러 표기 + 재시도
          <section className="mb-6 rounded-2xl border border-red-200 bg-red-50/70 px-5 py-6 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={loadAll}>
              다시 시도
            </Button>
          </section>
        ) : (
          <>
            {/* 삭제/재조회 등 액션 에러 */}
            {actionError && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {actionError}
              </p>
            )}

            {/* 업로드된 강의 자료 목록 */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* 카드 헤더 — 좌: 제목+건수(필터 적용 건수) / 우: 년도·학기 필터(기본 '전체') */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-base font-semibold text-slate-800">업로드된 강의 자료</h2>
                  <span className="text-sm text-slate-500">{filtered.length}건</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={yearFilter}
                    onChange={(e) => {
                      setYearFilter(e.target.value);
                      setPage(0);
                    }}
                    disabled={loading}
                    aria-label="년도 필터"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="all">전체</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}년
                      </option>
                    ))}
                  </select>
                  <select
                    value={termFilter}
                    onChange={(e) => {
                      setTermFilter(e.target.value);
                      setPage(0);
                    }}
                    disabled={loading}
                    aria-label="학기 필터"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="all">전체</option>
                    {termOptions.map((t) => (
                      <option key={t} value={t}>
                        {termMap[t] ?? t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                      <th className="px-5 py-3 font-medium">제목</th>
                      <th className="px-5 py-3 font-medium">대상 과목</th>
                      <th className="px-5 py-3 font-medium">유형</th>
                      <th className="px-5 py-3 font-medium">크기</th>
                      <th className="px-5 py-3 font-medium">업로드</th>
                      <th className="px-5 py-3 font-medium text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <>
                        <tr className="border-b border-slate-50">
                          <td colSpan={6} className="px-5 py-3 text-center text-slate-400">
                            <div className="flex h-9 items-center justify-center">불러오는 중…</div>
                          </td>
                        </tr>
                        <PadRows count={MATERIALS_PAGE_SIZE - 1} />
                      </>
                    ) : filtered.length === 0 ? (
                      // 0건도 높이 고정(고정식) — 안내 1행 + 빈 행 패딩 (전체 0건 / 필터 결과 0건 문구 분기)
                      <>
                        <tr className="border-b border-slate-50">
                          <td colSpan={6} className="px-5 py-3 text-center text-slate-400">
                            <div className="flex h-9 items-center justify-center">
                              {materials.length === 0
                                ? "업로드된 자료가 없습니다."
                                : "선택한 년도·학기에 해당하는 자료가 없습니다."}
                            </div>
                          </td>
                        </tr>
                        <PadRows count={MATERIALS_PAGE_SIZE - 1} />
                      </>
                    ) : (
                      <>
                        {pageItems.map((m) => (
                          <tr key={m.uploadId} className="border-b border-slate-50 last:border-0">
                            <td className="px-5 py-3">
                              {/* 설명(content)은 에디터 HTML → plain text 요약 표기. min-h-9 = 패딩 행과 동일 높이.
                                  제목 500자·설명 4000자라 무공백 장문이 셀 폭을 밀어 레이아웃이 깨질 수 있음
                                  → max-w + truncate로 말줄임(전체 내용은 hover 툴팁/수정 모달에서 확인) */}
                              <div className="flex min-h-9 max-w-[320px] flex-col justify-center">
                                <p className="truncate font-semibold text-slate-900" title={m.title}>
                                  {m.title}
                                </p>
                                {htmlToPlainText(m.content ?? "") && (
                                  <p
                                    className="truncate text-xs text-slate-400"
                                    title={htmlToPlainText(m.content ?? "")}
                                  >
                                    {htmlToPlainText(m.content ?? "")}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-700">{m.courseName}</td>
                            <td className="px-5 py-3">
                              {/* 다중 첨부: 첫 파일 확장자 배지 + 나머지 개수(+N). 첨부 없으면 — */}
                              {m.attachments.length > 0 ? (
                                <span className="inline-flex items-center gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                                      isVideoExt(m.attachments[0].fileExt ?? "")
                                        ? "bg-red-100 text-red-600"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {isVideoExt(m.attachments[0].fileExt ?? "") ? "🎬" : "📄"}{" "}
                                    {m.attachments[0].fileExt ?? "-"}
                                  </span>
                                  {m.attachments.length > 1 && (
                                    <span className="text-xs text-slate-400">
                                      +{m.attachments.length - 1}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-slate-700">
                              {/* 크기 = 첨부 전체 합계 */}
                              {m.attachments.length === 0
                                ? "—"
                                : formatFileSize(
                                    m.attachments.reduce((sum, a) => sum + (a.fileSize ?? 0), 0)
                                  )}
                            </td>
                            <td className="px-5 py-3 text-slate-500">{m.uploadedAt}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(m)}>
                                  수정
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(m)}
                                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  삭제
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {/* 행 부족분을 빈 행으로 채워 목록 높이 고정(항상 MATERIALS_PAGE_SIZE행) */}
                        <PadRows count={MATERIALS_PAGE_SIZE - pageItems.length} />
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              {/* 페이지네이션 — 고정 높이 유지를 위해 0건/1페이지여도 상시 표시 */}
              <Pager page={safePage} totalPages={totalPages} onPage={setPage} />
            </section>
          </>
        )}
      </div>

      {/* PLM-005-01 새 자료 등록 모달 (수정 모드 겸용) — 폼이 BE 호출 수행 */}
      <MaterialUploadDialog
        open={dialogOpen}
        lectures={lectures}
        termMap={termMap}
        edit={editTarget}
        onClose={() => {
          setDialogOpen(false);
          setEditTarget(null);
        }}
        onSubmit={handleDialogSubmit}
      />
    </main>
  );
}

// 행이 부족할 때 빈 행으로 채워 목록 높이를 고정하기 위한 스페이서.
// 데이터 행 높이 = 제목 2줄(제목 text-sm 20px + 부제 text-xs 16px = 36px) + py-3 → h-9(36px)로 맞춤.
function PadRows({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={`pad-${i}`} aria-hidden className="border-b border-slate-50 last:border-0">
          <td colSpan={6} className="px-5 py-3">
            <div className="h-9" />
          </td>
        </tr>
      ))}
    </>
  );
}

// 페이지네이션 (PLM-003/004와 동일 스타일). 고정 높이 유지를 위해 0건/1페이지여도 항상 렌더.
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
    <div className="flex items-center justify-center gap-1 border-t border-slate-100 px-5 py-4">
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
        active ? "bg-slate-800 font-semibold text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}
