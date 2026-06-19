'use client';

import type { KeyboardEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Bookmark, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getApiErrorMessage } from '@/lib/apiError';
import { getMyWishlist } from '@/lib/cmypageApi';
import { toggleProductLike } from '@/lib/marketApi';
import { useAuthStore } from '@/store/authStore';
import type { MyWishlist as MyWishlistType } from '@/types/mypage';
import { StatusBadge, formatPrice, SectionTitle } from './shared';

const PAGE_SIZE = 6;

const S = {
  emptyState: 'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50/50 py-16 text-center',
  emptyIcon: 'mb-3 size-10 text-slate-300',
  emptyText: 'text-[14px] font-medium text-slate-500',
  errorText: 'mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600',
  grid: 'grid grid-cols-2 gap-4 lg:grid-cols-3',
  card: 'group cursor-pointer overflow-hidden rounded-2xl border border-border bg-white text-left shadow-sm outline-none transition-all hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40',
  imagePlaceholder: 'aspect-square bg-slate-100',
  content: 'p-4',
  topRow: 'mb-2 flex items-center justify-between gap-2',
  bookmarkButton: 'rounded-full p-1 text-rose-400 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50',
  bookmarkIcon: 'size-4 fill-rose-400 text-rose-400',
  productName: 'mb-1 truncate text-[14px] font-semibold text-slate-800',
  price: 'text-[15px] font-extrabold text-slate-900',
  place: 'mt-2 text-[12px] text-slate-400',
  moreWrap: 'mt-4 flex justify-center',
  moreButton: 'rounded-xl border border-border bg-white px-5 py-2 text-[13px] font-bold text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary active:translate-y-0',
};

export default function MyWishlist() {
  const router = useRouter();
  const memberId = useAuthStore((s) => s.memberId);
  const [wishlist, setWishlist] = useState<MyWishlistType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [removingProductId, setRemovingProductId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWishlist = useCallback(async (nextPage: number, append: boolean) => {
    if (nextPage === 0) {
      setIsLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const data = await getMyWishlist(nextPage, PAGE_SIZE);
      setWishlist((current) => append ? [...current, ...data.content] : data.content);
      setPage(data.page);
      setTotalElements(data.totalElements);
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, '관심목록을 불러오지 못했습니다.'));
    } finally {
      if (nextPage === 0) {
        setIsLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadWishlist(0, false);
  }, [loadWishlist]);

  const openProductDetail = (productId: number) => {
    router.push(`/community/market/${productId}`);
  };

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    productId: number,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openProductDetail(productId);
  };

  const handleRemoveWishlist = async (
    event: MouseEvent<HTMLButtonElement>,
    productId: number,
  ) => {
    event.stopPropagation();
    setErrorMessage(null);

    if (memberId == null) {
      setErrorMessage('로그인 정보를 확인할 수 없습니다.');
      return;
    }

    setRemovingProductId(productId);
    try {
      const result = await toggleProductLike(productId, memberId);
      if (!result.liked) {
        await loadWishlist(0, false);
      }
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, '관심목록에서 제거하지 못했습니다.'));
    } finally {
      setRemovingProductId(null);
    }
  };

  const hasMore = wishlist.length < totalElements;

  return (
    <>
      <SectionTitle sub='찜해둔 상품을 한눈에 확인하세요'>관심목록</SectionTitle>
      {errorMessage && <p className={S.errorText}>{errorMessage}</p>}
      {!isLoading && wishlist.length === 0 ? (
        <div className={S.emptyState}>
          <ShoppingBag className={S.emptyIcon} />
          <p className={S.emptyText}>관심 상품이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className={S.grid}>
            {wishlist.map((item) => (
              <div
                key={item.productId}
                role='link'
                tabIndex={0}
                className={S.card}
                onClick={() => openProductDetail(item.productId)}
                onKeyDown={(event) => handleCardKeyDown(event, item.productId)}
              >
                <div className={S.imagePlaceholder} />
                <div className={S.content}>
                  <div className={S.topRow}>
                    <StatusBadge status={item.status} />
                    <button
                      type='button'
                      className={S.bookmarkButton}
                      title='관심목록에서 제거'
                      disabled={removingProductId === item.productId}
                      onClick={(event) => handleRemoveWishlist(event, item.productId)}
                    >
                      <Bookmark className={S.bookmarkIcon} />
                    </button>
                  </div>
                  <h3 className={S.productName}>{item.productName}</h3>
                  <div className={S.price}>{formatPrice(item.price)}</div>
                  <div className={S.place}>{item.place}</div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className={S.moreWrap}>
              <button
                type='button'
                className={S.moreButton}
                disabled={loadingMore}
                onClick={() => void loadWishlist(page + 1, true)}
              >
                {loadingMore ? '불러오는 중' : `더보기 ${wishlist.length} / ${totalElements}`}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
