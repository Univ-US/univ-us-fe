/* eslint-disable */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  MessageCircle,
  Eye,
  MapPin,
  Plus,
  PackageOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import CommunityMarketChatDrawer from '@/components/common/CommunityMarketChatDrawer';
import { API_BASE_URL } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { getMyLikeList, toggleProductLike } from '@/lib/marketApi';
import { useAuthStore } from '@/store/authStore';
import type { Product, ProductCategory } from '@/types/community';

const CATEGORIES: ('?꾩껜' | ProductCategory)[] = [
  '?꾩껜',
  '援먯옱',
  '?꾩옄湲곌린',
  '?앺솢?⑺뭹',
  '湲고?',
];

function formatPrice(price: number) {
  return price === 0 ? '?섎닎' : price.toLocaleString('ko-KR') + '??;
}

// ?? ?곹깭 諭껋? ??????????????????????????????????????????
const resolveImageUrl = (url: string) =>
  url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

function StatusBadge({ status }: { status: Product['productStatus'] }) {
  const styles: Record<string, string> = {
    SALE: 'bg-emerald-100 text-emerald-700',
    RESERVE: 'bg-amber-100 text-amber-700',
    DONE: 'bg-slate-100 text-slate-500',
  };
  const labels: Record<string, string> = {
    SALE: '?먮ℓ以?,
    RESERVE: '?덉빟以?,
    DONE: '嫄곕옒?꾨즺',
  };
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// ?? ?곹뭹 移대뱶 ??????????????????????????????????????????
function ProductCard({
  product,
  liked,
  likeCount,
  onToggleLike,
  onOpen,
}: {
  product: Product;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
  onOpen: () => void;
}) {
  const sold = product.productStatus === 'DONE';
  const blind = Boolean(product.isBlind);
  const thumbnailUrl = product.images?.[0]?.imageUrl;

  return (
    <div
      onClick={onOpen}
      className="group/card cursor-pointer overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
    >
      {/* ?몃꽕??*/}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {thumbnailUrl && (
          <div
            className={cn(
              'absolute inset-0 z-0 overflow-hidden bg-slate-100',
              (sold || blind) && 'opacity-40',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveImageUrl(thumbnailUrl)}
              alt="?곹뭹 ?대?吏"
              className="size-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            />
          </div>
        )}
        <div
          className={cn(
            'flex size-full items-center justify-center bg-slate-100 text-primary transition-transform duration-300 group-hover/card:scale-105',
            thumbnailUrl && 'opacity-0',
            (sold || blind) && 'opacity-40',
          )}
        >
          <PackageOpen className="size-10" />
        </div>

        <span className="absolute left-2.5 top-2.5">
          {blind ? (
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">
              釉붾씪?몃뱶
            </span>
          ) : (
            <StatusBadge status={product.productStatus} />
          )}
        </span>

        {/* 李?踰꾪듉 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          className={cn(
            'absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-md bg-white/90 shadow-sm transition-all duration-200 hover:scale-110 active:scale-95',
            liked ? 'text-red-500' : 'text-slate-400',
          )}
        >
          <Heart className={cn('size-4 transition-transform duration-200', liked && 'fill-current scale-105')} />
        </button>
      </div>

      {/* ?뺣낫 */}
      <div className="px-3.5 pb-4 pt-3">
        <div
          className={cn(
            'h-[40px] overflow-hidden text-[13px] font-semibold leading-snug text-slate-800 transition-colors duration-200 group-hover/card:text-slate-950',
            (sold || blind) && 'text-slate-400',
          )}
        >
          {blind ? '?좉퀬 ?꾩쟻?쇰줈 釉붾씪?몃뱶 泥섎━???곹뭹?낅땲??' : product.productName}
        </div>
        <div
          className={cn(
            'mt-1.5 text-[16px] font-extrabold tracking-tight text-slate-900 transition-colors duration-200 group-hover/card:text-primary',
            (sold || blind) && 'text-slate-400',
          )}
        >
          {blind ? `?좉퀬 ${product.reportCount ?? 5}???꾩쟻` : formatPrice(product.price)}
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-1 text-[11px] text-slate-400">
          <MapPin className="size-3" />
          <span className="truncate">{product.place}</span>
          <span className="mx-1">쨌</span>
          <span className="shrink-0">{String(formatDate(product.createdAt))}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Heart className="size-3" />
            {likeCount}
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

// ?? 硫붿씤 而댄룷?뚰듃 ??????????????????????????????????????
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

  const [category, setCategory] = useState<'?꾩껜' | ProductCategory>('?꾩껜');
  const [onlyLiked, setOnlyLiked] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // ?숆????낅뜲?댄듃??濡쒖뺄 李??곹깭 (Set: productId)
  const [likedSet, setLikedSet] = useState<Set<number>>(new Set());
  const [likeCountById, setLikeCountById] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    setLikeCountById(new Map(products.map((product) => [product.productId, product.likeCount])));
  }, [products]);

  useEffect(() => {
    if (!memberId) {
      setLikedSet(new Set());
      return;
    }

    let ignore = false;
    getMyLikeList(memberId)
      .then((likedProducts) => {
        if (ignore) return;
        setLikedSet(new Set(likedProducts.map((product) => product.productId)));
      })
      .catch((err) => {
        console.error('李?紐⑸줉 議고쉶 ?ㅽ뙣:', err);
      });

    return () => {
      ignore = true;
    };
  }, [memberId]);

  const toggleLike = useCallback(
    async (productId: number) => {
      // 濡쒓렇??泥댄겕
      if (!memberId) {
        alert('濡쒓렇?몄씠 ?꾩슂?⑸땲??');
        return;
      }
      // ?숆????낅뜲?댄듃: 癒쇱? UI 諛섏쁺 ??API ?몄텧
      const wasLiked = likedSet.has(productId);
      setLikedSet((prev) => {
        const next = new Set(prev);
        if (next.has(productId)) {
          next.delete(productId);
        } else {
          next.add(productId);
        }
        return next;
      });
      setLikeCountById((prev) => {
        const next = new Map(prev);
        const current = next.get(productId) ?? products.find((product) => product.productId === productId)?.likeCount ?? 0;
        next.set(productId, Math.max(0, current + (wasLiked ? -1 : 1)));
        return next;
      });
      try {
        const res = await toggleProductLike(productId, memberId);
        setLikedSet((prev) => {
          const next = new Set(prev);
          if (res.liked) {
            next.add(productId);
          } else {
            next.delete(productId);
          }
          return next;
        });
        setLikeCountById((prev) => {
          const next = new Map(prev);
          next.set(productId, res.likeCount);
          return next;
        });
        onRefresh?.(); // 紐⑸줉 ?덈줈怨좎묠 (?쒕쾭???ㅼ젣 likeCount 諛섏쁺)
      } catch (err) {
        console.error('李??좉? ?ㅽ뙣:', err);
        // ?ㅽ뙣 ??濡ㅻ갚
        setLikedSet((prev) => {
          const next = new Set(prev);
          if (next.has(productId)) {
            next.delete(productId);
          } else {
            next.add(productId);
          }
          return next;
        });
        setLikeCountById((prev) => {
          const next = new Map(prev);
          const current = next.get(productId) ?? 0;
          next.set(productId, Math.max(0, current + (wasLiked ? 1 : -1)));
          return next;
        });
      }
    },
    [likedSet, memberId, onRefresh, products],
  );

  let filtered = products.filter((p) =>
    category === '?꾩껜' ? true : p.category === category,
  );
  if (onlyLiked) filtered = filtered.filter((p) => likedSet.has(p.productId));

  const handleOpenChatList = () => {
    if (!memberId) {
      alert('濡쒓렇?몄씠 ?꾩슂?⑸땲??');
      return;
    }

    setChatOpen(true);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-[30px] py-7">
        <div className="mx-auto max-w-[1140px]">
        <div className="mb-5 flex items-end justify-between border-b border-border pb-4">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-primary">
              UnivUS Market
            </p>
            <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-slate-900">
              以묎퀬嫄곕옒
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              罹좏띁???덉뿉???꾩슂??臾쇨굔??鍮좊Ⅴ寃?李얠븘 蹂댁꽭??
            </p>
          </div>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-primary">
            ?곹뭹 {products.length}媛?
          </p>
        </div>

        {/* ?꾪꽣 + 踰꾪듉 */}
        <div className="mb-5 flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'rounded-md border px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0',
                  category === cat
                    ? 'scale-[1.03] border-primary bg-primary text-white shadow-sm'
                    : 'border-border bg-white text-slate-500 hover:border-primary hover:text-primary',
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleOpenChatList}
              className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-white px-3.5 py-1.5 text-[13px] font-semibold text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary active:translate-y-0"
            >
              <MessageCircle className="size-3.5" />
              梨꾪똿諛?
            </button>
            <button
              onClick={() => setOnlyLiked(!onlyLiked)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md border px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0',
                onlyLiked
                  ? 'scale-[1.03] border-red-500 bg-red-500 text-white shadow-sm'
                  : 'border-border bg-white text-slate-500 hover:border-red-400 hover:text-red-500',
              )}
            >
              <Heart className={cn('size-3.5', onlyLiked && 'fill-current')} />
              愿?щぉ濡?{likedSet.size}
            </button>
            <Button
              onClick={() => router.push('/community/market/write')}
              className="h-auto rounded-md px-3.5 py-1.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:rotate-90"
            >
              <Plus className="size-4" />
              ?먮ℓ?섍린
            </Button>
          </div>
        </div>

        {/* 鍮?愿?щぉ濡?*/}
        {onlyLiked && filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-white py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-lg bg-slate-100">
              <Heart className="size-7 text-slate-300" />
            </div>
            <div className="mt-4 text-[15px] font-bold text-slate-700">
              ?꾩쭅 李쒗븳 ?곹뭹???놁뒿?덈떎.
            </div>
            <div className="mt-1.5 text-[13px] text-slate-400">
              留덉쓬???쒕뒗 ?곹뭹???섑듃瑜??뚮윭 紐⑥븘 蹂댁꽭??
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-white py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-lg bg-slate-100">
              <PackageOpen className="size-7 text-slate-300" />
            </div>
            <div className="mt-4 text-[15px] font-bold text-slate-700">
              ?깅줉???곹뭹???놁뒿?덈떎.
            </div>
            <div className="mt-1.5 text-[13px] text-slate-400">
              泥??곹뭹???щ젮??罹좏띁??嫄곕옒瑜??쒖옉??蹂댁꽭??
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.productId}
                product={product}
                liked={likedSet.has(product.productId)}
                likeCount={likeCountById.get(product.productId) ?? product.likeCount}
                onToggleLike={() => toggleLike(product.productId)}
                onOpen={() => router.push(`/community/market/${product.productId}`)}
              />
            ))}
          </div>
        )}
      </div>
      </div>

      <CommunityMarketChatDrawer
        open={chatOpen}
        targetProduct={null}
        onClose={() => setChatOpen(false)}
        onRoomsChanged={onRefresh}
        onTradeCompleted={onRefresh}
      />
    </>
  );
}

