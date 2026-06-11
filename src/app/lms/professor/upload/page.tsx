"use client";

// ─────────────────────────────────────────────────────────────
// PLM-005 — 교수 "강의 업로드" (영상·파일 업로드 & 텍스트 작성)
// - 기본 화면: 헤더 + 업로드된 강의 자료 목록(유형 배지·크기·업로드일·수정/삭제)만 표시
// - 새 강의 자료 등록 폼은 상시 노출하지 않음 — '새 자료 업로드' 버튼 클릭 시에만
//   PLM-005-01 등록 모달로 표시 / 목록 '수정' → 같은 모달의 수정 모드
// - 목록은 페이지당 최대 10건 페이지네이션(클라이언트 슬라이싱) + 빈 행 패딩으로
//   건수와 무관하게 항상 10행 높이 고정(0건 포함, 페이저도 상시 표시)
// - 유형 칼럼은 BE가 내려주는 확장자(EXT_TYPE) 문자열 그대로 표기(예: mp4·avi·pdf)
// - ⚠️ 명시적 mock 데이터(BE 연동 전) — BE 명세 도착 시 lib mock 제거 + axios 실연결
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type MaterialFormResult } from "@/components/lms/MaterialUploadForm";
import MaterialUploadDialog from "@/components/lms/MaterialUploadDialog";
import { htmlToPlainText } from "@/lib/lmsSanitize";
import {
  MOCK_COURSES,
  MOCK_MATERIALS,
  fileExtOf,
  formatFileSize,
  isVideoExt,
  type LectureMaterial,
} from "@/lib/lmsProfessorUploadApi";

// 신규 등록일 표기 "YYYY-MM-DD" (년-월-일까지만)
const todayYMD = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
};

// 목록 페이지당 건수 — 화면 높이도 이 행 수로 고정(빈 행 패딩)
const MATERIALS_PAGE_SIZE = 10;

export default function LectureUploadPage() {
  const [materials, setMaterials] = useState<LectureMaterial[]>(MOCK_MATERIALS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LectureMaterial | null>(null);
  const [page, setPage] = useState(0); // 0-based

  // 등록 (인라인 폼 + 모달 등록 모드 공용) — 목록 맨 위에 추가
  const handleCreate = (r: MaterialFormResult) => {
    const ext = r.file ? fileExtOf(r.file.name) : "pdf";
    setMaterials((prev) => [
      {
        materialId: Math.max(0, ...prev.map((m) => m.materialId)) + 1,
        courseId: r.courseId,
        courseName: r.courseName,
        title: r.title,
        description: r.description,
        fileName: r.file?.name ?? "",
        fileExt: ext,
        fileSize: r.file?.size ?? 0,
        uploadedAt: todayYMD(),
      },
      ...prev,
    ]);
    setPage(0); // 신규 항목은 목록 맨 위(1페이지)에 추가되므로 이동해서 보여줌
  };

  // 수정 — 파일 미교체 시 기존 파일·등록일 유지
  const handleUpdate = (target: LectureMaterial, r: MaterialFormResult) => {
    setMaterials((prev) =>
      prev.map((m) =>
        m.materialId === target.materialId
          ? {
              ...m,
              courseId: r.courseId,
              courseName: r.courseName,
              title: r.title,
              description: r.description,
              ...(r.file
                ? {
                    fileName: r.file.name,
                    fileExt: fileExtOf(r.file.name),
                    fileSize: r.file.size,
                    uploadedAt: todayYMD(),
                  }
                : {}),
            }
          : m
      )
    );
  };

  const handleDialogSubmit = (r: MaterialFormResult) => {
    if (editTarget) handleUpdate(editTarget, r);
    else handleCreate(r);
    setDialogOpen(false);
    setEditTarget(null);
  };

  const openCreateDialog = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (m: LectureMaterial) => {
    setEditTarget(m);
    setDialogOpen(true);
  };

  const handleDelete = (m: LectureMaterial) => {
    if (!confirm(`'${m.title}' 자료를 삭제하시겠습니까?`)) return;
    setMaterials((prev) => prev.filter((x) => x.materialId !== m.materialId));
  };

  // 페이지 슬라이스 — 삭제로 마지막 페이지가 사라져도 범위를 벗어나지 않게 클램프
  const totalPages = Math.max(1, Math.ceil(materials.length / MATERIALS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = materials.slice(
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
            <p className="text-sm text-slate-500">업로드된 자료 {materials.length}건</p>
          </div>
          <Button onClick={openCreateDialog} className="bg-slate-800 text-white hover:bg-slate-700">
            새 자료 업로드
          </Button>
        </header>

        {/* mock 안내 — BE 연동 전 의도적 샘플 데이터(조용한 폴백 아님) */}
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-3 text-xs text-amber-700">
          🧪 샘플 데이터(BE 연동 전) — 업로드·수정·삭제는 이 화면 안에서만 동작하며 새로고침 시
          초기화됩니다.
        </section>

        {/* 업로드된 강의 자료 목록 */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">업로드된 강의 자료</h2>
            <span className="text-sm text-slate-500">{materials.length}건</span>
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
                {materials.length === 0 ? (
                  // 0건도 행 높이를 유지(고정식) — 안내 1행 + 빈 행 패딩으로 항상 10행
                  <>
                    <tr className="border-b border-slate-50">
                      <td colSpan={6} className="px-5 py-3 text-center text-slate-400">
                        <div className="flex h-9 items-center justify-center">
                          업로드된 자료가 없습니다.
                        </div>
                      </td>
                    </tr>
                    <PadRows count={MATERIALS_PAGE_SIZE - 1} />
                  </>
                ) : (
                  pageItems.map((m) => (
                    <tr key={m.materialId} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3">
                        {/* 설명 없는 행도 동일 높이 유지(min-h-9 = 패딩 행과 동일 기준).
                            설명은 에디터 HTML일 수 있어 plain text로 변환해 요약 표기 */}
                        <div className="flex min-h-9 flex-col justify-center">
                          <p className="font-semibold text-slate-900">{m.title}</p>
                          {htmlToPlainText(m.description) && (
                            <p className="text-xs text-slate-400">
                              {htmlToPlainText(m.description)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{m.courseName}</td>
                      <td className="px-5 py-3">
                        {/* BE가 내려주는 확장자 값 그대로 표기 (라벨 변환 없음 — 예: mp4·avi·pdf) */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                            isVideoExt(m.fileExt)
                              ? "bg-red-100 text-red-600"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isVideoExt(m.fileExt) ? "🎬" : "📄"} {m.fileExt}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{formatFileSize(m.fileSize)}</td>
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
                  ))
                )}
                {/* 행 부족분을 빈 행으로 채워 목록 높이 고정(항상 MATERIALS_PAGE_SIZE행) */}
                {materials.length > 0 && (
                  <PadRows count={MATERIALS_PAGE_SIZE - pageItems.length} />
                )}
              </tbody>
            </table>
          </div>
          {/* 페이지네이션 — 고정 높이 유지를 위해 0건/1페이지여도 상시 표시 */}
          <Pager page={safePage} totalPages={totalPages} onPage={setPage} />
        </section>
      </div>

      {/* PLM-005-01 새 자료 등록 모달 (수정 모드 겸용) */}
      <MaterialUploadDialog
        open={dialogOpen}
        courses={MOCK_COURSES}
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
