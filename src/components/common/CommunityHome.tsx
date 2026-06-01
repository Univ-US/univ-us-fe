'use client';

import Link from 'next/link';
import {
  ChevronRight,
  Flame,
  MessageSquare,
  VenetianMask,
  Megaphone,
  ShoppingBag,
  Eye,
  MessageCircle,
  Heart,
  Star,
  Smile,
} from 'lucide-react';
import type { Post, Product } from '@/types/community';

// ── 가격 포맷 ──────────────────────────────────────────
function formatPrice(price: number) {
  return price === 0 ? '나눔' : price.toLocaleString('ko-KR') + '원';
}

// ── 조회수 포맷 ────────────────────────────────────────
function formatViews(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
}

// ── 상단 배너 ──────────────────────────────────────────
function HomeBanner() {
  const tiles = [
    {
      emoji: '💬',
      style: 'left-[138px] top-1.5 size-[70px] -rotate-6 z-30 bg-teal-500',
    },
    {
      emoji: '❤️',
      style: 'left-[60px] top-10 size-14 rotate-[10deg] z-20 bg-teal-400',
    },
    {
      emoji: '⭐',
      style: 'left-[196px] top-[86px] size-[52px] rotate-12 z-20 bg-green-400',
    },
    {
      emoji: '😊',
      style: 'left-24 top-[110px] size-[46px] -rotate-[10deg] z-10 bg-blue-400',
    },
  ];

  return (
    <div className='mb-5 flex items-center justify-between gap-6 overflow-hidden rounded-[20px] border border-teal-100 bg-gradient-to-r from-teal-50 via-teal-50 to-blue-50 px-8 py-7'>
      <div className='relative z-10 min-w-0'>
        <span className='flex w-fit items-center gap-2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[12.5px] font-bold text-teal-700 shadow-sm'>
          <span className='size-[7px] shrink-0 rounded-full bg-primary' />
          지금 2,345명 접속 중
        </span>
        <h2 className='mt-3.5 whitespace-nowrap text-[28px] font-extrabold leading-[1.34] tracking-tight text-teal-900'>
          좋은 사람들이 모여
          <br />더 나은 캠퍼스를 만들어요
        </h2>
        <p className='mt-2.5 whitespace-nowrap text-[14.5px] text-teal-800/85'>
          관심사로 연결되고, 함께 성장하는 우리들의 공간
        </p>
      </div>
      <div className='relative size-[176px] w-[230px] shrink-0'>
        {tiles.map((tile, i) => (
          <div
            key={i}
            className={`absolute flex items-center justify-center rounded-[30%] shadow-lg text-2xl ${tile.style}`}
          >
            {tile.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 게시판 카드 한 줄 ──────────────────────────────────
function PostRow({
  post,
  href,
  isAnon,
}: {
  post: Post;
  href: string;
  isAnon: boolean;
}) {
  return (
    <Link
      href={href}
      className='flex items-center gap-2.5 px-[18px] py-[11px] transition-colors hover:bg-slate-50 border-b border-border last:border-0'
    >
      {/* 태그 or 카테고리 */}
      {post.tag ? (
        <span className='shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600'>
          {post.tag}
        </span>
      ) : (
        <span className='w-[34px] shrink-0 text-[11.5px] font-bold text-primary truncate'>
          {post.category}
        </span>
      )}

      {/* 제목 */}
      <span className='min-w-0 flex-1 truncate text-[13.5px] font-medium'>
        {post.title}
      </span>

      {/* HOT 뱃지 */}
      {post.isHot && (
        <span className='shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600'>
          HOT
        </span>
      )}

      {/* 댓글 수 */}
      {post.commentCount > 0 && (
        <span className='flex shrink-0 items-center gap-1 text-[11.5px] text-muted-foreground'>
          <MessageSquare className='size-3' />
          {post.commentCount}
        </span>
      )}

      {/* 날짜 */}
      <span className='w-[46px] shrink-0 text-right text-[11.5px] text-muted-foreground'>
        {post.createdAt}
      </span>
    </Link>
  );
}

// ── 게시판 섹션 카드 ───────────────────────────────────
function BoardCard({
  title,
  href,
  icon,
  iconWrapClass,
  posts,
  isAnon = false,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
  iconWrapClass: string;
  posts: Post[];
  isAnon?: boolean;
}) {
  return (
    <div className='flex flex-col rounded-2xl border border-border bg-card overflow-hidden'>
      {/* 카드 헤더 */}
      <Link
        href={href}
        className='flex items-center justify-between border-b border-border px-[18px] py-4'
      >
        <span className='flex items-center gap-2 text-base font-bold tracking-tight'>
          <span
            className={`flex size-[30px] items-center justify-center rounded-lg ${iconWrapClass}`}
          >
            {icon}
          </span>
          {title}
        </span>
        <span className='flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground'>
          더보기 <ChevronRight className='size-[15px]' />
        </span>
      </Link>

      {/* 게시글 목록 */}
      <div className='flex-1'>
        {posts.map((post) => (
          <PostRow key={post.postId} post={post} href={href} isAnon={isAnon} />
        ))}
      </div>
    </div>
  );
}

// ── 중고거래 카드 한 줄 ────────────────────────────────
function ProductRow({ product }: { product: Product }) {
  return (
    <Link
      href={`/community/market/${product.productId}`}
      className='flex items-center gap-3 px-[18px] py-2.5 transition-colors hover:bg-slate-50 border-b border-border last:border-0'
    >
      {/* 썸네일 플레이스홀더 */}
      <div className='size-[38px] shrink-0 rounded-[9px] bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center'>
        <ShoppingBag className='size-4 text-white' />
      </div>
      <span className='min-w-0 flex-1 truncate text-[13.5px] font-medium'>
        {product.productName}
      </span>
      <span className='shrink-0 text-[13.5px] font-bold'>
        {formatPrice(product.price)}
      </span>
      <span className='w-[46px] shrink-0 text-right text-[11.5px] text-muted-foreground'>
        {product.createdAt}
      </span>
    </Link>
  );
}

// ── 인기글 사이드 레일 ─────────────────────────────────
function PopularRail({
  popular,
}: {
  popular: { title: string; board: string; viewCount: number }[];
}) {
  const toHref: Record<string, string> = {
    자유: '/community/free',
    익명: '/community/secret',
    공지: '/community/free',
  };

  return (
    <div className='w-[312px] shrink-0'>
      <div className='sticky top-20 rounded-2xl border border-border bg-card overflow-hidden'>
        {/* 헤더 */}
        <div className='flex items-center gap-2 border-b border-border px-[18px] py-4'>
          <Flame className='size-[18px] text-red-500' />
          <span className='text-base font-bold tracking-tight'>인기글</span>
          <span className='ml-auto text-xs text-muted-foreground'>
            조회수 TOP
          </span>
        </div>

        {/* 목록 */}
        <div>
          {popular.map((item, i) => (
            <Link
              key={i}
              href={toHref[item.board] ?? '/community'}
              className='flex items-center gap-3 px-[18px] py-3 transition-colors hover:bg-slate-50 border-b border-border last:border-0'
            >
              <span
                className={`w-4 shrink-0 text-[15px] font-extrabold tabular-nums ${
                  i < 3 ? 'text-primary' : 'text-muted-foreground/60'
                }`}
              >
                {i + 1}
              </span>
              <div className='min-w-0 flex-1'>
                <div className='truncate text-[13.5px] font-medium'>
                  {item.title}
                </div>
                <div className='mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground'>
                  <span>{item.board}게시판</span>
                  <span>·</span>
                  <span className='flex items-center gap-1'>
                    <Eye className='size-3' />
                    {formatViews(item.viewCount)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
interface CommunityHomeProps {
  freePosts: Post[];
  secretPosts: Post[];
  noticePosts: Post[];
  latestProducts: Product[];
  popular: { title: string; board: string; viewCount: number }[];
}

export default function CommunityHome({
  freePosts,
  secretPosts,
  noticePosts,
  latestProducts,
  popular,
}: CommunityHomeProps) {
  return (
    <div className='px-[30px] py-7'>
      <div className='mx-auto max-w-[1140px]'>
        {/* 배너 */}
        <HomeBanner />

        <div className='flex items-start gap-4'>
          {/* 게시판 그리드 */}
          <div className='grid min-w-0 flex-1 grid-cols-2 gap-4'>
            {/* 자유게시판 */}
            <BoardCard
              title='자유게시판'
              href='/community/free'
              icon={<MessageSquare className='size-[17px] text-primary' />}
              iconWrapClass='bg-teal-50'
              posts={freePosts}
            />

            {/* 익명게시판 */}
            <BoardCard
              title='익명게시판'
              href='/community/secret'
              icon={<VenetianMask className='size-[17px] text-slate-500' />}
              iconWrapClass='bg-slate-100'
              posts={secretPosts}
              isAnon
            />

            {/* 공지사항 */}
            <BoardCard
              title='공지사항'
              href='/community/free'
              icon={<Megaphone className='size-[17px] text-blue-500' />}
              iconWrapClass='bg-blue-50'
              posts={noticePosts}
            />

            {/* 중고거래 */}
            <div className='flex flex-col rounded-2xl border border-border bg-card overflow-hidden'>
              <Link
                href='/community/market'
                className='flex items-center justify-between border-b border-border px-[18px] py-4'
              >
                <span className='flex items-center gap-2 text-base font-bold tracking-tight'>
                  <span className='flex size-[30px] items-center justify-center rounded-lg bg-amber-50'>
                    <ShoppingBag className='size-[17px] text-amber-500' />
                  </span>
                  중고거래
                </span>
                <span className='flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground'>
                  더보기 <ChevronRight className='size-[15px]' />
                </span>
              </Link>
              <div className='flex-1'>
                {latestProducts.map((product) => (
                  <ProductRow key={product.productId} product={product} />
                ))}
              </div>
            </div>
          </div>

          {/* 인기글 사이드 */}
          <PopularRail popular={popular} />
        </div>
      </div>
    </div>
  );
}
