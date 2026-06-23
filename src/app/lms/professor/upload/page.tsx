"use client";

// ─────────────────────────────────────────────────────────────
// PLM-005 — 교수 "강의 업로드" (영상·파일 업로드 & 텍스트 작성) — BE 실연동
//   + 서버 페이지네이션 전환(공통 PaginateRestUtil/PageResponse)
// - 마운트: 과목 드롭다운(GET /uploads/lectures) + SEM_TERM 공통코드 + 메타(GET /uploads/meta) + 첫 페이지
// - 목록: GET /uploads?page=&size=&year=&termCode= → 서버가 필터·페이지 처리(PageResponse)
//   · 필터 옵션(년도/학기)·전체 건수는 메타에서, 현재 페이지 항목·필터 건수는 페이지 응답에서
// - 등록/수정: 모달(PLM-005-01) → 성공 시 메타 + 페이지 재조회 (등록은 1페이지로)
// - 삭제: confirm → DELETE → 메타 + 현재 페이지 재조회(마지막 1건 삭제 시 페이지 보정)
// - 목록은 페이지당 최대 10건 + 빈 행 패딩으로 높이 고정(0건 포함, 페이저 상시 표시)
// - 유형 칼럼은 BE가 내려주는 확장자(EXT_TYPE) 문자열 그대로 표기(예: mp4·avi·pdf)
// - 실패 시 가짜 데이터로 가리지 않음 — describeApiError 표기 + 재시도
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import LmsSelectDropdown from "@/components/lms/LmsSelectDropdown";
import ProfessorMaterialUploadDialog from "@/components/lms/ProfessorMaterialUploadDialog";
import {
  deleteUpload,
  formatFileSize,
  getUploadLectures,
  getUploads,
  getUploadsMeta,
  isVideoExt,
} from "@/lib/lmsProfessorUploadApi";
import type { Lecture, Material, SemesterOption } from "@/types/lmsProfessorUpload";
import { getCommonCodeList } from "@/lib/lmsCommonCode";
import { describeApiError } from "@/lib/lmsApiError";
import { htmlToPlainText } from "@/lib/lmsSanitize";

// 페이지당 표시 건수 (서버 페이지네이션 size)
const MATERIALS_PAGE_SIZE = 10;

export default function LectureUploadPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  // 학기 필터 정렬 순서 — 공통코드 SEM_TERM(서버 CODE_ORDER 정렬)에서 유도
  const [termOrder, setTermOrder] = useState<string[]>([]);

  // 메타 — 전체 건수(필터 무관) + 필터 옵션(자료 보유 년도/학기)
  const [totalAll, setTotalAll] = useState(0);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);

  // 현재 페이지 데이터(서버)
  const [materials, setMaterials] = useState<Material[]>([]);
  const [totalElements, setTotalElements] = useState(0); // 필터 적용 전체 건수
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0); // 0-based

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // 초기/페이지 로드 실패
  const [actionError, setActionError] = useState<string | null>(null); // 삭제/재조회 실패
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Material | null>(null);

  // 목록 년도/학기 필터 — "all" = '전체'(기본값). 변경 시 0페이지로 복귀
  const [yearFilter, setYearFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");

  // 등록/삭제 후 같은 page라도 강제 재조회하기 위한 틱
  const [reloadTick, setReloadTick] = useState(0);

  // 필터 옵션 — 메타(자료 보유 년도/학기)에서 유도. 년도 내림차순, 학기는 연중 순서
  const yearOptions = useMemo(
    () => [...new Set(semesters.map((s) => s.semYear))].sort((a, b) => b - a),
    [semesters]
  );
  const termOptions = useMemo(
    () =>
      [...new Set(semesters.map((s) => s.semTerm))].sort(
        (a, b) => termOrder.indexOf(a) - termOrder.indexOf(b)
      ),
    [semesters, termOrder]
  );

  // 메타 로드 (마운트 + 등록/삭제 후) — 전체 건수·필터 옵션. 실패는 페이지 로드 에러로 통합 처리.
  const loadMeta = useCallback(async () => {
    const meta = await getUploadsMeta();
    setTotalAll(meta.totalAll);
    setSemesters(meta.semesters);
  }, []);

  // 현재 페이지 로드 — page/필터 변경·재조회 시. 범위 벗어난 page는 마지막 페이지로 보정.
  const loadPage = useCallback(async (p: number, year: string, term: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUploads({
        page: p,
        size: MATERIALS_PAGE_SIZE,
        year: year === "all" ? null : Number(year),
        termCode: term === "all" ? null : term,
      });
      setMaterials(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(Math.max(1, res.totalPages));
      // 삭제 등으로 현재 page가 범위를 벗어났으면 마지막 페이지로 보정(setPage → effect 재조회)
      if (res.totalPages > 0 && p > res.totalPages - 1) {
        setPage(res.totalPages - 1);
      }
    } catch (err) {
      setError(describeApiError(err));
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 마운트: 강의 드롭다운 + 학기 공통코드(순서+라벨 통합) + 메타 (페이지는 아래 effect가 로드)
  useEffect(() => {
    (async () => {
      try {
        const [lectureList, semTermList] = await Promise.all([
          getUploadLectures(),
          getCommonCodeList("SEM_TERM"),
        ]);
        setLectures(lectureList);
        // 서버 CODE_ORDER 정렬 배열에서 정렬 순서(termOrder)와 라벨맵(termMap) 둘 다 유도
        setTermOrder(semTermList.map((c) => c.codeVal));
        setTermMap(Object.fromEntries(semTermList.map((c) => [c.codeVal, c.codeName])));
        await loadMeta();
      } catch (err) {
        setError(describeApiError(err));
        setLoading(false);
      }
    })();
  }, [loadMeta]);

  // page/필터/재조회틱 변경 시 현재 페이지 재조회
  useEffect(() => {
    loadPage(page, yearFilter, termFilter);
  }, [page, yearFilter, termFilter, reloadTick, loadPage]);

  // 상단 에러 재시도 — 메타 + 현재 페이지 모두 재조회
  const retry = async () => {
    setError(null);
    try {
      await loadMeta();
    } catch (err) {
      setError(describeApiError(err));
    }
    setReloadTick((t) => t + 1);
  };

  // 필터 변경 — 0페이지로 복귀(effect가 재조회)
  const changeYear = (v: string) => {
    setYearFilter(v);
    setPage(0);
  };
  const changeTerm = (v: string) => {
    setTermFilter(v);
    setPage(0);
  };

  // 모달 저장 성공 — 메타 갱신 + 재조회 (등록이면 0페이지로)
  const handleDialogSubmit = async (saved: Material) => {
    const wasEdit = editTarget != null;
    setDialogOpen(false);
    setEditTarget(null);
    setActionError(null);
    try {
      await loadMeta();
    } catch {
      /* 메타 실패는 치명적 아님 — 페이지 재조회로 목록은 갱신됨 */
    }
    if (!wasEdit) setPage(0);
    setReloadTick((t) => t + 1);
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
    if (!confirm(`'${m.lecUplTitle}' 자료를 삭제하시겠습니까?`)) return;
    setActionError(null);
    try {
      await deleteUpload(m.uploadId);
      try {
        await loadMeta();
      } catch {
        /* 메타 실패는 무시 — 페이지 재조회로 목록 갱신 */
      }
      setReloadTick((t) => t + 1); // 현재 페이지 재조회(마지막 1건 삭제 시 loadPage가 페이지 보정)
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 — 전체 건수(필터 무관, 메타) */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">강의 업로드</h1>
            <p className="text-sm text-slate-500">업로드된 자료 {totalAll}건</p>
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
          // 초기/페이지 로드 실패 — 가짜 데이터로 가리지 않고 에러 표기 + 재시도
          <section className="mb-6 rounded-2xl border border-red-200 bg-red-50/70 px-5 py-6 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={retry}>
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
                  <span className="text-sm text-slate-500">{totalElements}건</span>
                </div>
                <div className="flex items-center gap-2">
                  <LmsSelectDropdown
                    value={yearFilter}
                    onChange={changeYear}
                    disabled={loading}
                    aria-label="연도 필터"
                    className="w-28"
                    options={[
                      { value: "all", label: "전체 연도" },
                      ...yearOptions.map((y) => ({ value: String(y), label: `${y}년` })),
                    ]}
                  />
                  <LmsSelectDropdown
                    value={termFilter}
                    onChange={changeTerm}
                    disabled={loading}
                    aria-label="학기 필터"
                    className="w-32"
                    options={[
                      { value: "all", label: "전체 학기" },
                      ...termOptions.map((t) => ({ value: t, label: termMap[t] ?? t })),
                    ]}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                      <th className="px-5 py-3 font-medium">제목</th>
                      <th className="px-5 py-3 font-medium">대상 과목</th>
                      <th className="px-5 py-3 font-medium">분반</th>
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
                          <td colSpan={7} className="px-5 py-3 text-center text-slate-400">
                            <div className="flex h-9 items-center justify-center">불러오는 중…</div>
                          </td>
                        </tr>
                        <PadRows count={MATERIALS_PAGE_SIZE - 1} />
                      </>
                    ) : totalElements === 0 ? (
                      // 0건도 높이 고정(고정식) — 안내 1행 + 빈 행 패딩 (전체 0건 / 필터 결과 0건 문구 분기)
                      <>
                        <tr className="border-b border-slate-50">
                          <td colSpan={7} className="px-5 py-3 text-center text-slate-400">
                            <div className="flex h-9 items-center justify-center">
                              {totalAll === 0
                                ? "업로드된 자료가 없습니다."
                                : "선택한 연도·학기에 해당하는 자료가 없습니다."}
                            </div>
                          </td>
                        </tr>
                        <PadRows count={MATERIALS_PAGE_SIZE - 1} />
                      </>
                    ) : (
                      <>
                        {materials.map((m) => (
                          <tr key={m.uploadId} className="border-b border-slate-50 last:border-0">
                            <td className="px-5 py-3">
                              {/* 설명(content)은 에디터 HTML → plain text 요약 표기. min-h-9 = 패딩 행과 동일 높이.
                                  제목 500자·설명 4000자라 무공백 장문이 셀 폭을 밀어 레이아웃이 깨질 수 있음
                                  → max-w + truncate로 말줄임(전체 내용은 hover 툴팁/수정 모달에서 확인) */}
                              <div className="flex min-h-9 max-w-[320px] flex-col justify-center">
                                <p className="truncate font-semibold text-slate-900" title={m.lecUplTitle}>
                                  {m.lecUplTitle}
                                </p>
                                {htmlToPlainText(m.lecUplContent ?? "") && (
                                  <p
                                    className="truncate text-xs text-slate-400"
                                    title={htmlToPlainText(m.lecUplContent ?? "")}
                                  >
                                    {htmlToPlainText(m.lecUplContent ?? "")}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-700">
                              {/* 강의명 = 폭 기준 CSS truncate(글자 수 고정 아님) + 전체명 hover title */}
                              <div className="max-w-[180px] truncate" title={m.courseName}>
                                {m.courseName}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-600">
                              {m.lecSection != null ? `${m.lecSection}반` : "-"}
                            </td>
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
                            <td className="px-5 py-3 text-slate-500">{m.lecUplRegDate}</td>
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
                        <PadRows count={MATERIALS_PAGE_SIZE - materials.length} />
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              {/* 페이지네이션 — 고정 높이 유지를 위해 0건/1페이지여도 상시 표시 */}
              <Pager page={page} totalPages={totalPages} onPage={setPage} />
            </section>
          </>
        )}
      </div>

      {/* PLM-005-01 새 자료 등록 모달 (수정 모드 겸용) — 폼이 BE 호출 수행 */}
      <ProfessorMaterialUploadDialog
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
          <td colSpan={7} className="px-5 py-3">
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
