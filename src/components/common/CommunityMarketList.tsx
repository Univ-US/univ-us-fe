'use client';

import { Client, type IStompSocket } from '@stomp/stompjs';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SockJS from 'sockjs-client';
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
import { getMyLikeList, getTradeChatRooms, toggleProductLike } from '@/lib/marketApi';
import { getWebSocketEndpointUrl } from '@/lib/realtime';
import { useAuthStore } from '@/store/authStore';
import type { Product, ProductCategory, TradeChatMessage, TradeChatRoom } from '@/types/community';

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
const resolveImageUrl = (url: string) =>
  url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

function StatusBadge({ status }: { status: Product['productStatus'] }) {
  const styles: Record<string, string> = {
    SALE: 'bg-primary/10 text-primary',
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
      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// ── 상품 카드 ──────────────────────────────────────────
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
      {/* 썸네일 */}
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
              alt="상품 이미지"
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
              블라인드
            </span>
          ) : (
            <StatusBadge status={product.productStatus} />
          )}
        </span>

        {/* 찜 버튼 */}
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

      {/* 정보 */}
      <div className="px-3.5 pb-4 pt-3">
        <div
          className={cn(
            'h-[40px] overflow-hidden text-[13px] font-semibold leading-snug text-slate-800 transition-colors duration-200 group-hover/card:text-slate-950',
            (sold || blind) && 'text-slate-400',
          )}
        >
          {blind ? '신고 누적으로 블라인드 처리된 상품입니다.' : product.productName}
        </div>
        <div
          className={cn(
            'mt-1.5 text-[16px] font-extrabold tracking-tight text-slate-900 transition-colors duration-200 group-hover/card:text-primary',
            (sold || blind) && 'text-slate-400',
          )}
        >
          {blind ? `신고 ${product.reportCount ?? 5}회 누적` : formatPrice(product.price)}
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-1 text-[11px] text-slate-400">
          <MapPin className="size-3" />
          <span className="truncate">{product.place}</span>
          <span className="mx-1">·</span>
          <span className="shrink-0">{String(formatDate(product.createdAt))}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Heart className="size-3" />
            {likeCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="relative inline-flex">
              <MessageCircle className="size-3" />
              {product.hasUnreadTradeChat && (
                <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-primary ring-1 ring-white" />
              )}
            </span>
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
  const [chatOpen, setChatOpen] = useState(false);
  // 낙관적 업데이트용 로컬 찜 상태 (Set: productId)
  const [likedSet, setLikedSet] = useState<Set<number>>(new Set());
  const [likeCountById, setLikeCountById] = useState<Map<number, number>>(new Map());
  const [unreadProductIds, setUnreadProductIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLikeCountById(new Map(products.map((product) => [product.productId, product.likeCount])));
    setUnreadProductIds(
      new Set(
        products
          .filter((product) => product.hasUnreadTradeChat)
          .map((product) => product.productId),
      ),
    );
  }, [products]);

  const setProductUnread = useCallback((productId: number, hasUnread: boolean) => {
    setUnreadProductIds((current) => {
      const next = new Set(current);
      if (hasUnread) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  }, []);

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
        console.error('찜 목록 조회 실패:', err);
      });

    return () => {
      ignore = true;
    };
  }, [memberId]);

  useEffect(() => {
    if (!memberId) {
      setUnreadProductIds(new Set());
      return;
    }

    let disposed = false;
    let client: Client | null = null;

    void getTradeChatRooms()
      .then((rooms) => {
        if (disposed || rooms.length === 0) {
          return;
        }

        client = new Client({
          webSocketFactory: () =>
            new SockJS(getWebSocketEndpointUrl()) as unknown as IStompSocket,
          reconnectDelay: 5000,
          heartbeatIncoming: 10000,
          heartbeatOutgoing: 10000,
          debug: () => {},
          onConnect: () => {
            if (disposed) {
              return;
            }

            client?.subscribe('/user/queue/market-chat-notifications', (message) => {
              if (!message.body) {
                return;
              }

              try {
                const room = JSON.parse(message.body) as TradeChatRoom;
                setProductUnread(room.productId, true);
                onRefresh?.();
              } catch {
                // Ignore malformed notification payloads without breaking the list.
              }
            });

            rooms.forEach((room) => {
              client?.subscribe(`/sub/market-chats/${room.roomId}`, (message) => {
                if (!message.body) {
                  return;
                }

                try {
                  const payload = JSON.parse(message.body) as TradeChatMessage;
                  if (payload.senderId === memberId) {
                    return;
                  }

                  setProductUnread(room.productId, true);
                  onRefresh?.();
                } catch {
                  // Ignore malformed realtime messages without breaking the list.
                }
              });
            });
          },
        });

        client.activate();
      })
      .catch((error) => {
        console.error('중고거래 채팅방 실시간 구독 실패:', error);
      });

    return () => {
      disposed = true;
      void client?.deactivate();
    };
  }, [memberId, onRefresh, setProductUnread]);

  const toggleLike = useCallback(
    async (productId: number) => {
      // 로그인 체크
      if (!memberId) {
        alert('로그인이 필요합니다.');
        return;
      }
      // 낙관적 업데이트: 먼저 UI 반영 후 API 호출
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
        onRefresh?.(); // 목록 새로고침 (서버의 실제 likeCount 반영)
      } catch (err) {
        console.error('찜 토글 실패:', err);
        // 실패 시 롤백
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
    category === '전체' ? true : p.category === category,
  );
  if (onlyLiked) filtered = filtered.filter((p) => likedSet.has(p.productId));
  const hasUnreadTradeChat = unreadProductIds.size > 0;

  const handleOpenChatList = () => {
    if (!memberId) {
      alert('로그인이 필요합니다.');
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
              중고거래
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              캠퍼스 안에서 필요한 물건을 빠르게 찾아 보세요.
            </p>
          </div>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-primary">
            상품 {products.length}개
          </p>
        </div>

        {/* 필터 + 버튼 */}
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
              className="relative flex items-center justify-center gap-1.5 rounded-md border border-border bg-white px-3.5 py-1.5 text-[13px] font-semibold text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary active:translate-y-0"
            >
              <MessageCircle className="size-3.5" />
              {hasUnreadTradeChat && (
                <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary shadow-sm shadow-primary/30 ring-2 ring-white" />
              )}
              채팅방
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
              관심목록 {likedSet.size}
            </button>
            <Button
              onClick={() => router.push('/community/market/write')}
              className="h-auto rounded-md px-3.5 py-1.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:rotate-90"
            >
              <Plus className="size-4" />
              판매하기
            </Button>
          </div>
        </div>

        {/* 빈 관심목록 */}
        {onlyLiked && filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-white py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-lg bg-slate-100">
              <Heart className="size-7 text-slate-300" />
            </div>
            <div className="mt-4 text-[15px] font-bold text-slate-700">
              아직 찜한 상품이 없습니다.
            </div>
            <div className="mt-1.5 text-[13px] text-slate-400">
              마음에 드는 상품의 하트를 눌러 모아 보세요.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-white py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-lg bg-slate-100">
              <PackageOpen className="size-7 text-slate-300" />
            </div>
            <div className="mt-4 text-[15px] font-bold text-slate-700">
              등록된 상품이 없습니다.
            </div>
            <div className="mt-1.5 text-[13px] text-slate-400">
              첫 상품을 올려서 캠퍼스 거래를 시작해 보세요.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.productId}
                product={{
                  ...product,
                  hasUnreadTradeChat: unreadProductIds.has(product.productId),
                }}
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
        onProductUnreadChange={setProductUnread}
      />
    </>
  );
}
