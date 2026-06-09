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
      ?썚截?    </div>
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
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const sold = product.productStatus === 'DONE' || paymentDone;

  const isOwner = memberId === product.memberId;

  const handleDelete = async () => {
    if (!confirm('?곹뭹????젣?좉퉴??')) return;
    try {
      await deleteProduct(product.productId);
      alert('?곹뭹????젣?섏뿀?듬땲??');
      onBack();
    } catch (err) {
      console.error('?곹뭹 ??젣 ?ㅽ뙣:', err);
      alert('?곹뭹 ??젣???ㅽ뙣?덉뼱.');
    }
  };

  const handleToggleLike = async () => {
    if (!memberId) {
      alert('濡쒓렇?몄씠 ?꾩슂??');
      return;
    }
    if (likeLoading) return;
    // ?숆????낅뜲?댄듃
    setLiked((prev) => !prev);
    setLikeLoading(true);
    try {
      const res = await toggleProductLike(product.productId, memberId);
      setLiked(res.liked);
    } catch (err) {
      console.error('李??좉? ?ㅽ뙣:', err);
      setLiked((prev) => !prev); // 濡ㅻ갚
    } finally {
      setLikeLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!memberId) {
      alert('濡쒓렇?몄씠 ?꾩슂??');
      return;
    }
    if (isOwner) {
      alert('蹂몄씤 ?곹뭹? 寃곗젣?????놁뼱.');
      return;
    }
    if (sold || paymentLoading) return;

    setPaymentLoading(true);
    try {
      const paymentConfig = await getPaymentConfig();
      if (!paymentConfig.impCode) {
        throw new Error('?ы듃??媛留뱀젏 ?앸퀎肄붾뱶媛 ?ㅼ젙?섏? ?딆븯??');
      }

      await loadPortOneScript();
      if (!window.IMP) {
        throw new Error('?ы듃??SDK瑜?遺덈윭?ㅼ? 紐삵뻽??');
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
            alert(response.error_msg ?? '寃곗젣媛 ?꾨즺?섏? ?딆븯??');
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
            alert('寃곗젣媛 ?꾨즺?먯뼱.');
          } catch (err) {
            console.error('寃곗젣 寃利??ㅽ뙣:', err);
            alert('寃곗젣???붿껌?먯?留??쒕쾭 寃利앹뿉 ?ㅽ뙣?덉뼱.');
          } finally {
            setPaymentLoading(false);
          }
        },
      );
    } catch (err) {
      console.error('寃곗젣 ?붿껌 ?ㅽ뙣:', err);
      alert(err instanceof Error ? err.message : '寃곗젣 ?붿껌???ㅽ뙣?덉뼱.');
      setPaymentLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-[30px] py-7">
        <div className="mx-auto max-w-[920px]">
          {/* ?ㅻ줈媛湲?*/}
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="size-4" /> 以묎퀬嫄곕옒 ??          </button>

          <div className="flex items-start gap-6">
            {/* 醫뚯륫 - ?대?吏 */}
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

            {/* ?곗륫 - ?곹뭹 ?뺣낫 */}
            <div className="min-w-0 flex-1">
              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="p-5">
                  {/* ?곹깭 + 移댄뀒怨좊━ */}
                  <div className="mb-3 flex items-center justify-between">
                    <StatusBadge status={product.productStatus} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                      {product.category}
                    </span>
                  </div>

                  {/* ?곹뭹紐?*/}
                  <h2 className="mb-2 text-[18px] font-bold leading-snug tracking-tight text-slate-900">
                    {product.productName}
                  </h2>

                  {/* 媛寃?*/}
                  <div className="mb-3 text-[20px] font-extrabold tracking-tight text-slate-900">
                    {formatPrice(product.price)}
                  </div>

                  {/* 議고쉶/愿??梨꾪똿 */}
                  <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Eye className="size-3.5" />
                      議고쉶 {product.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="size-3.5" />
                      愿??{product.likeCount + (liked ? 1 : 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-3.5" />
                      梨꾪똿 {product.chatCount}
                    </span>
                  </div>

                  {/* ?ㅻ챸 */}
                  <p className="mb-5 text-[13px] leading-relaxed text-slate-500">
                    {product.description ?? '?곹뭹 ?ㅻ챸???ш린???쒖떆?⑸땲??'}
                  </p>

                  {/* ?먮ℓ???뺣낫 */}
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

                  {/* ?좉퀬 / ??젣 */}
                  <div className="mt-3 flex items-center justify-between">
                    {isOwner ? (
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" />
                        ??젣?섍린
                      </button>
                    ) : (
                      <div />
                    )}
                    <button
                      onClick={() => setReporting(true)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Flag className="size-3.5" />
                      ?좉퀬?섍린
                    </button>
                  </div>

                  {/* ?≪뀡 踰꾪듉 */}
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
                      愿??{product.likeCount + (liked ? 1 : 0)}
                    </button>

                    <button
                      disabled={sold}
                      onClick={() => alert('梨꾪똿 湲곕뒫? 異뷀썑 ?곌껐 ?덉젙?낅땲??')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary py-2 text-[13px] font-semibold text-primary transition-all hover:bg-primary/5 disabled:opacity-40"
                    >
                      <MessageCircle className="size-4" />
                      梨꾪똿?쇰줈 嫄곕옒?섍린
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

              {/* 臾몄쓽 ?볤? */}
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
