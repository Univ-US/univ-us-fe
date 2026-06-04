"use client";

import { useState } from "react";
import {
  ArrowLeft, Heart, MessageCircle, Eye,
  MapPin, Star, CreditCard, Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import CommunityMarketComment from "@/components/common/CommunityMarketComment";
import CommunityReportModal from "@/components/common/CommunityReportModal";
import type { Product } from "@/types/community";

function formatPrice(price: number) {
  return price === 0 ? "나눔" : price.toLocaleString("ko-KR") + "원";
}

function StatusBadge({ status }: { status: Product["productStatus"] }) {
  const styles: Record<string, string> = {
    SALE:    "bg-emerald-100 text-emerald-700",
    RESERVE: "bg-amber-100 text-amber-700",
    DONE:    "bg-slate-100 text-slate-500",
  };
  const labels: Record<string, string> = {
    SALE:    "판매중",
    RESERVE: "예약중",
    DONE:    "거래완료",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ProductThumb({
  className,
  sold,
}: {
  className?: string;
  sold?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-center bg-gradient-to-br from-primary to-teal-700 text-6xl",
      sold && "opacity-40",
      className
    )}>
      🛍️
    </div>
  );
}

interface CommunityMarketDetailProps {
  product: Product;
  onBack: () => void;
}

export default function CommunityMarketDetail({
  product,
  onBack,
}: CommunityMarketDetailProps) {
  const [liked, setLiked] = useState(false);
  const [reporting, setReporting] = useState(false);
  const sold = product.productStatus === "DONE";

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-[30px] py-7">
        <div className="mx-auto max-w-[920px]">

          {/* 뒤로가기 */}
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="size-4" /> 중고거래 홈
          </button>

          <div className="flex items-start gap-6">

            {/* 좌측 - 이미지 */}
            <div className="w-[400px] shrink-0">
              <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                <ProductThumb className="aspect-square" sold={sold} />
              </div>
              {/* 서브 이미지 */}
              <div className="mt-2.5 flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "size-[70px] overflow-hidden rounded-xl border-2 transition-all",
                      i === 0
                        ? "border-primary shadow-sm"
                        : "border-transparent opacity-50 hover:opacity-75"
                    )}
                  >
                    <ProductThumb className="size-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* 우측 - 상품 정보 */}
            <div className="min-w-0 flex-1">
              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="p-5">

                  {/* 상태 + 카테고리 */}
                  <div className="mb-3 flex items-center justify-between">
                    <StatusBadge status={product.productStatus} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                      {product.category}
                    </span>
                  </div>

                  {/* 상품명 */}
                  <h2 className="mb-2 text-[21px] font-bold leading-snug tracking-tight text-slate-900">
                    {product.productName}
                  </h2>

                  {/* 가격 */}
                  <div className="mb-3 text-[28px] font-extrabold tracking-tight text-slate-900">
                    {formatPrice(product.price)}
                  </div>

                  {/* 조회/관심/채팅 */}
                  <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Eye className="size-3.5" />조회 {product.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="size-3.5" />
                      관심 {product.likeCount + (liked ? 1 : 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-3.5" />
                      채팅 {product.chatCount}
                    </span>
                  </div>

                  {/* 설명 */}
                  <p className="mb-5 text-sm leading-relaxed text-slate-500">
                    {product.description ?? "상품 설명이 여기에 표시됩니다."}
                  </p>

                  {/* 판매자 정보 */}
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3">
                    <div className="flex size-[38px] items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">
                      {product.sellerName.slice(0, 1)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-800">
                        {product.sellerName}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="size-3" />
                        {product.place}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      <span className="text-[13px] font-bold text-slate-700">4.8</span>
                    </div>
                  </div>

                  {/* 신고 */}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setReporting(true)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Flag className="size-3.5" />
                      신고하기
                    </button>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => setLiked(!liked)}
                      disabled={sold}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-40",
                        liked
                          ? "border-red-300 bg-red-50 text-red-500"
                          : "border-border bg-white text-slate-500 hover:border-red-300 hover:text-red-500"
                      )}
                    >
                      <Heart className={cn("size-4", liked && "fill-current")} />
                      관심 {product.likeCount + (liked ? 1 : 0)}
                    </button>

                    <button
                      disabled={sold}
                      onClick={() => alert("채팅 기능은 추후 연결 예정입니다.")}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/5 disabled:opacity-40"
                    >
                      <MessageCircle className="size-4" />
                      채팅으로 거래하기
                    </button>

                    <button
                      disabled={sold}
                      onClick={() => alert("결제 기능은 추후 연결 예정입니다.")}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-600 disabled:opacity-40"
                    >
                      <CreditCard className="size-4" />
                      결제하기
                    </button>
                  </div>

                </div>
              </div>

              {/* 문의 댓글 */}
              <CommunityMarketComment productId={product.productId} />

            </div>
          </div>
        </div>
      </div>

      {reporting && (
        <CommunityReportModal
          targetType="product"
          targetId={product.productId}
          onClose={() => setReporting(false)}
        />
      )}
    </>
  );
}