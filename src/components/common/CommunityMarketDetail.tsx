'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Eye,
  MapPin,
  Star,
  CreditCard,
  Flag,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CommunityMarketComment from '@/components/common/CommunityMarketComment';
import CommunityReportModal from '@/components/common/CommunityReportModal';
import {
  toggleProductLike,
  deleteProduct,
  getPaymentConfig,
  completePayment,
} from '@/lib/marketApi';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@/types/community';

interface PortOnePaymentRequest {
  pg: string;
  pay_method: string;
  merchant_uid: string;
  name: string;
  amount: number;
  buyer_name?: string;
}

interface PortOnePaymentResponse {
  imp_uid?: string;
  merchant_uid?: string;
  error_msg?: string;
}

interface PortOneSdk {
  init: (impCode: string) => void;
  request_pay: (
    paymentRequest: PortOnePaymentRequest,
    callback: (response: PortOnePaymentResponse) => void,
  ) => void;
}

declare global {
  interface Window {
    IMP?: PortOneSdk;
  }
}

const PORTONE_SCRIPT_SRC = 'https://cdn.iamport.kr/v1/iamport.js';

function loadPortOneScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.IMP) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PORTONE_SCRIPT_SRC}"]`,
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = PORTONE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.body.appendChild(script);
  });
}

function formatPrice(price: number) {
  return price === 0 ? '무료' : `${price.toLocaleString('ko-KR')}원`;
}

function StatusBadge({ status }: { status: Product['productStatus'] }) {
  const styles: Record<string, string> = {
    SALE: 'bg-emerald-100 text-emerald-700',
    RESERVE: 'bg-amber-100 text-amber-700',
    DONE: 'bg-slate-100 text-slate-500',
  };
  const labels: Record<string, string> = {
    SALE: '판매중',
    RESERVE: '예약중',
    DONE: '거래완료',
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${styles[status]}`}
    >
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
    <div
      className={cn(
        'flex items-center justify-center bg-gradient-to-br from-primary to-teal-700 text-6xl',
        sold && 'opacity-40',
        className,
      )}
    >
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
  const memberId = useAuthStore((s) => s.memberId);
  const role = useAuthStore((s) => s.role);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const sold = product.productStatus === 'DONE' || paymentDone;

  const isOwner = memberId === product.memberId;
  const canManageProduct = isOwner || role === 'SUA' || role === 'ADM';

  const handleDelete = async () => {
    if (!confirm('상품을 삭제할까요?')) return;
    try {
      await deleteProduct(product.productId);
      alert('상품이 삭제되었습니다.');
      onBack();
    } catch (err) {
      console.error('상품 삭제 실패:', err);
      alert('상품 삭제에 실패했어.');
    }
  };

  const handleToggleLike = async () => {
    if (!memberId) {
      alert('로그인이 필요해.');
      return;
    }
    if (likeLoading) return;
    // 낙관적 업데이트
    setLiked((prev) => !prev);
    setLikeLoading(true);
    try {
      const res = await toggleProductLike(product.productId, memberId);
      setLiked(res.liked);
    } catch (err) {
      console.error('찜 토글 실패:', err);
      setLiked((prev) => !prev);
    } finally {
      setLikeLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!memberId) {
      alert('로그인이 필요해.');
      return;
    }
    if (isOwner) {
      alert('본인 상품은 결제할 수 없어.');
      return;
    }
    if (sold || paymentLoading) return;

    setPaymentLoading(true);
    try {
      const paymentConfig = await getPaymentConfig();
      if (!paymentConfig.impCode) {
        throw new Error('PortOne 가맹점 식별코드가 설정되지 않았어.');
      }

      await loadPortOneScript();
      if (!window.IMP) {
        throw new Error('PortOne SDK를 불러오지 못했어.');
      }

      window.IMP.init(paymentConfig.impCode);
      window.IMP.request_pay(
        {
          pg: 'html5_inicis',
          pay_method: 'card',
          merchant_uid: `product_${product.productId}_${Date.now()}`,
          name: product.productName,
          amount: product.price,
          buyer_name: 'Buyer',
        },
        async (response) => {
          if (!response.imp_uid || !response.merchant_uid) {
            alert(response.error_msg ?? '결제가 완료되지 않았어.');
            setPaymentLoading(false);
            return;
          }

          try {
            await completePayment({
              productId: product.productId,
              buyerId: memberId,
              impUid: response.imp_uid,
              merchantUid: response.merchant_uid,
            });
            setPaymentDone(true);
            alert('결제가 완료됐어.');
          } catch (err) {
            console.error('결제 검증 실패:', err);
            alert('결제는 요청됐지만 서버 검증에 실패했어.');
          } finally {
            setPaymentLoading(false);
          }
        },
      );
    } catch (err) {
      console.error('결제 요청 실패:', err);
      alert(err instanceof Error ? err.message : '결제 요청에 실패했어.');
      setPaymentLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-[30px] py-7">
        <div className="mx-auto max-w-[920px]">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="size-4" /> 중고거래 홈
          </button>

          <div className="flex items-start gap-6">
            <div className="w-[400px] shrink-0">
              <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                <ProductThumb className="aspect-square" sold={sold} />
              </div>
              <div className="mt-2.5 flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'size-[70px] overflow-hidden rounded-xl border-2 transition-all',
                      i === 0
                        ? 'border-primary shadow-sm'
                        : 'border-transparent opacity-50 hover:opacity-75',
                    )}
                  >
                    <ProductThumb className="size-full" />
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <StatusBadge status={product.productStatus} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                      {product.category}
                    </span>
                  </div>

                  <h2 className="mb-2 text-[18px] font-bold leading-snug tracking-tight text-slate-900">
                    {product.productName}
                  </h2>

                  <div className="mb-3 text-[20px] font-extrabold tracking-tight text-slate-900">
                    {formatPrice(product.price)}
                  </div>

                  <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Eye className="size-3.5" />
                      조회 {product.viewCount}
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

                  <p className="mb-5 text-[13px] leading-relaxed text-slate-500">
                    {product.description ?? '상품 설명이 여기에 표시됩니다.'}
                  </p>

                  <div className="flex items-center gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3">
                    <div className="flex size-[32px] items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">
                      {product.sellerName.slice(0, 1)}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-slate-800">
                        {product.sellerName}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="size-3" />
                        {product.place}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-[12.5px] font-bold text-slate-700">
                        4.8
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {canManageProduct ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => window.location.href = `/community/market/write?productId=${product.productId}`}
                          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                        >
                          <Pencil className="size-3.5" />
                          수정하기
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="size-3.5" />
                          삭제하기
                        </button>
                      </div>
                    ) : (
                      <div />
                    )}
                    <button
                      onClick={() => setReporting(true)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Flag className="size-3.5" />
                      신고하기
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={handleToggleLike}
                      disabled={sold || likeLoading}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-semibold transition-all disabled:opacity-40',
                        liked
                          ? 'border-red-300 bg-red-50 text-red-500'
                          : 'border-border bg-white text-slate-500 hover:border-red-300 hover:text-red-500',
                      )}
                    >
                      <Heart
                        className={cn('size-4', liked && 'fill-current')}
                      />
                      관심 {product.likeCount + (liked ? 1 : 0)}
                    </button>

                    <button
                      disabled={sold}
                      onClick={() => alert('채팅 기능은 추후 연결 예정입니다.')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary py-2 text-[13px] font-semibold text-primary transition-all hover:bg-primary/5 disabled:opacity-40"
                    >
                      <MessageCircle className="size-4" />
                      채팅으로 거래하기
                    </button>

                    <button
                      disabled={sold || isOwner || paymentLoading}
                      onClick={handlePayment}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-teal-600 disabled:opacity-40"
                    >
                      <CreditCard className="size-4" />
                      {paymentLoading ? '결제 처리중' : '결제하기'}
                    </button>
                  </div>
                </div>
              </div>

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
