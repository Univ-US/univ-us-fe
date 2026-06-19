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
  PackageOpen,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CommunityMarketComment from '@/components/common/CommunityMarketComment';
import CommunityMarketChatDrawer from '@/components/common/CommunityMarketChatDrawer';
import CommunityReportModal from '@/components/common/CommunityReportModal';
import { Button } from '@/components/ui/button';
import { AxiosError } from 'axios';
import { API_BASE_URL } from '@/lib/api';
import {
  toggleProductLike,
  getProductLikeStatus,
  deleteProduct,
  getPaymentConfig,
  completePayment,
  completeFreeProduct,
  getProductReportStatus,
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
      className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold ${styles[status]}`}
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
          className="size-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-slate-100 text-primary transition-transform duration-300 group-hover/thumb:scale-105',
        sold && 'opacity-40',
        className,
      )}
    >
      <PackageOpen className="size-14" />
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
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [reportToast, setReportToast] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [freeCompleteLoading, setFreeCompleteLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTargetProduct, setChatTargetProduct] = useState<Product | null>(null);
  const [productStatus, setProductStatus] =
    useState<Product['productStatus']>(product.productStatus);
  const effectiveProductStatus: Product['productStatus'] = paymentDone
    ? 'DONE'
    : productStatus;
  const sold = effectiveProductStatus === 'DONE';
  const isFreeSharing = product.price <= 0;
  const purchasable = effectiveProductStatus === 'SALE' && !paymentDone;
  const productImages = product.images ?? [];
  const selectedImage = productImages[selectedImageIndex] ?? productImages[0];

  const isOwner = memberId === product.memberId;
  const isAdminUser = role === 'SUA' || role === 'ADM';
  const canReactToProduct = !isOwner && !isAdminUser;
  const canManageProduct = isOwner || role === 'SUA' || role === 'ADM';
  const canCompleteFreeSharing = isOwner && isFreeSharing && !sold;

  const handleReportClick = () => {
    if (isOwner) return;
    if (isAdminUser) return;
    if (alreadyReported) {
      setReportToast(true);
      setTimeout(() => setReportToast(false), 3000);
      return;
    }
    setReporting(true);
  };

  const handleOpenChat = () => {
    if (!memberId) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (isOwner) {
      setChatTargetProduct(null);
      setChatOpen(true);
      return;
    }
    if (sold) {
      return;
    }

    setChatTargetProduct(product);
    setChatOpen(true);
  };

  useEffect(() => {
    setProductStatus(product.productStatus);
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

    getProductReportStatus(product.productId)
      .then((res) => {
        if (ignore) return;
        setAlreadyReported(res.reported);
      })
      .catch((err) => {
        console.error('상품 신고 상태 조회 실패:', err);
      });

    return () => {
      ignore = true;
    };
  }, [memberId, product.likeCount, product.productId, product.productStatus]);

  const handleDelete = async () => {
    if (!confirm('상품을 삭제할까요?')) return;
    try {
      await deleteProduct(product.productId);
      alert('상품이 삭제되었습니다.');
      onBack();
    } catch (err) {
      console.error('상품 삭제 실패:', err);
      alert('상품 삭제에 실패했습니다.');
    }
  };

  if (product.isBlind) {
    return (
      <div className="min-h-screen bg-slate-50 px-[30px] py-7">
        <div className="mx-auto max-w-[920px]">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="size-4" /> 목록으로
          </button>
          <div className="flex flex-col items-center rounded-2xl border border-border bg-white p-14 text-center shadow-sm">
            <span className="flex size-14 items-center justify-center rounded-full bg-red-50">
              <EyeOff className="size-[26px] text-red-400" />
            </span>
            <h2 className="mb-2 mt-4 text-[16px] font-extrabold text-slate-800">
              블라인드 처리된 상품입니다.
            </h2>
            <p className="mx-auto max-w-[360px] text-[13px] leading-relaxed text-slate-400">
              신고가 <b className="text-red-500">{product.reportCount ?? 5}회</b> 누적되어
              자동으로 가려진 상품입니다.
              <br /> 이용이 제한됩니다.
            </p>
            {isOwner ? (
              <Button className="mt-6 bg-red-500 hover:bg-red-600" onClick={handleDelete}>
                삭제하기
              </Button>
            ) : (
              <Button variant="outline" className="mt-6" onClick={onBack}>
                목록으로 돌아가기
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleToggleLike = async () => {
    if (isOwner) return;
    if (isAdminUser) return;
    if (!memberId) {
      alert('로그인이 필요합니다.');
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

  const handleCompleteFreeSharing = async () => {
    if (!canCompleteFreeSharing || freeCompleteLoading) return;
    if (!confirm('무료 나눔을 완료 처리할까요?')) return;

    setFreeCompleteLoading(true);
    try {
      const response = await completeFreeProduct(product.productId);
      setProductStatus(response.product.productStatus);
      alert('나눔완료로 변경되었습니다.');
    } catch (err) {
      console.error('나눔완료 처리 실패:', err);
      alert(getApiErrorMessage(err, '나눔완료 처리에 실패했습니다.'));
    } finally {
      setFreeCompleteLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!memberId) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (isOwner) {
      alert('본인 상품은 결제할 수 없습니다.');
      return;
    }
    if (effectiveProductStatus !== 'SALE') {
      alert('판매중인 상품만 결제할 수 있습니다.');
      return;
    }
    if (isFreeSharing) {
      alert('무료 나눔 상품은 결제 없이 판매자가 나눔완료 처리합니다.');
      return;
    }
    if (sold || paymentLoading) return;

    setPaymentLoading(true);
    try {
      const paymentConfig = await getPaymentConfig();
      if (!paymentConfig.storeId) {
        throw new Error('PortOne 상점 ID가 설정되지 않았습니다.');
      }

      await loadPortOneScript();
      if (!window.PortOne) {
        throw new Error('PortOne SDK를 불러오지 못했습니다.');
      }

      const selectedPaymentMethod =
        PAYMENT_METHODS.find((method) => method.value === paymentMethod) ??
        PAYMENT_METHODS[0];
      const channelKey = paymentConfig[selectedPaymentMethod.channelKeyType];
      if (!channelKey) {
        throw new Error(`${selectedPaymentMethod.label} 채널키가 설정되지 않았습니다.`);
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
        alert(response.message ?? '결제가 완료되지 않았습니다.');
        setPaymentLoading(false);
        return;
      }

      try {
        await completePayment({
          productId: product.productId,
          paymentId: response.paymentId ?? paymentId,
        });
        setPaymentDone(true);
        alert('결제가 완료되었습니다.');
      } catch (err) {
        console.error('결제 검증 실패:', err);
        alert(getApiErrorMessage(err, '결제는 요청됐지만 서버 검증에 실패했습니다.'));
      } finally {
        setPaymentLoading(false);
      }
    } catch (err) {
      console.error('결제 요청 실패:', err);
      alert(err instanceof Error ? err.message : '결제 요청에 실패했습니다.');
      setPaymentLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-[30px] py-7">
        <div className="mx-auto max-w-[1080px]">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="size-4" /> 중고거래 홈
          </button>

          <div className="grid grid-cols-[460px_1fr] items-start gap-6">
            <div className="shrink-0">
              <div className="group/thumb overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
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
                        'group/thumb size-[72px] overflow-hidden rounded-lg border-2 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-105',
                        i === selectedImageIndex
                          ? 'scale-[1.03] border-primary shadow-sm'
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
              <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                <div className="p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <StatusBadge status={effectiveProductStatus} />
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                      {product.category}
                    </span>
                  </div>

                  <h2 className="mb-2 text-[22px] font-extrabold leading-snug tracking-tight text-slate-900">
                    {product.productName}
                  </h2>

                  <div className="mb-4 text-[24px] font-extrabold tracking-tight text-slate-900">
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

                  <p className="mb-5 min-h-[96px] rounded-lg border border-border bg-slate-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
                    {product.description ?? '상품 설명이 여기에 표시됩니다.'}
                  </p>

                  <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md">
                    <div className="flex size-[34px] items-center justify-center rounded-md bg-primary text-sm font-bold text-white shadow-sm transition-transform duration-200 hover:scale-105">
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
                          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-primary active:translate-y-0"
                        >
                          <Pencil className="size-3.5" />
                          수정하기
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-red-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 active:translate-y-0"
                        >
                          <Trash2 className="size-3.5" />
                          삭제하기
                        </button>
                      </div>
                    ) : (
                      <div />
                    )}
                    <button
                      onClick={handleReportClick}
                      disabled={!canReactToProduct}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 active:translate-y-0',
                        !canReactToProduct
                          ? 'cursor-not-allowed text-slate-300'
                          : 'text-slate-500 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-700',
                      )}
                    >
                      <Flag className="size-3.5" />
                      {isOwner ? '내 상품' : isAdminUser ? '관리자 계정' : alreadyReported ? '신고완료' : '신고하기'}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {!canReactToProduct ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-4 py-2 text-[13px] font-semibold text-slate-500">
                        <Heart className="size-4" />
                        관심 {likeCount}
                      </div>
                    ) : (
                      <button
                        onClick={handleToggleLike}
                        disabled={sold || likeLoading}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40',
                          liked
                            ? 'border-red-300 bg-red-50 text-red-500'
                            : 'border-border bg-white text-slate-500 hover:border-red-300 hover:text-red-500',
                        )}
                      >
                        <Heart
                          className={cn('size-4 transition-transform duration-200', liked && 'fill-current scale-110')}
                        />
                        관심 {likeCount}
                      </button>
                    )}

                    <button
                      disabled={sold && !isOwner}
                      onClick={handleOpenChat}
                      className="relative flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary py-2 text-[13px] font-semibold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-sm active:translate-y-0 disabled:opacity-40"
                    >
                      <MessageCircle className="size-4" />
                      {product.hasUnreadTradeChat && (
                        <span className="absolute right-3 top-2 size-2.5 rounded-full bg-primary shadow-sm shadow-primary/30 ring-2 ring-white" />
                      )}
                      {isOwner ? '내 채팅방 보기' : isFreeSharing ? '무료 나눔 채팅하기' : '채팅으로 거래하기'}
                    </button>
                  </div>

                  {!canManageProduct && !purchasable && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-700">
                      {effectiveProductStatus === 'RESERVE'
                        ? '예약중인 상품은 결제할 수 없습니다.'
                        : '거래가 완료된 상품입니다.'}
                    </div>
                  )}

                  {canCompleteFreeSharing && (
                    <button
                      type="button"
                      onClick={() => void handleCompleteFreeSharing()}
                      disabled={freeCompleteLoading}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-600 hover:shadow-md active:translate-y-0 disabled:opacity-40"
                    >
                      <PackageOpen className="size-4" />
                      {freeCompleteLoading ? '처리중' : '나눔완료'}
                    </button>
                  )}

                  {!canManageProduct && purchasable && isFreeSharing && (
                    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-[13px] font-semibold text-primary">
                      무료 나눔 상품입니다. 결제 없이 판매자가 나눔완료를 누르면 거래가 완료됩니다.
                    </div>
                  )}

                  {!canManageProduct && purchasable && !isFreeSharing && (
                    <div className="mt-3 rounded-lg border border-border bg-slate-50 p-3">
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
                              'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-lg border bg-white px-2 py-2 text-center transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110',
                              paymentMethod === value
                                ? 'scale-[1.02] border-primary text-primary shadow-sm'
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
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-600 hover:shadow-md active:translate-y-0 disabled:opacity-40"
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
          onClose={(reported?: boolean, blind?: boolean) => {
            setReporting(false);
            if (reported) setAlreadyReported(true);
            if (blind) onBack();
          }}
        />
      )}

      <CommunityMarketChatDrawer
        open={chatOpen}
        targetProduct={chatTargetProduct}
        onClose={() => setChatOpen(false)}
        onRoomCreated={(room) =>
          setProductStatus(room.productStatus ?? 'RESERVE')
        }
        onRoomUpdated={(room) => {
          if (room.productStatus) {
            setProductStatus(room.productStatus);
          }
        }}
        onTradeCompleted={() => {
          setPaymentDone(true);
          setProductStatus('DONE');
        }}
      />

      {reportToast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-white px-5 py-3.5 shadow-lg">
          <Flag className="size-4 text-red-400" />
          <p className="text-[13px] font-semibold text-slate-700">이미 신고한 상품입니다.</p>
        </div>
      )}
    </>
  );
}
