'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, FileText, PackageOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPostList } from '@/lib/postApi';
import { getProductList } from '@/lib/marketApi';
import type { Post, Product } from '@/types/community';

const BOARD_HREF: Record<number, string> = {
  1: '/community/free',
  2: '/community/secret',
  3: '/community/notice',
};

const BOARD_LABEL: Record<number, string> = {
  1: '자유게시판',
  2: '익명게시판',
  3: '공지사항',
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatPrice(price: number) {
  return price === 0 ? '나눔' : price.toLocaleString('ko-KR') + '원';
}

function Highlight({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(keyword)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={i} className='bg-transparent text-primary rounded px-0.5'>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function PostResultCard({ post, keyword }: { post: Post; keyword: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() =>
        router.push(`${BOARD_HREF[post.boardId] ?? '/community'}?postId=${post.postId}`)
      }
      className='flex w-full items-start gap-4 rounded-2xl border border-border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md'
    >
      <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10'>
        <FileText className='size-5 text-primary' />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='mb-1 flex items-center gap-2'>
          <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary'>
            {BOARD_LABEL[post.boardId]}
          </span>
          {post.category && (
            <span className='text-[11px] text-slate-400'>{post.category}</span>
          )}
        </div>
        <div className='truncate text-[14px] font-bold text-slate-800'>
          <Highlight text={post.title} keyword={keyword} />
        </div>
        {post.content && (
          <div className='mt-1 line-clamp-2 text-[13px] text-slate-400'>
            <Highlight text={post.content} keyword={keyword} />
          </div>
        )}
        <div className='mt-2 flex items-center gap-3 text-[11px] text-slate-400'>
          <span>{post.isAnonymous ? '익명' : post.authorNickname || post.authorName}</span>
          <span>·</span>
          <span>{post.createdAt}</span>
          <span>·</span>
          <span>좋아요 {post.likeCount}</span>
          <span>·</span>
          <span>댓글 {post.commentCount}</span>
        </div>
      </div>
    </button>
  );
}

function ProductResultCard({
  product,
  keyword,
}: {
  product: Product;
  keyword: string;
}) {
  const router = useRouter();
  const statusStyle: Record<string, string> = {
    SALE: 'bg-primary/10 text-primary',
    RESERVE: 'bg-amber-100 text-amber-700',
    DONE: 'bg-slate-100 text-slate-500',
  };
  const statusLabel: Record<string, string> = {
    SALE: '판매중',
    RESERVE: '예약중',
    DONE: '거래완료',
  };

  return (
    <button
      onClick={() => router.push(`/community/market/${product.productId}`)}
      className='flex w-full items-start gap-4 rounded-2xl border border-border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md'
    >
      <div className='flex size-[60px] shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm'>
        <PackageOpen className='size-7' />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='mb-1 flex items-center gap-2'>
          <span className='rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600'>
            중고거래
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-bold',
              statusStyle[product.productStatus],
            )}
          >
            {statusLabel[product.productStatus]}
          </span>
        </div>
        <div className='truncate text-[14px] font-bold text-slate-800'>
          <Highlight text={product.productName} keyword={keyword} />
        </div>
        <div className='mt-1 text-[16px] font-extrabold text-slate-900'>
          {formatPrice(product.price)}
        </div>
        <div className='mt-1 flex items-center gap-3 text-[11px] text-slate-400'>
          <span>{product.sellerNickname || product.sellerName}</span>
          <span>·</span>
          <span>{product.place}</span>
          <span>·</span>
          <span>{product.createdAt}</span>
        </div>
      </div>
    </button>
  );
}

type TabType = '전체' | '게시글' | '상품';

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: TabType;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-all',
        active
          ? 'border-primary bg-primary text-white shadow-sm'
          : 'border-border bg-white text-slate-500 hover:border-primary hover:text-primary',
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[11px] font-bold',
          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
        )}
      >
        {count}
      </span>
    </button>
  );
}

export default function CommunitySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialKeyword = searchParams.get('q') ?? '';

  const [keyword, setKeyword] = useState(initialKeyword);
  const [inputValue, setInputValue] = useState(initialKeyword);
  const [tab, setTab] = useState<TabType>('전체');
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const nextKeyword = searchParams.get('q') ?? '';
    setKeyword(nextKeyword);
    setInputValue(nextKeyword);
  }, [searchParams]);

  useEffect(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setPosts([]);
      setProducts([]);
      return;
    }

    let ignore = false;
    setLoading(true);

    Promise.all([
      Promise.all(
        [1, 2, 3].map((boardId) =>
          getPostList({ boardId, keyword: trimmed, page: 1, size: 8 }),
        ),
      ),
      getProductList({ keyword: trimmed, page: 0, size: 12 }),
    ])
      .then(([postResponses, productResponse]) => {
        if (ignore) return;
        setPosts(postResponses.flatMap((res) => res.postList ?? []));
        setProducts(productResponse.list ?? []);
      })
      .catch((error) => {
        if (ignore) return;
        console.error('통합 검색 실패:', error);
        setPosts([]);
        setProducts([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [keyword]);

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setKeyword(trimmed);
    router.replace(`/community/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleClear = () => {
    setInputValue('');
    setKeyword('');
    router.replace('/community/search');
  };

  const filteredPosts = posts;
  const filteredProducts = products;
  const totalCount = useMemo(
    () => filteredPosts.length + filteredProducts.length,
    [filteredPosts.length, filteredProducts.length],
  );
  const showPosts = tab === '전체' || tab === '게시글';
  const showProducts = tab === '전체' || tab === '상품';

  return (
    <div className='min-h-screen bg-slate-50 px-[30px] py-7'>
      <div className='mx-auto max-w-[760px]'>
        {/* 검색창 */}
        <div className='mb-6'>
          <div className='flex items-center gap-3 rounded-2xl border border-border bg-white p-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'>
            <Search className='ml-2 size-5 shrink-0 text-slate-400' />
            <input
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder='게시글, 상품을 검색해 보세요'
              className='flex-1 bg-transparent text-[14px] outline-none placeholder:text-slate-400'
            />
            {inputValue && (
              <button
                onClick={handleClear}
                className='flex size-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200'
              >
                <X className='size-3.5' />
              </button>
            )}
            <button
              onClick={handleSearch}
              className='rounded-xl bg-primary px-5 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-primary/90'
            >
              검색
            </button>
          </div>
        </div>

        {/* 검색 전 */}
        {!keyword && (
          <div className='flex flex-col items-center py-20 text-center'>
            <div className='flex size-16 items-center justify-center rounded-full bg-slate-100'>
              <Search className='size-7 text-slate-300' />
            </div>
            <p className='mt-4 text-[14px] font-bold text-slate-700'>
              검색어를 입력해 주세요
            </p>
            <p className='mt-1.5 text-[13px] text-slate-400'>
              게시글, 상품을 통합 검색할 수 있습니다.
            </p>
          </div>
        )}

        {/* 검색 결과 */}
        {keyword && (
          <>
            <div className='mb-4 flex items-center justify-between'>
              <p className='text-[13px] text-slate-500'>
                <span className='font-bold text-primary'>{`"${keyword}"`}</span>{' '}
                검색 결과{' '}
                <span className='font-bold text-slate-800'>{totalCount}건</span>
              </p>
              <div className='flex gap-2'>
                {(['전체', '게시글', '상품'] as TabType[]).map((t) => (
                  <TabButton
                    key={t}
                    label={t}
                    count={
                      t === '전체'
                        ? totalCount
                        : t === '게시글'
                          ? filteredPosts.length
                          : filteredProducts.length
                    }
                    active={tab === t}
                    onClick={() => setTab(t)}
                  />
                ))}
              </div>
            </div>

            {loading && (
              <div className='flex flex-col items-center py-20 text-center'>
                <div className='flex size-16 items-center justify-center rounded-full bg-slate-100'>
                  <Search className='size-7 animate-pulse text-slate-300' />
                </div>
                <p className='mt-4 text-[14px] font-bold text-slate-700'>
                  검색 중입니다.
                </p>
              </div>
            )}

            {!loading && totalCount === 0 && (
              <div className='flex flex-col items-center py-20 text-center'>
                <div className='flex size-16 items-center justify-center rounded-full bg-slate-100'>
                  <Search className='size-7 text-slate-300' />
                </div>
                <p className='mt-4 text-[14px] font-bold text-slate-700'>
                  검색 결과가 없습니다.
                </p>
                <p className='mt-1.5 text-[13px] text-slate-400'>
                  다른 검색어로 시도해 보세요.
                </p>
              </div>
            )}

            {!loading && showPosts && filteredPosts.length > 0 && (
              <div className='mb-6'>
                <h3 className='mb-3 text-[12px] font-bold text-slate-400 uppercase tracking-wider'>
                  게시글 {filteredPosts.length}건
                </h3>
                <div className='flex flex-col gap-3'>
                  {filteredPosts.map((post) => (
                    <PostResultCard
                      key={post.postId}
                      post={post}
                      keyword={keyword}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && showProducts && filteredProducts.length > 0 && (
              <div>
                <h3 className='mb-3 text-[12px] font-bold text-slate-400 uppercase tracking-wider'>
                  상품 {filteredProducts.length}건
                </h3>
                <div className='flex flex-col gap-3'>
                  {filteredProducts.map((product) => (
                    <ProductResultCard
                      key={product.productId}
                      product={product}
                      keyword={keyword}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
