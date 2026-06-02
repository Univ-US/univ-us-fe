"use client";

import Link from "next/link";
import {
  ChevronRight, Flame, MessageSquare, VenetianMask,
  Megaphone, ShoppingBag, Eye, Heart, Star, Smile, MessageCircle,
} from "lucide-react";
import type { Post, Product } from "@/types/community";

// ── 가격 포맷 ──────────────────────────────────────────
function formatPrice(price: number) {
  return price === 0 ? "나눔" : price.toLocaleString("ko-KR") + "원";
}

// ── 조회수 포맷 ────────────────────────────────────────
function formatViews(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);
}

// ── 상단 배너 ──────────────────────────────────────────
function HomeBanner() {
  const tiles = [
    { emoji: "💬", style: "left-[138px] top-1.5 size-[70px] -rotate-6 z-30 bg-gradient-to-br from-primary to-teal-700" },
    { emoji: "❤️", style: "left-[60px] top-10 size-14 rotate-[10deg] z-20 bg-gradient-to-br from-teal-400 to-primary" },
    { emoji: "⭐", style: "left-[196px] top-[86px] size-[52px] rotate-12 z-20 bg-gradient-to-br from-green-400 to-green-600" },
    { emoji: "😊", style: "left-24 top-[110px] size-[46px] -rotate-[10deg] z-10 bg-gradient-to-br from-blue-400 to-blue-600" },
  ];

  return (
    <div className="mb-6 flex items-center justify-between gap-6 overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-teal-50 to-blue-50 px-8 py-8 shadow-sm">
      <div className="relative z-10 min-w-0">
        {/* 접속자 수 뱃지 */}
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-primary shadow-sm ring-1 ring-primary/10">
          <span className="size-[7px] animate-pulse rounded-full bg-primary" />
          지금 2,345명 접속 중
        </span>

        {/* 슬로건 */}
        <h2 className="mt-4 text-[28px] font-extrabold leading-[1.34] tracking-tight text-slate-900">
          좋은 사람들이 모여
          <br />
          <span className="text-primary">더 나은 캠퍼스</span>를 만들어요
        </h2>
        <p className="mt-2.5 text-[14.5px] text-slate-500">
          관심사로 연결되고, 함께 성장하는 우리들의 공간
        </p>
      </div>

      {/* 우측 타일 */}
      <div className="relative size-[176px] w-[230px] shrink-0">
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

// ── 게시글 한 줄 ───────────────────────────────────────
function PostRow({
  post,
  href,
  accentClass,
}: {
  post: Post;
  href: string;
  accentClass: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 border-b border-border px-[18px] py-[11px] transition-colors last:border-0 hover:bg-slate-50"
    >
      {post.tag ? (
        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">
          {post.tag}
        </span>
      ) : (
        <span className={`w-[34px] shrink-0 text-[11.5px] font-bold ${accentClass}`}>
          {post.category}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-slate-700">
        {post.title}
      </span>
      {post.isHot && (
        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-500">
          HOT
        </span>
      )}
      {post.commentCount > 0 && (
        <span className="flex shrink-0 items-center gap-1 text-[11.5px] text-slate-400">
          <MessageSquare className="size-3" />
          {post.commentCount}
        </span>
      )}
      <span className="w-[46px] shrink-0 text-right text-[11.5px] text-slate-400">
        {post.createdAt}
      </span>
    </Link>
  );
}

// ── 게시판 카드 ────────────────────────────────────────
function BoardCard({
  title,
  href,
  icon,
  iconBg,
  accentClass,
  posts,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  accentClass: string;
  posts: Post[];
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      {/* 카드 헤더 */}
      <Link
        href={href}
        className="flex items-center justify-between border-b border-border px-[18px] py-4 transition-colors hover:bg-slate-50"
      >
        <span className="flex items-center gap-2.5 text-[15px] font-bold tracking-tight text-slate-800">
          <span className={`flex size-[32px] items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </span>
          {title}
        </span>
        <span className="flex items-center gap-1 text-[12.5px] font-semibold text-slate-400">
          더보기 <ChevronRight className="size-[14px]" />
        </span>
      </Link>

      {/* 게시글 목록 */}
      <div className="flex-1 divide-y divide-border">
        {posts.map((post) => (
          <PostRow
            key={post.postId}
            post={post}
            href={href}
            accentClass={accentClass}
          />
        ))}
      </div>
    </div>
  );
}

// ── 중고거래 한 줄 ─────────────────────────────────────
function ProductRow({ product }: { product: Product }) {
  return (
    <Link
      href={`/community/market/${product.productId}`}
      className="flex items-center gap-3 border-b border-border px-[18px] py-2.5 transition-colors last:border-0 hover:bg-slate-50"
    >
      <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-primary to-teal-700">
        <ShoppingBag className="size-4 text-white" />
      </div>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-slate-700">
        {product.productName}
      </span>
      <span className="shrink-0 text-[13.5px] font-bold text-slate-800">
        {formatPrice(product.price)}
      </span>
      <span className="w-[46px] shrink-0 text-right text-[11.5px] text-slate-400">
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
    자유: "/community/free",
    익명: "/community/secret",
    공지: "/community/notice",
  };

  return (
    <div className="w-[300px] shrink-0">
      <div className="sticky top-20 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {/* 헤더 */}
        <div className="flex items-center gap-2 border-b border-border px-[18px] py-4">
          <Flame className="size-[18px] text-orange-500" />
          <span className="text-[15px] font-bold tracking-tight text-slate-800">인기글</span>
          <span className="ml-auto text-xs text-slate-400">조회수 TOP</span>
        </div>

        {/* 목록 */}
        <div>
          {popular.map((item, i) => (
            <Link
              key={i}
              href={toHref[item.board] ?? "/community"}
              className="flex items-center gap-3 border-b border-border px-[18px] py-3 transition-colors last:border-0 hover:bg-slate-50"
            >
              <span
                className={`w-5 shrink-0 text-[15px] font-extrabold tabular-nums ${
                  i < 3 ? "text-primary" : "text-slate-300"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-slate-700">
                  {item.title}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>{item.board}게시판</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Eye className="size-3" />
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
    <div className="min-h-screen bg-slate-50 px-[30px] py-7">
      <div className="mx-auto max-w-[1140px]">

        {/* 배너 */}
        <HomeBanner />

        <div className="flex items-start gap-5">
          {/* 게시판 그리드 */}
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-4">

            {/* 자유게시판 */}
            <BoardCard
              title="자유게시판"
              href="/community/free"
              icon={<MessageSquare className="size-[17px] text-primary" />}
              iconBg="bg-primary/10"
              accentClass="text-primary"
              posts={freePosts}
            />

            {/* 익명게시판 */}
            <BoardCard
              title="익명게시판"
              href="/community/secret"
              icon={<VenetianMask className="size-[17px] text-slate-500" />}
              iconBg="bg-slate-100"
              accentClass="text-slate-500"
              posts={secretPosts}
            />

            {/* 공지사항 */}
            <BoardCard
              title="공지사항"
              href="/community/notice"
              icon={<Megaphone className="size-[17px] text-blue-500" />}
              iconBg="bg-blue-50"
              accentClass="text-blue-500"
              posts={noticePosts}
            />

            {/* 중고거래 */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <Link
                href="/community/market"
                className="flex items-center justify-between border-b border-border px-[18px] py-4 transition-colors hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5 text-[15px] font-bold tracking-tight text-slate-800">
                  <span className="flex size-[32px] items-center justify-center rounded-xl bg-amber-50">
                    <ShoppingBag className="size-[17px] text-amber-500" />
                  </span>
                  중고거래
                </span>
                <span className="flex items-center gap-1 text-[12.5px] font-semibold text-slate-400">
                  더보기 <ChevronRight className="size-[14px]" />
                </span>
              </Link>
              <div className="flex-1">
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