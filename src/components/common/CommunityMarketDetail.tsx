'use client';

import { useEffect, useState } from 'react';
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
  Landmark,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CommunityMarketComment from '@/components/common/CommunityMarketComment';
import CommunityReportModal from '@/components/common/CommunityReportModal';
import { AxiosError } from 'axios';
import { API_BASE_URL } from '@/lib/api';
import {
  toggleProductLike,
  getProductLikeStatus,
  deleteProduct,
  getPaymentConfig,
  completePayment,
} from '@/lib/marketApi';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@/types/community';

interface PortOnePaymentRequest {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: 'CURRENCY_KRW';
  payMethod: PortOnePayMethod;
  customer: {
    fullName: string;
    email: string;
    phoneNumber: string;
  };
}

interface PortOnePaymentResponse {
  code?: string;
  message?: string;
  paymentId?: string;
}

interface PortOneSdk {
  requestPayment: (
    paymentRequest: PortOnePaymentRequest,
  ) => Promise<PortOnePaymentResponse>;
}

declare global {
  interface Window {
    PortOne?: PortOneSdk;
  }
}

const PORTONE_SCRIPT_SRC = 'https://cdn.portone.io/v2/browser-sdk.js';

type PaymentMethod = 'card' | 'trans' | 'kakaopay';
type PortOnePayMethod = 'CARD' | 'TRANSFER' | 'EASY_PAY';

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  description: string;
  channelKeyType: 'kgInicisChannelKey' | 'kakaoPayChannelKey';
  payMethod: PortOnePayMethod;
  Icon: typeof CreditCard;
}[] = [
  {
    value: 'card',
    label: '카드',
    description: '신용/체크카드',
    channelKeyType: 'kgInicisChannelKey',
    payMethod: 'CARD',
    Icon: CreditCard,
  },
  {
    value: 'trans',
    label: '계좌이체',
    description: '실시간 이체',
    channelKeyType: 'kgInicisChannelKey',
    payMethod: 'TRANSFER',
    Icon: Landmark,
  },
  {
    value: 'kakaopay',
    label: '카카오페이',
    description: '간편결제',
    channelKeyType: 'kakaoPayChannelKey',
    payMethod: 'EASY_PAY',
    Icon: Wallet,
  },
];

const resolveImageUrl = (url: string) =>
  url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

function loadPortOneScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.PortOne) {
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

function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? fallbackMessage;
  }
  return fallbackMessage;
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
  imageUrl,
  sold,
}: {
  className?: string;
  imageUrl?: string;
  sold?: boolean;
}) {
  if (imageUrl) {
    return (
      <div
        className={cn(
          'overflow-hidden bg-slate-100',
          sold && 'opacity-40',
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveImageUrl(imageUrl)}
          alt="상품 이미지"
          className="size-full object-cover"
        />
      </div>
    );
  }

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
  const [likeCount, setLikeCount] = useState(product.likeCount);
  const [likeLoading, setLikeLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const sold = product.productStatus === 'DONE' || paymentDone;
  const productImages = product.images ?? [];
  const selectedImage = productImages[selectedImageIndex] ?? productImages[0];

  const isOwner = memberId === product.memberId;
  const canManageProduct = isOwner || role === 'SUA' || role === 'ADM';

  useEffect(() => {
    setLikeCount(product.likeCount);

    if (!memberId) {
      setLiked(false);
      return;
    }

    let ignore = false;
    getProductLikeStatus(product.productId)
      .then((res) => {
        if (ignore) return;
        setLiked(res.liked);
        setLikeCount(res.likeCount);
      })
      .catch((err) => {
        console.error('찜 상태 조회 실패:', err);
      });

    return () => {
      ignore = true;
    };
  }, [memberId, product.likeCount, product.productId]);

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
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));
    setLikeLoading(true);
    try {
      const res = await toggleProductLike(product.productId, memberId);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (err) {
      console.error('찜 토글 실패:', err);
      setLiked(liked);
      setLikeCount((prev) => Math.max(0, prev + (nextLiked ? -1 : 1)));
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
      if (!paymentConfig.storeId) {
        throw new Error('PortOne 상점 ID가 설정되지 않았어.');
      }

      await loadPortOneScript();
      if (!window.PortOne) {
        throw new Error('PortOne SDK를 불러오지 못했어.');
      }

      const selectedPaymentMethod =
        PAYMENT_METHODS.find((method) => method.value === paymentMethod) ??
        PAYMENT_METHODS[0];
      const channelKey = paymentConfig[selectedPaymentMethod.channelKeyType];
      if (!channelKey) {
        throw new Error(`${selectedPaymentMethod.label} 채널키가 설정되지 않았어.`);
      }
      const paymentId = `market_${product.productId}_${Date.now()}`;
      const customerEmail =
        localStorage.getItem('memberEmail') ?? `member${memberId}@univus.test`;
      const customerName =
        localStorage.getItem('memberName') ?? `member-${memberId}`;
      const customerPhoneNumber =
        localStorage.getItem('memberPhoneNumber') ?? '01012345678';

      const response = await window.PortOne.requestPayment({
        storeId: paymentConfig.storeId,
        channelKey,
        paymentId,
        orderName: product.productName,
        totalAmount: product.price,
        currency: 'CURRENCY_KRW',
        payMethod: selectedPaymentMethod.payMethod,
        customer: {
          fullName: customerName,
          email: customerEmail,
          phoneNumber: customerPhoneNumber,
        },
      });

      if (response.code) {
        alert(response.message ?? '결제가 완료되지 않았어.');
        setPaymentLoading(false);
        return;
      }

      try {
        await completePayment({
          productId: product.productId,
          paymentId: response.paymentId ?? paymentId,
        });
        setPaymentDone(true);
        alert('결제가 완료됐어.');
      } catch (err) {
        console.error('결제 검증 실패:', err);
        alert(getApiErrorMessage(err, '결제는 요청됐지만 서버 검증에 실패했어.'));
      } finally {
        setPaymentLoading(false);
      }
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
                <ProductThumb
                  className="aspect-square"
                  imageUrl={selectedImage?.imageUrl}
                  sold={sold}
                />
              </div>
              {productImages.length > 0 && (
                <div className="mt-2.5 flex gap-2">
                  {productImages.map((image, i) => (
                    <button
                      key={image.imageId}
                      type="button"
                      onClick={() => setSelectedImageIndex(i)}
                      className={cn(
                        'size-[70px] overflow-hidden rounded-xl border-2 transition-all',
                        i === selectedImageIndex
                          ? 'border-primary shadow-sm'
                          : 'border-transparent opacity-60 hover:opacity-90',
                      )}
                    >
                      <ProductThumb
                        className="size-full"
                        imageUrl={image.imageUrl}
                        sold={sold}
                      />
                    </button>
                  ))}
                </div>
              )}
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
                      관심 {likeCount}
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
                      관심 {likeCount}
                    </button>

                    <button
                      disabled={sold}
                      onClick={() => alert('채팅 기능은 추후 연결 예정입니다.')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary py-2 text-[13px] font-semibold text-primary transition-all hover:bg-primary/5 disabled:opacity-40"
                    >
                      <MessageCircle className="size-4" />
                      채팅으로 거래하기
                    </button>
                  </div>

                  {!canManageProduct && !sold && (
                    <div className="mt-3 rounded-xl border border-border bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[12px] font-bold text-slate-700">
                          결제수단
                        </span>
                        <span className="text-[12px] font-bold text-slate-900">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {PAYMENT_METHODS.map(({ value, label, description, Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setPaymentMethod(value)}
                            className={cn(
                              'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-lg border bg-white px-2 py-2 text-center transition-all',
                              paymentMethod === value
                                ? 'border-primary text-primary shadow-sm'
                                : 'border-border text-slate-500 hover:border-primary/60 hover:text-primary',
                            )}
                          >
                            <Icon className="size-4" />
                            <span className="text-[12px] font-bold leading-none">
                              {label}
                            </span>
                            <span className="text-[10px] leading-none text-slate-400">
                              {description}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        disabled={paymentLoading}
                        onClick={handlePayment}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-teal-600 disabled:opacity-40"
                      >
                        <CreditCard className="size-4" />
                        {paymentLoading ? '결제 처리중' : `${formatPrice(product.price)} 결제하기`}
                      </button>
                    </div>
                  )}
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
