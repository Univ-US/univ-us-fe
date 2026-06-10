"use client";

// PLM-004 — 교수 "채점 현황" (미채점 과제 빠른 접근 + 점수·피드백 채점)
// - 상단: 학기 드롭다운 + 미채점 배너(전체 채점 시작)
// - 미채점 과제 목록(마감일 순) → '채점하기'로 상세 선택
// - 채점 상세: 제목 '과목명 — 과제명' / 학생별 제출일시·파일(보기)·점수·피드백 인라인 입력·저장
//   · 채점완료 행 = '완료' 상태 · 미제출 학생 = 회색 행
// - '보기' → PLM-004-01 제출 파일 미리보기 모달(이미지만 미리보기)
// ⚠️ BE 공식 명세 연동 전(mock-first): 샘플 데이터 표시. 명세 도착 시 실제 연결 + 에러 상태로 전환.
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import SubmissionPreviewDialog from "@/components/lms/SubmissionPreviewDialog";
import {
  getGradingOverview,
  getGradingDetail,
  saveGrade,
  type GradingOverview,
  type GradingDetail,
  type Submission,
} from "@/lib/lmsProfessorGradingApi";

export default function ProfessorGradingPage() {
  const [overview, setOverview] = useState<GradingOverview | null>(null);
  const [detail, setDetail] = useState<GradingDetail | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // 미리보기 모달
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSub, setPreviewSub] = useState<Submission | null>(null);

  // 초기 로드(mock): 개요 + 첫 과제 상세
  useEffect(() => {
    (async () => {
      setLoading(true);
      const ov = await getGradingOverview();
      setOverview(ov);
      const firstId = ov.assignments[0]?.assignmentId ?? null;
      setSelectedId(firstId);
      if (firstId != null) setDetail(await getGradingDetail(firstId));
      setLoading(false);
    })();
  }, []);

  const selectAssignment = useCallback(async (assignmentId: number) => {
    setSelectedId(assignmentId);
    setDetail(await getGradingDetail(assignmentId));
  }, []);

  // 인라인 편집: 점수/피드백
  const updateSubmission = (submissionId: number, patch: Partial<Submission>) => {
    setDetail((d) =>
      d
        ? {
            ...d,
            submissions: d.submissions.map((s) =>
              s.submissionId === submissionId ? { ...s, ...patch } : s
            ),
          }
        : d
    );
  };

  // 저장 → graded 처리 + 카운트 갱신 (mock)
  const handleSave = async (sub: Submission) => {
    if (!detail) return;
    await saveGrade(detail.assignmentId, sub.submissionId, {
      score: sub.score,
      feedback: sub.feedback,
    });
    const wasGraded = sub.graded;
    updateSubmission(sub.submissionId, { graded: true });
    if (!wasGraded) {
      setDetail((d) =>
        d
          ? { ...d, gradedCount: d.gradedCount + 1, ungradedCount: Math.max(0, d.ungradedCount - 1) }
          : d
      );
    }
  };

  const openPreview = (sub: Submission) => {
    setPreviewSub(sub);
    setPreviewOpen(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">채점 현황</h1>
            <p className="text-sm text-slate-500">
              {overview?.semesterLabel ?? "—"} · 미채점 {overview?.totalUngraded ?? 0}건
            </p>
          </div>
          <select className={selectClass} defaultValue="2026-1">
            <option value="2026-1">{overview?.semesterLabel ?? "2026년 1학기"}</option>
          </select>
        </header>

        {/* mock 안내 */}
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
          표시용 샘플 데이터입니다. (BE 공식 명세 연동 전 — 명세 도착 시 실제 데이터로 전환)
        </p>

        {/* 미채점 배너 / 완료 상태 */}
        {overview && overview.totalUngraded > 0 ? (
          <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">⚠️</span>
              <div>
                <p className="font-semibold text-slate-800">
                  미채점 과제 {overview.totalUngraded}건이 대기 중입니다
                </p>
                <p className="text-xs text-slate-500">
                  {overview.byCourse.map((c) => `${c.courseName} ${c.count}건`).join(" · ")} — 마감 임박 과제부터 채점해 주세요.
                </p>
              </div>
            </div>
            <Button
              size="lg"
              className="bg-slate-800 text-white hover:bg-slate-700"
              onClick={() => overview.assignments[0] && selectAssignment(overview.assignments[0].assignmentId)}
            >
              전체 채점 시작 →
            </Button>
          </section>
        ) : overview ? (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
            ✅ 미채점 과제가 없습니다. 모든 채점이 완료되었습니다.
          </section>
        ) : null}

        {/* 미채점 과제 목록 */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">미채점 과제 목록</h2>
              <p className="text-xs text-slate-400">마감일 순</p>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {overview?.totalUngraded ?? 0}건 미채점
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="px-5 py-3 font-medium">과목</th>
                  <th className="px-5 py-3 font-medium">과제명</th>
                  <th className="px-5 py-3 font-medium">마감일</th>
                  <th className="px-5 py-3 font-medium">제출 수</th>
                  <th className="px-5 py-3 font-medium">미채점</th>
                  <th className="px-5 py-3 font-medium text-right">채점</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      불러오는 중…
                    </td>
                  </tr>
                ) : (
                  overview?.assignments.map((a) => (
                    <tr
                      key={a.assignmentId}
                      className={`border-b border-slate-50 last:border-0 ${
                        a.assignmentId === selectedId ? "bg-slate-50" : ""
                      }`}
                    >
                      <td className="px-5 py-3 font-medium text-slate-800">{a.courseName}</td>
                      <td className="px-5 py-3 text-slate-700">{a.title}</td>
                      <td className="px-5 py-3 text-slate-500">🕓 {a.dueDate}</td>
                      <td className="px-5 py-3 text-slate-700">{a.submittedCount}명</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                          {a.ungradedCount}명
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => selectAssignment(a.assignmentId)}>
                          채점하기 ›
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 채점 상세 */}
        {detail && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  {detail.courseName} — {detail.title}
                </h2>
                <p className="text-xs text-slate-400">
                  {detail.maxScore}점 만점 · 마감 {detail.dueDate}
                </p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  채점완료 {detail.gradedCount}
                </span>
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">
                  미채점 {detail.ungradedCount}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                    <th className="px-5 py-3 font-medium">학생</th>
                    <th className="px-5 py-3 font-medium">제출일시</th>
                    <th className="px-5 py-3 font-medium">파일</th>
                    <th className="px-5 py-3 font-medium">점수 / {detail.maxScore}</th>
                    <th className="px-5 py-3 font-medium">피드백</th>
                    <th className="px-5 py-3 font-medium text-right">저장</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.submissions.map((s) => {
                    const submitted = s.submittedAt != null && s.file != null;
                    return (
                      <tr
                        key={s.submissionId}
                        className={`border-b border-slate-50 last:border-0 ${
                          !submitted ? "bg-slate-50/60 text-slate-400" : ""
                        }`}
                      >
                        {/* 학생 */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${
                                submitted ? "bg-slate-700" : "bg-slate-300"
                              }`}
                            >
                              {s.studentName.trim()[0] ?? "?"}
                            </div>
                            <div>
                              <p className={submitted ? "font-medium text-slate-900" : "font-medium"}>
                                {s.studentName}
                              </p>
                              <p className="text-xs text-slate-400">{s.studentNo}</p>
                            </div>
                          </div>
                        </td>

                        {!submitted ? (
                          <td colSpan={5} className="px-5 py-3">
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
                              미제출
                            </span>
                          </td>
                        ) : (
                          <>
                            {/* 제출일시 */}
                            <td className="px-5 py-3 text-slate-500">{s.submittedAt}</td>
                            {/* 파일 */}
                            <td className="px-5 py-3">
                              <Button variant="outline" size="sm" onClick={() => openPreview(s)}>
                                👁 보기
                              </Button>
                            </td>
                            {/* 점수 */}
                            <td className="px-5 py-3">
                              <input
                                type="number"
                                min={0}
                                max={detail.maxScore}
                                value={s.score ?? ""}
                                onChange={(e) =>
                                  updateSubmission(s.submissionId, {
                                    score: e.target.value === "" ? null : Number(e.target.value),
                                  })
                                }
                                placeholder="–"
                                className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30"
                              />
                            </td>
                            {/* 피드백 */}
                            <td className="px-5 py-3">
                              <input
                                value={s.feedback}
                                onChange={(e) =>
                                  updateSubmission(s.submissionId, { feedback: e.target.value })
                                }
                                placeholder="피드백 입력…"
                                className="w-full min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30"
                              />
                            </td>
                            {/* 저장 / 완료 */}
                            <td className="px-5 py-3 text-right">
                              {s.graded ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSave(s)}
                                  className="border-emerald-300 text-emerald-700"
                                >
                                  ✓ 완료
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleSave(s)}
                                  className="bg-slate-800 text-white hover:bg-slate-700"
                                >
                                  저장
                                </Button>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* PLM-004-01 제출 파일 미리보기 모달 (이미지만) */}
      <SubmissionPreviewDialog
        open={previewOpen}
        submission={previewSub}
        onClose={() => setPreviewOpen(false)}
      />
    </main>
  );
}

const selectClass =
  "shrink-0 truncate rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30";
