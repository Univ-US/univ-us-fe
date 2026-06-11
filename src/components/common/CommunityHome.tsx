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
  Heart,
} from 'lucide-react';
import type { Post, Product } from '@/types/community';

function formatPrice(price: number) {
  return price === 0 ? '나눔' : price.toLocaleString('ko-KR') + '원';
}

function formatViews(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 100) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function HomeBanner() {
  const tiles = [
    { emoji: '💬', style: 'left-[138px] top-1.5 size-[70px] -rotate-6 z-30 bg-gradient-to-br from-primary to-teal-700' },
    { emoji: '❤️', style: 'left-[60px] top-10 size-14 rotate-[10deg] z-20 bg-gradient-to-br from-teal-400 to-primary' },
    { emoji: '⭐', style: 'left-[196px] top-[86px] size-[52px] rotate-12 z-20 bg-gradient-to-br from-green-400 to-green-600' },
    { emoji: '😊', style: 'left-24 top-[110px] size-[46px] -rotate-[10deg] z-10 bg-gradient-to-br from-blue-400 to-blue-600' },
  ];
  return (
    <div className='mb-6 flex flex-col gap-6 overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-teal-50 to-blue-50 px-5 py-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md md:flex-row md:items-center md:justify-between md:px-8 md:py-7'>
      <div className='relative z-10 min-w-0'>
        <span className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-bold text-primary shadow-sm ring-1 ring-primary/10'>
          <span className='size-[6px] animate-pulse rounded-full bg-primary' />
          지금 2,345명 접속 중
        </span>
        <h2 className='mt-4 text-[20px] font-extrabold leading-[1.34] tracking-tight text-slate-900 md:text-[22px]'>
          좋은 사람들이 모여<br />
          <span className='text-primary'>더 나은 캠퍼스</span>를 만듭니다
        </h2>
        <p className='mt-2 text-[13px] text-slate-500'>관심사로 연결되고, 함께 성장하는 우리들의 공간입니다.</p>
      </div>
      <div className='relative hidden size-[176px] w-[230px] shrink-0 sm:block'>
        {tiles.map((tile, i) => (
          <div key={i} className={`absolute flex items-center justify-center rounded-[30%] shadow-lg text-2xl transition-transform duration-300 hover:scale-105 ${tile.style}`}>
            {tile.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}

function PostRow({ post, href, accentClass }: { post: Post; href: string; accentClass: string }) {
  return (
    <Link
      href={href}
      className='group/row flex items-center gap-2 border-b border-border px-[16px] py-[9px] transition-all duration-200 last:border-0 hover:bg-slate-50'
    >
      {/* 카테고리 — 고정 너비 */}
      {post.tag ? (
        <span className='shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600'>
          {post.tag}
        </span>
      ) : (
        <span className={`w-[30px] shrink-0 text-[11px] font-bold ${accentClass}`}>
          {post.category}
        </span>
      )}

      {/* 제목 */}
      <span className='min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700 transition-all duration-200 group-hover/row:translate-x-0.5 group-hover/row:text-slate-900'>
        {post.title}
      </span>

      {post.isHot && (
        <span className='shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-500'>HOT</span>
      )}

      {/* 좋아요 + 조회수 */}
      <div className='hidden shrink-0 items-center justify-end gap-[6px] text-[11px] text-slate-400 sm:flex'>
        <span className='flex items-center gap-[2px]'>
          <Heart className='size-2.5 shrink-0' />
          <span className='tabular-nums'>{post.likeCount}</span>
        </span>
        <span className='flex items-center gap-[2px]'>
          <Eye className='size-2.5 shrink-0' />
          <span className='tabular-nums'>{formatViews(post.viewCount)}</span>
        </span>
      </div>

      {/* 날짜 */}
      <span className='hidden shrink-0 whitespace-nowrap text-right text-[10.5px] text-slate-400 transition-colors group-hover/row:text-slate-500 sm:inline'>
        {formatShortDate(post.createdAt)}
      </span>
    </Link>
  );
}

function BoardCard({ title, href, icon, iconBg, accentClass, posts }: {
  title: string; href: string; icon: React.ReactNode; iconBg: string; accentClass: string; posts: Post[];
}) {
  return (
    <div className='group/card flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md'>
      <Link href={href} className='flex items-center justify-between border-b border-border px-[16px] py-3.5 transition-colors hover:bg-slate-50'>
        <span className='flex items-center gap-2 text-[14px] font-bold tracking-tight text-slate-800'>
          <span className={`flex size-[28px] items-center justify-center rounded-lg transition-transform duration-300 group-hover/card:scale-105 ${iconBg}`}>{icon}</span>
          {title}
        </span>
        <span className='flex items-center gap-1 text-[12px] font-semibold text-slate-400 transition-colors group-hover/card:text-primary'>더보기 <ChevronRight className='size-3 transition-transform group-hover/card:translate-x-0.5' /></span>
      </Link>
      <div className='flex-1'>
        {posts.map((post) => (
          <PostRow key={post.postId} post={post} href={`${href}?postId=${post.postId}`} accentClass={accentClass} />
        ))}
      </div>
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

function ProductRow({ product }: { product: Product }) {
  return (
    <Link href={`/community/market/${product.productId}`}
      className='group/product flex items-center gap-2.5 border-b border-border px-[16px] py-2 transition-all duration-200 last:border-0 hover:bg-slate-50'>
      <div className='flex size-[34px] shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-primary to-teal-700 transition-transform duration-200 group-hover/product:scale-105'>
        <ShoppingBag className='size-3.5 text-white' />
      </div>
      <span className='min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700 transition-all duration-200 group-hover/product:translate-x-0.5 group-hover/product:text-slate-900'>{product.productName}</span>
      <span className='shrink-0 text-[13px] font-bold text-slate-800'>{formatPrice(product.price)}</span>
      <span className='hidden shrink-0 whitespace-nowrap text-right text-[11px] text-slate-400 sm:inline'>{formatShortDate(product.createdAt)}</span>
    </Link>
  );
}

interface PopularItem {
  postId: number;
  title: string;
  board: string;
  boardPath: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

function PopularRail({ popular }: { popular: PopularItem[] }) {
  return (
    <div className='w-full shrink-0 xl:w-[280px]'>
      <div className='overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md xl:sticky xl:top-20'>
        <div className='flex items-center gap-2 border-b border-border px-[16px] py-3.5'>
          <Flame className='size-[16px] text-orange-500' />
          <span className='text-[14px] font-bold tracking-tight text-slate-800'>인기글</span>
          <span className='ml-auto text-[11px] text-slate-400'>인기 TOP 5</span>
        </div>
        <div>
          {popular.map((item, i) => (
            <Link key={i} href={`/community/${item.boardPath}?postId=${item.postId}`}
              className='group/popular flex items-center gap-2.5 border-b border-border px-[16px] py-2.5 transition-all duration-200 last:border-0 hover:bg-slate-50'>
              <span className={`w-4 shrink-0 text-[13px] font-extrabold tabular-nums ${i < 3 ? 'text-primary' : 'text-slate-300'}`}>
                {i + 1}
              </span>
              <div className='min-w-0 flex-1'>
                <div className='truncate text-[13px] font-medium text-slate-700 transition-all duration-200 group-hover/popular:translate-x-0.5 group-hover/popular:text-slate-900'>{item.title}</div>
                <div className='mt-0.5 flex items-center gap-1 text-[11px] text-slate-400'>
                  <span>{item.board}게시판</span>
                  <span>·</span>
                  <span className='flex items-center gap-0.5'><Heart className='size-2.5' />{item.likeCount}</span>
                  <span className='flex items-center gap-0.5'><Eye className='size-2.5' />{formatViews(item.viewCount)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

interface CommunityHomeProps {
  freePosts: Post[];
  secretPosts: Post[];
  noticePosts: Post[];
  latestProducts: Product[];
  popular: PopularItem[];
}

export default function CommunityHome({ freePosts, secretPosts, noticePosts, latestProducts, popular }: CommunityHomeProps) {
  return (
    <div className='min-h-screen bg-slate-50 px-4 py-5 sm:px-6 lg:px-[30px] lg:py-6'>
      <div className='mx-auto max-w-[1140px]'>
        <HomeBanner />
        <div className='flex flex-col items-stretch gap-4 xl:flex-row xl:items-start'>
          <div className='grid min-w-0 flex-1 grid-cols-1 items-start gap-4 lg:grid-cols-2'>
            <BoardCard title='자유게시판' href='/community/free'
              icon={<MessageSquare className='size-[15px] text-primary' />} iconBg='bg-primary/10' accentClass='text-primary' posts={freePosts} />
            <BoardCard title='익명게시판' href='/community/secret'
              icon={<VenetianMask className='size-[15px] text-slate-500' />} iconBg='bg-slate-100' accentClass='text-slate-500' posts={secretPosts} />
            <BoardCard title='공지사항' href='/community/notice'
              icon={<Megaphone className='size-[15px] text-blue-500' />} iconBg='bg-blue-50' accentClass='text-blue-500' posts={noticePosts} />

            {/* 중고거래 */}
            <div className='group/card flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md'>
              <Link href='/community/market'
                className='flex items-center justify-between border-b border-border px-[16px] py-3.5 transition-colors hover:bg-slate-50'>
                <span className='flex items-center gap-2 text-[13.5px] font-bold tracking-tight text-slate-800'>
                  <span className='flex size-[28px] items-center justify-center rounded-lg bg-amber-50 transition-transform duration-300 group-hover/card:scale-105'>
                    <ShoppingBag className='size-[15px] text-amber-500' />
                  </span>
                  중고거래
                </span>
                <span className='flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors group-hover/card:text-primary'>더보기 <ChevronRight className='size-3 transition-transform group-hover/card:translate-x-0.5' /></span>
              </Link>
              <div className='flex-1'>
                {latestProducts.map((product) => (
                  <ProductRow key={product.productId} product={product} />
                ))}
              </div>
            </div>
          </div>
          <PopularRail popular={popular} />
        </div>
      </div>
    </div>
  );
}
