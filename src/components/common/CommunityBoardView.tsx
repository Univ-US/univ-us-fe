'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  ChevronLeft,
  Pencil,
  Heart,
  MessageCircle,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Post, BoardType } from '@/types/community';

// ── 페이지당 게시글 수 ─────────────────────────────────
const PAGE_SIZE = 10;

// ── 게시글 한 줄 ───────────────────────────────────────
function PostRow({
  post,
  isAnon,
  onOpen,
}: {
  post: Post;
  isAnon: boolean;
  onOpen: () => void;
}) {
  // 블라인드 처리된 게시글
  if (post.isBlind) {
    return (
      <button
        onClick={onOpen}
        className='flex w-full items-center gap-3 border-b border-border bg-slate-50 px-[18px] py-[15px] text-left'
      >
        <EyeOff className='size-[17px] shrink-0 text-muted-foreground/70' />
        <span className='min-w-0 flex-1 text-sm font-medium text-muted-foreground/70'>
          신고가 누적되어 블라인드 처리된 게시글이에요.
        </span>
        <span className='shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600'>
          신고 {post.reportCount}회
        </span>
        <ChevronRight className='size-4 text-muted-foreground/60' />
      </button>
    );
  }

  return (
    <button
      onClick={onOpen}
      className='flex w-full items-center gap-3.5 border-b border-border px-[18px] py-[15px] text-left transition-colors hover:bg-slate-50'
    >
      {/* 태그 or 카테고리 */}
      {post.tag ? (
        <span className='shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600'>
          {post.tag}
        </span>
      ) : (
        <span className='shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-primary'>
          {post.category}
        </span>
      )}

      {/* 제목 */}
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        <span className='truncate text-[14.5px] font-semibold'>
          {post.title}
        </span>
        {post.isHot && (
          <span className='shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600'>
            HOT
          </span>
        )}
      </div>

      {/* 작성자 + 날짜 */}
      <div className='flex w-[140px] shrink-0 items-center justify-end gap-2 text-xs text-muted-foreground'>
        <span className='truncate'>
          {isAnon ? '익명' : post.author} · {post.createdAt}
        </span>
      </div>

      {/* 좋아요 + 댓글 */}
      {!post.tag && (
        <div className='flex w-[80px] shrink-0 items-center justify-end gap-3 text-xs text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <Heart className='size-3.5' />
            {post.likeCount}
          </span>
          <span className='flex items-center gap-1'>
            <MessageCircle className='size-3.5' />
            {post.commentCount}
          </span>
        </div>
      )}

      <ChevronRight className='size-4 text-muted-foreground/60' />
    </button>
  );
}

// ── 페이지네이션 ───────────────────────────────────────
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const btnBase =
    'inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border px-1.5 text-[13.5px] font-bold transition-colors';

  return (
    <div className='flex items-center gap-2'>
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className={cn(
          btnBase,
          'border-border bg-card text-muted-foreground disabled:opacity-40',
        )}
      >
        <ChevronLeft className='size-4' />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={cn(
            btnBase,
            n === page
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-card text-muted-foreground',
          )}
        >
          {n}
        </button>
      ))}

      <button
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className={cn(
          btnBase,
          'border-border bg-card text-muted-foreground disabled:opacity-40',
        )}
      >
        <ChevronRight className='size-4' />
      </button>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
interface BoardViewProps {
  board: BoardType;
  posts: Post[];
}

export default function BoardView({ board, posts }: BoardViewProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const isAnon = board === 'secret';
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);
  const visiblePosts = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 게시글 상세는 다음 단계에서 추가할 거야
  if (selectedPost) {
    return (
      <div className='mx-auto max-w-[920px] px-6 py-7'>
        <button
          onClick={() => setSelectedPost(null)}
          className='mb-4 text-sm text-muted-foreground hover:text-foreground'
        >
          ← 목록으로
        </button>
        <p className='text-muted-foreground'>
          게시글 상세 — 다음 단계에서 작업 예정
        </p>
      </div>
    );
  }

  return (
    <div className='px-[30px] py-7'>
      <div className='mx-auto max-w-[920px]'>
        {/* 익명게시판 안내 */}
        {isAnon && (
          <div className='mb-4 flex items-center gap-2 rounded-[10px] border border-teal-200 bg-teal-50 px-3.5 py-3 text-[13px] text-teal-700'>
            익명게시판에서는 닉네임이 표시되지 않아요. 서로 존중하는 대화를
            부탁드려요.
          </div>
        )}

        {/* 게시글 목록 */}
        <div className='rounded-2xl border border-border bg-card overflow-hidden'>
          {visiblePosts.map((post) => (
            <PostRow
              key={post.postId}
              post={post}
              isAnon={isAnon}
              onOpen={() => setSelectedPost(post)}
            />
          ))}
        </div>

        {/* 하단 - 페이지네이션 + 글쓰기 */}
        <div className='relative mt-5 flex justify-center'>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          <div className='absolute right-0'>
            <Button onClick={() => router.push(`/community/${board}/write`)}>
              <Pencil className='size-4' />
              글쓰기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
