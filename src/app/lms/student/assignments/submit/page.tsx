"use client";

// SLM-007 과제 제출 — 미제출 과제 선택(좌) → 파일 업로드(드래그&드롭)·메모 작성하여 제출(우)
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13). 이력은 SLM-004.
// - 좌: 제출 대상 목록(미제출/연장 승인/마감 종료) — 종료는 비활성
// - 우: 과제 설명 + 드래그&드롭 업로드 + 제출 메모 + 제출 전 체크리스트 + 최종 제출
import { useCallback, useEffect, useMemo, useState } from "react";
// 파일 크기 정본(§21) + 제출 파일 제약 = 교수 강의/과제 업로드와 동일(허용 확장자 22종·단일 5GB)
import {
  formatFileSize,
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXTS,
  UPLOAD_MAX_SIZE,
  fileExtOf,
} from "@/lib/lmsProfessorUploadApi";
import {
  getSubmittableAssignments,
  type SubmitItem,
} from "@/lib/lmsStudentSubmitApi";

interface PickedFile {
  name: string;
  size: number; // bytes
}

const CHECKLIST = [
  "파일명에 학번 포함 여부 확인",
  "과제 요구사항 충족 여부 확인",
  "제출 후 수정은 마감일 전까지만 가능",
];

// 업로드 안내 문구 = 교수 강의/과제 업로드와 동일(허용 확장자 동일 → 5GB 동일)
const FILE_ACCEPT_HINT =
  "영상(MP4·AVI·MOV·WMV) · 음성(MP3·M4A·WAV) · 문서(PDF·HWP·DOC·PPT·XLS·TXT) · 이미지(JPG·PNG·GIF) · ZIP — 최대 5GB";

// 제출 메모 최대 길이 = DB LEC_ASN_SBM_MEMO VARCHAR2(1000) (CLAUDE-DB.md §2 과제 제출)
const MEMO_MAX = 1000;

// 인수인계용 안내 박스의 테이블명/코드 칩 스타일(모노스페이스) — 타 학생 화면과 동일
const TBL_CLS =
  "rounded bg-white px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200";

export default function StudentSubmitPage() {
  const [items, setItems] = useState<SubmitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [memo, setMemo] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // 과제 선택 → 패널 전환 + 초안(draft) 프리필/초기화 (setState 세터만 사용 → 안정적)
  const selectItem = useCallback((it: SubmitItem) => {
    setSelectedId(it.id);
    if (it.draft) {
      setFile({ name: it.draft.fileName, size: it.draft.fileSize });
      setMemo(it.draft.memo);
    } else {
      setFile(null);
      setMemo("");
    }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getSubmittableAssignments()
      .then((d) => {
        if (!alive) return;
        setItems(d);
        // 기본 선택 = 첫 제출 가능 과제 (설계서 = 알고리즘 #3, draft 프리필)
        const first = d.find((it) => it.status !== "CLOSED") ?? d[0] ?? null;
        if (first) selectItem(first);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [selectItem]);

  useEffect(() => load(), [load]);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  const unsubmittedCount = items.filter((it) => it.status !== "CLOSED").length;

  // 파일 선택/드롭 시 검증 — 교수 업로드와 동일 기준(허용 확장자 22종·단일 5GB)
  const pickFiles = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    if (!UPLOAD_ALLOWED_EXTS.includes(fileExtOf(f.name))) {
      window.alert(
        `'${f.name}' — 허용되지 않는 파일 형식입니다.\n영상(MP4·AVI·MOV·WMV)·음성(MP3·M4A·WAV)·문서(PDF·HWP·DOC·PPT·XLS·TXT)·이미지(JPG·PNG·GIF)·ZIP만 제출할 수 있습니다.`
      );
      return;
    }
    if (f.size > UPLOAD_MAX_SIZE) {
      window.alert(
        `파일 용량 제한을 초과했습니다. 최대 5GB까지 제출할 수 있습니다.\n(선택한 파일: ${f.name} · ${formatFileSize(f.size)})`
      );
      return;
    }
    setFile({ name: f.name, size: f.size });
  };

  const handleSubmit = () => {
    // 🧪 mock 단계 — BE 연동 시 multipart 업로드로 교체.
    window.alert("샘플 데이터입니다 (BE 연동 전) — 실제 제출은 연동 후 동작합니다.");
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      {/* 헤더 */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">과제 제출</h1>
          <p className="mt-1 text-sm text-slate-500">미제출 과제 {unsubmittedCount}건</p>
        </div>
      </header>

      {/* mock 단계 안내 (§15) */}
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 제출되지 않습니다.
      </div>

      {/* 인수인계용 — 이 화면 구현에 필요한 BE 테이블·규칙(정본=CLAUDE-DB.md/§21). BE 연동 후 이 박스 삭제. */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <p className="mb-1.5 font-semibold text-slate-700">🗄 BE 연동 테이블 (이 화면 구현 시 필요)</p>
        <ul className="space-y-1">
          <li>
            <code className={TBL_CLS}>LECTURE_STUDENT_ENROLLMENT</code> → <code className={TBL_CLS}>LECTURE</code> + <code className={TBL_CLS}>LECTURE_CODE</code> — 수강 강의 범위·과목명(LEC_COD_NAME)
          </li>
          <li>
            <code className={TBL_CLS}>LMS_PROFILE</code> → <code className={TBL_CLS}>MEMBER</code> — 과제 설명의 교수명
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_ASSIGNMENT</code> — 과제 제목(LEC_ASN_TITLE)·내용(LEC_ASN_CONTENT)·마감(LEC_ASN_DUE_DATE)·과제 상태(LEC_ASN_VAL_STATUS: AVL/MOD/LAT/CLS/NOP)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_ASSIGNMENT_SUBMISSION</code> — 제출 레코드(상태 LEC_ASN_SBM_STATUS NSB→SBM·제출일시 LEC_ASN_SBM_REG_DATE·메모 LEC_ASN_SBM_MEMO)
          </li>
          <li>
            <code className={TBL_CLS}>ASSIGNMENT_SUBMISSION_ATTACHMENT</code> — 제출 파일 첨부(공통 첨부: ORG/TRN_FIL_NAME·FIL_SIZE·EXT_TYPE·ORG_URL·ATT_VAL_STATUS)
          </li>
        </ul>

        <p className="mt-3 mb-1.5 font-semibold text-slate-700">📐 구현 규칙 · 특이사항</p>
        <ul className="space-y-1">
          <li>
            · <b>제출 대상 목록 = 미제출(NSB)·제출 가능 과제만</b> — 제출 완료(SBM/GRD)·마감 종료는 제외(<code className={TBL_CLS}>GET /api/lms/student/assignments/submittable</code>).
          </li>
          <li>
            · <b>제출 가능 판정 = 서버 시각 기준</b> — 과제 상태 <code className={TBL_CLS}>LEC_ASN_VAL_STATUS</code>(AVL 제출가능·MOD 수정가능·LAT 지각·CLS 마감·NOP 제출불가) + 마감 경과면 비활성(SLM-004 overdue와 동형). 클라 시계 비신뢰.
          </li>
          <li>
            · <b>교수 연장 승인(EXTENDED) = 연장 마감까지 제출 가능</b> — 학생별 연장 전용 컬럼 없음 → BE 정책 결정(과제 상태 MOD/개별 연장 메커니즘). MVP 범위 협의.
          </li>
          <li>
            · <b>제출 = multipart</b>(<code className={TBL_CLS}>{"POST /api/lms/student/assignments/{id}/submit"}</code>): 파일 + 메모 → <code className={TBL_CLS}>LECTURE_ASSIGNMENT_SUBMISSION</code> UPSERT(NSB→SBM·제출일시 SYSTIMESTAMP) + <code className={TBL_CLS}>ASSIGNMENT_SUBMISSION_ATTACHMENT</code> INSERT. ⚠️ PK는 <b>시퀀스 채번</b>(<code className={TBL_CLS}>SEQ_*.NEXTVAL</code>, IDENTITY 아님).
          </li>
          <li>
            · <b>파일</b> = 확장자 화이트리스트(영상·음성·문서·이미지·ZIP, 교수 업로드와 동일 22종)·단일·합계 5GB. <b>업로드 = 서버 경유 multipart</b>(PLM-005와 동일, 로컬/PVC 저장) — S3 등 오브젝트 스토리지 전환은 추후 BE 결정.
          </li>
          <li>
            · <b>제출 메모</b> = <code className={TBL_CLS}>LEC_ASN_SBM_MEMO</code> VARCHAR2(1000), 1000자. <b>제출 후 수정 = 마감 전까지</b>(재제출 시 첨부 교체/추가 정책 BE 결정).
          </li>
          <li>· 소유권 = 본인 수강 강의의 과제만 제출(아니면 403).</li>
        </ul>
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">제출 대상 과제를 불러오지 못했습니다.</p>
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
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
          {/* 좌: 제출 대상 목록 */}
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">미제출 과제 목록</h2>
              <span className="text-[11px] text-slate-400">과제 선택 후 제출</span>
            </div>
            <ul className="p-2">
              {items.map((it) => {
                const active = it.id === selectedId;
                const closed = it.status === "CLOSED";
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => selectItem(it)}
                      className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-emerald-50" : "hover:bg-slate-50"
                      } ${closed ? "opacity-50" : ""}`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${it.dotColor}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-slate-800">{it.title}</span>
                          {it.badge && (
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                closed ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {it.badge}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {it.note ? `${it.courseName} · ${it.note}` : it.courseName}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-xs font-semibold ${
                          closed
                            ? "text-slate-400"
                            : it.status === "EXTENDED"
                              ? "text-emerald-600"
                              : "text-rose-600"
                        }`}
                      >
                        {closed ? "종료" : it.dDay}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 우: 제출 패널 */}
          {!selected ? (
            <section className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-400">
              왼쪽에서 제출할 과제를 선택하세요.
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-emerald-200 bg-white p-6">
              {/* 헤더 */}
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                <span className="shrink-0 text-sm font-semibold text-rose-600">마감 {selected.dueLabel}</span>
              </div>

              {/* 과제 설명 */}
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="mb-1.5 text-sm font-bold text-slate-700">과제 설명</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>· 과목: {selected.guide.courseName} ({selected.guide.professor} 교수)</li>
                  {selected.guide.lines.map((line, i) => (
                    <li key={i}>· {line}</li>
                  ))}
                </ul>
              </div>

              {selected.status === "CLOSED" ? (
                <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  🔒 마감이 종료되어 제출할 수 없습니다.
                </p>
              ) : (
                <>
                  {/* 제출 파일 */}
                  <div className="mt-5">
                    <label className="text-sm font-semibold text-slate-700">
                      제출 파일 <span className="text-rose-500">*</span>
                    </label>
                    <label
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        pickFiles(e.dataTransfer.files);
                      }}
                      className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                        dragOver
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-orange-200 bg-orange-50/40 hover:bg-orange-50"
                      }`}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                        ⤒
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        파일을 드래그하거나 클릭하여 업로드
                      </span>
                      <span className="text-xs text-slate-400">{FILE_ACCEPT_HINT}</span>
                      <input
                        type="file"
                        accept={UPLOAD_ACCEPT}
                        className="hidden"
                        onChange={(e) => {
                          pickFiles(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    {file && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                        <span className="text-base">📄</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                          {file.name}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{formatFileSize(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          aria-label="파일 제거"
                          className="shrink-0 text-slate-400 hover:text-rose-500"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 제출 메모 — DB LEC_ASN_SBM_MEMO VARCHAR2(1000) 한도, 글자수 표기 */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700">
                        제출 메모 <span className="font-normal text-slate-400">선택</span>
                      </label>
                      <span className="text-xs text-slate-400">
                        {memo.length} / {MEMO_MAX}자
                      </span>
                    </div>
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      rows={2}
                      maxLength={MEMO_MAX}
                      placeholder="과제 제출 관련 메모를 남길 수 있습니다."
                      className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* 제출 전 확인사항 */}
                  <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                    <p className="mb-1.5 text-sm font-bold text-slate-700">제출 전 확인사항</p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {CHECKLIST.map((c) => (
                        <li key={c} className="flex items-center gap-1.5">
                          <span className="text-emerald-600">☑</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 액션 */}
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => selectItem(selected)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!file}
                      className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      ⤒ 최종 제출하기
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
