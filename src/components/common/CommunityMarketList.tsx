'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Eye, MapPin, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toggleProductLike } from '@/lib/marketApi';
import { useAuthStore } from '@/store/authStore';
import type { Product, ProductCategory } from '@/types/community';

const CATEGORIES: ('전체' | ProductCategory)[] = [
  '전체',
  '교재',
  '전자기기',
  '생활용품',
  '기타',
];

function formatPrice(price: number) {
  return price === 0 ? '나눔' : price.toLocaleString('ko-KR') + '원';
}

// ── 상태 뱃지 ──────────────────────────────────────────
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

// ── 상품 카드 ──────────────────────────────────────────
function ProductCard({
  product,
  liked,
  onToggleLike,
  onOpen,
}: {
  product: Product;
  liked: boolean;
  onToggleLike: () => void;
  onOpen: () => void;
}) {
  const sold = product.productStatus === 'DONE';

  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      {/* 썸네일 */}
      <div className="relative">
        <div
          className={cn(
            'flex aspect-square items-center justify-center bg-gradient-to-br from-primary to-teal-700 text-5xl',
            sold && 'opacity-40',
          )}
        >
          🛍️
        </div>

        <span className="absolute left-2.5 top-2.5">
          <StatusBadge status={product.productStatus} />
        </span>

        {/* 찜 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          className={cn(
            'absolute right-2.5 top-2.5 flex size-[34px] items-center justify-center rounded-full bg-white/90 shadow-sm transition-all hover:scale-110',
            liked ? 'text-red-500' : 'text-slate-400',
          )}
        >
          <Heart className={cn('size-4', liked && 'fill-current')} />
        </button>
      </div>

      {/* 정보 */}
      <div className="px-3.5 pb-4 pt-3">
        <div
          className={cn(
            'h-[40px] overflow-hidden text-[13px] font-semibold leading-snug text-slate-800',
            sold && 'text-slate-400',
          )}
        >
          {product.productName}
        </div>
        <div
          className={cn(
            'mt-1.5 text-[16px] font-extrabold tracking-tight text-slate-900',
            sold && 'text-slate-400',
          )}
        >
          {formatPrice(product.price)}
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
          <MapPin className="size-3" />
          {product.place}
          <span className="mx-1">·</span>
          {String(product.createdAt)}
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Heart className="size-3" />
            {product.likeCount + (liked ? 1 : 0)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3" />
            {product.chatCount}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="size-3" />
            {product.viewCount}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
interface CommunityMarketListProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onRefresh?: () => void;
}

export default function CommunityMarketList({
  products,
  onSelectProduct,
  onRefresh,
}: CommunityMarketListProps) {
  const router = useRouter();
  const memberId = useAuthStore((s) => s.memberId);

  const [category, setCategory] = useState<'전체' | ProductCategory>('전체');
  const [onlyLiked, setOnlyLiked] = useState(false);
  // 낙관적 업데이트용 로컬 찜 상태 (Set: productId)
  const [likedSet, setLikedSet] = useState<Set<number>>(new Set());

  const toggleLike = useCallback(
    async (productId: number) => {
      // 로그인 체크
      if (!memberId) {
        alert('로그인이 필요해.');
        return;
      }
      // 낙관적 업데이트: 먼저 UI 반영 후 API 호출
      setLikedSet((prev) => {
        const next = new Set(prev);
        next.has(productId) ? next.delete(productId) : next.add(productId);
        return next;
      });
      try {
        await toggleProductLike(productId, memberId);
        onRefresh?.(); // 목록 새로고침 (서버의 실제 likeCount 반영)
      } catch (err) {
        console.error('찜 토글 실패:', err);
        // 실패 시 롤백
        setLikedSet((prev) => {
          const next = new Set(prev);
          next.has(productId) ? next.delete(productId) : next.add(productId);
          return next;
        });
      }
    },
    [memberId, onRefresh],
  );

  let filtered = products.filter((p) =>
    category === '전체' ? true : p.category === category,
  );
  if (onlyLiked) filtered = filtered.filter((p) => likedSet.has(p.productId));

  return (
    <div className="min-h-screen bg-slate-50 px-[30px] py-7">
      <div className="mx-auto max-w-[1140px]">
        {/* 필터 + 버튼 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-all',
                  category === cat
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-border bg-white text-slate-500 hover:border-primary hover:text-primary',
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setOnlyLiked(!onlyLiked)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-all',
                onlyLiked
                  ? 'border-red-500 bg-red-500 text-white shadow-sm'
                  : 'border-border bg-white text-slate-500 hover:border-red-400 hover:text-red-500',
              )}
            >
              <Heart className={cn('size-3.5', onlyLiked && 'fill-current')} />
              관심목록 {likedSet.size}
            </button>
            <Button
              onClick={() => router.push('/community/market/write')}
              className="shadow-sm"
            >
              <Plus className="size-4" />
              판매하기
            </Button>
          </div>
        </div>

        {/* 빈 관심목록 */}
        {onlyLiked && filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-slate-100">
              <Heart className="size-7 text-slate-300" />
            </div>
            <div className="mt-4 text-[15px] font-bold text-slate-700">
              아직 찜한 상품이 없어요
            </div>
            <div className="mt-1.5 text-[13px] text-slate-400">
              마음에 드는 상품의 하트를 눌러 모아보세요.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.productId}
                product={product}
                liked={likedSet.has(product.productId)}
                onToggleLike={() => toggleLike(product.productId)}
                onOpen={() => router.push(`/community/market/${product.productId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
