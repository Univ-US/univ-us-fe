"use client";

import { useState } from "react";
import { X, Flag, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const REPORT_REASONS = [
  { label: "스팸/도배",           desc: "반복적인 광고성 게시물" },
  { label: "욕설/혐오 발언",      desc: "특정 대상을 향한 진함" },
  { label: "개인정보 노출",       desc: "명시적 개인정보 포함" },
  { label: "음란물/불건전한 내용", desc: "성적으로 유해한 콘텐츠" },
  { label: "사기/허위 정보",      desc: "거짓 정보 유포" },
  { label: "특정인 비방",         desc: "특정 인물을 향한 비방" },
  { label: "기타",               desc: "그 외 규정 위반 사항" },
];

export type ReportTargetType = "post" | "comment" | "product";

interface CommunityReportModalProps {
  targetType: ReportTargetType;
  targetId: number;
  onClose: (reported?: boolean) => void;
}

export default function CommunityReportModal({
  targetType,
  targetId,
  onClose,
}: CommunityReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const targetLabel = { post: "게시글", comment: "댓글", product: "상품" }[targetType];

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post(`/api/posts/${targetId}/report`, {
        reason: selectedReason,
        detail,
      });
      if (!res.data.success) {
        setErrorMsg(res.data.message);
        return;
      }
      setSubmitted(true);
      setTimeout(() => onClose(true), 1500);
    } catch {
      setErrorMsg("신고 접수 중 오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 딤 배경 */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => onClose()} />

      {/* 모달 */}
      <div className="fixed left-1/2 top-1/2 z-50 w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-white shadow-xl">

        {submitted ? (
          /* ── 완료 화면 ── */
          <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="size-8 text-primary" />
            </div>
            <div>
              <p className="text-[18px] font-extrabold text-slate-900">신고가 접수되었어요</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                검토 후 조치가 이루어질 예정이에요.<br />신고해주셔서 감사해요.
              </p>
            </div>
            <Button onClick={() => onClose()} className="mt-2 px-8">확인</Button>
          </div>
        ) : (
          <>
            {/* ── 헤더 ── */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-red-50">
                  <Flag className="size-4 text-red-500" />
                </div>
                <div>
                  <h2 className="text-[15px] font-extrabold text-slate-900">{targetLabel} 신고</h2>
                  <p className="text-[11px] text-slate-400">신고 사유를 선택해주세요</p>
                </div>
              </div>
              <button
                onClick={() => onClose()}
                className="flex size-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              {/* ── 경고 배너 ── */}
              <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <p className="text-[12px] leading-relaxed text-amber-700">
                  허위 신고 시 이용이 제한될 수 있어요. 신중하게 신고해주세요.
                </p>
              </div>

              {/* ── 신고 사유 ── */}
              <div className="mb-4 grid grid-cols-1 gap-1.5">
                {REPORT_REASONS.map(({ label, desc }) => (
                  <button
                    key={label}
                    onClick={() => setSelectedReason(label)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-all",
                      selectedReason === label
                        ? "border-red-300 bg-red-50"
                        : "border-border hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <span className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      selectedReason === label ? "border-red-500 bg-red-500" : "border-slate-300"
                    )}>
                      {selectedReason === label && (
                        <span className="size-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className={cn(
                        "text-[13px] font-semibold",
                        selectedReason === label ? "text-red-700" : "text-slate-700"
                      )}>
                        {label}
                      </p>
                      <p className="text-[11px] text-slate-400">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* ── 상세 내용 ── */}
              <div className="mb-5">
                <p className="mb-1.5 text-[12px] font-bold text-slate-600">
                  상세 내용 <span className="font-normal text-slate-400">(선택)</span>
                </p>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  placeholder="신고 내용을 자세히 적어주세요."
                  className="w-full resize-none rounded-xl border border-input bg-slate-50 px-3.5 py-3 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-slate-300 focus:border-primary focus:bg-white"
                />
              </div>

              {/* ── 에러 메시지 ── */}
              {errorMsg && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <Flag className="size-3.5 shrink-0 text-red-400" />
                  <p className="text-[12px] font-medium text-red-600">{errorMsg}</p>
                </div>
              )}

              {/* ── 버튼 ── */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onClose()} className="flex-1">
                  취소
                </Button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedReason || loading}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-bold transition-all",
                    selectedReason && !loading
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "cursor-not-allowed bg-slate-100 text-slate-400"
                  )}
                >
                  <Flag className="size-3.5" />
                  {loading ? "접수 중..." : "신고하기"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
