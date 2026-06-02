"use client";

import { useState } from "react";
import { X, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── 신고 사유 목록 ─────────────────────────────────────
const REPORT_REASONS = [
  "스팸/도배",
  "욕설/혐오 발언",
  "개인정보 노출",
  "음란물/불건전한 내용",
  "사기/허위 정보",
  "특정인 비방",
  "기타",
];

// ── 신고 대상 타입 ─────────────────────────────────────
export type ReportTargetType = "post" | "comment" | "product";

interface CommunityReportModalProps {
  targetType: ReportTargetType;
  targetId: number;
  onClose: () => void;
}

export default function CommunityReportModal({
  targetType,
  targetId,
  onClose,
}: CommunityReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const targetLabel = {
    post: "게시글",
    comment: "댓글",
    product: "상품",
  }[targetType];

  const handleSubmit = () => {
    if (!selectedReason) {
      alert("신고 사유를 선택해주세요.");
      return;
    }
    // TODO: axios로 POST /api/reports 호출
    console.log({ targetType, targetId, selectedReason, detail });
    setSubmitted(true);
  };

  return (
    <>
      {/* 딤 배경 */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg">

        {/* 헤더 */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="size-5 text-red-500" />
            <h2 className="text-lg font-extrabold">{targetLabel} 신고</h2>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 완료 화면 */}
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-red-50">
              <Flag className="size-7 text-red-500" />
            </div>
            <div>
              <p className="text-[17px] font-extrabold">신고가 접수되었어요</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                검토 후 조치가 이루어질 예정이에요.
              </p>
            </div>
            <Button onClick={onClose}>확인</Button>
          </div>
        ) : (
          <>
            {/* 신고 사유 선택 */}
            <div className="mb-4">
              <p className="mb-2.5 text-[13.5px] font-bold">신고 사유</p>
              <div className="flex flex-col gap-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                      selectedReason === reason
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-border hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                        selectedReason === reason
                          ? "border-red-500 bg-red-500"
                          : "border-slate-300"
                      )}
                    >
                      {selectedReason === reason && (
                        <span className="size-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* 상세 내용 */}
            <div className="mb-5">
              <p className="mb-2.5 text-[13.5px] font-bold">
                상세 내용{" "}
                <span className="font-normal text-muted-foreground">(선택)</span>
              </p>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                placeholder="신고 내용을 자세히 적어주세요."
                className="w-full rounded-lg border border-input bg-background px-3.5 py-3 text-[14px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>취소</Button>
              <Button
                onClick={handleSubmit}
                className="bg-red-500 hover:bg-red-600"
              >
                <Flag className="size-4" />
                신고하기
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}