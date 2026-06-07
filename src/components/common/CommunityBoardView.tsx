'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronLeft,
  Pencil,
  Heart,
  MessageCircle,
  EyeOff,
  Eye,
  MessageSquare,
  VenetianMask,
  Megaphone,
  Bell,
  Shield,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import CommunityBoardDetail from '@/components/common/CommunityBoardDetail';
import { getPostById } from '@/lib/postApi';
import type { Post, BoardType } from '@/types/community';

const PAGE_SIZE = 10;

const BOARD_META: Record<BoardType, {
  label: string; desc: string; icon: React.ReactNode;
  categories: string[]; rules: string[];
  headerBg: string;
  iconBg: string;
  badgeBg: string;
  accentText: string;
}> = {
  free: {
    label: '자유게시판', desc: '캠퍼스 생활의 모든 이야기를 자유롭게 나누는 공간이에요.',
    icon: <MessageSquare className='size-5 text-primary' />,
    categories: ['전체', '일상', '정보', '질문', '잡답', '모임'],
    rules: ['서로 존중하는 말투를 사용해요.', '광고·도배·욕설은 삭제될 수 있어요.', '개인정보가 담긴 글은 피해주세요.'],
    headerBg: 'bg-gradient-to-br from-teal-50 via-white to-emerald-50 border-teal-100',
    iconBg: 'bg-primary/10',
    badgeBg: 'bg-primary/10 text-primary',
    accentText: 'text-primary',
  },
  secret: {
    label: '익명게시판', desc: '익명으로 편하게 고민을 나눌 수 있는 공간이에요.',
    icon: <VenetianMask className='size-5 text-slate-500' />,
    categories: ['전체', '고민', '잡담', '질문'],
    rules: ['익명이어도 서로 존중해요.', '특정인 비방은 제재 대상이에요.', '개인정보 노출에 주의해주세요.'],
    headerBg: 'bg-gradient-to-br from-slate-50 via-white to-gray-50 border-slate-200',
    iconBg: 'bg-slate-100',
    badgeBg: 'bg-slate-100 text-slate-600',
    accentText: 'text-slate-600',
  },
  notice: {
    label: '공지사항', desc: '학교·운영진이 작성하는 중요 공지를 확인하세요.',
    icon: <Megaphone className='size-5 text-blue-500' />,
    categories: ['전체', '학사', '시설', '생활', '장학'],
    rules: ['공지사항은 운영진만 작성할 수 있어요.', '중요 공지를 놓치지 않도록 확인해주세요.', '문의는 학교 홈페이지를 이용해주세요.'],
    headerBg: 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-blue-100',
    iconBg: 'bg-blue-50',
    badgeBg: 'bg-blue-100 text-blue-600',
    accentText: 'text-blue-500',
  },
};

const BOARD_TABS: { key: BoardType; label: string; icon: React.ReactNode }[] = [
  { key: 'free',   label: '자유게시판', icon: <MessageSquare className='size-3.5' /> },
  { key: 'secret', label: '익명게시판', icon: <VenetianMask  className='size-3.5' /> },
  { key: 'notice', label: '공지사항',   icon: <Megaphone     className='size-3.5' /> },
];

function PostRow({ post, isAnon, isNotice, onOpen }: {
  post: Post; isAnon: boolean; isNotice: boolean; onOpen: () => void;
}) {
  if (post.isBlind) {
    return (
      <button onClick={onOpen} className='flex w-full items-center gap-3 border-b border-border bg-slate-50 px-[18px] py-[15px] text-left last:border-0'>
        <EyeOff className='size-[17px] shrink-0 text-slate-300' />
        <span className='min-w-0 flex-1 text-[13px] font-medium text-slate-400'>신고가 누적되어 블라인드 처리된 게시글이에요.</span>
        <span className='shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-500'>신고 {post.reportCount}회</span>
        <ChevronRight className='size-4 text-slate-300' />
      </button>
    );
  }
  return (
    <button onClick={onOpen} className='flex w-full items-center gap-[14px] border-b border-border px-[18px] py-[15px] text-left transition-colors last:border-0 hover:bg-slate-50'>
      <div className='w-[40px] shrink-0 flex justify-center'>
        {post.tag ? (
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', post.tag === '중요' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600')}>{post.tag}</span>
        ) : (
          <span className='rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-bold text-slate-500 whitespace-nowrap'>{post.category}</span>
        )}
      </div>
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        <span className='truncate text-[13px] font-semibold text-slate-800'>{post.title}</span>
        {post.isHot && <span className='shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-500'>HOT</span>}
      </div>
      {isNotice ? (
        <div className='flex shrink-0 items-center gap-3 text-[12px] text-slate-400'>
          <span className='whitespace-nowrap'>{formatDate(post.createdAt)}</span>
          {!post.tag && (
            <span className='flex items-center gap-0.5'>
              <Eye className='size-3 shrink-0' />
              <span className='tabular-nums'>{post.viewCount}</span>
            </span>
          )}
        </div>
      ) : (
        <>
          <div className={cn('flex shrink-0 items-center', isAnon ? 'w-[90px]' : 'w-[130px]')}>
            <span className='truncate text-[12px] text-slate-400'>
              {isAnon ? `익명 · ${formatDate(post.createdAt)}` : `${post.authorName} · ${formatDate(post.createdAt)}`}
            </span>
          </div>
          {!post.tag && (
            <div className='flex w-[100px] shrink-0 items-center justify-end gap-1.5 text-[12px] text-slate-400'>
              <span className='flex items-center gap-0.5'><Heart className='size-3 shrink-0' /><span className='inline-block w-[20px] tabular-nums'>{post.likeCount}</span></span>
              <span className='flex items-center gap-0.5'><MessageCircle className='size-3 shrink-0' /><span className='inline-block w-[20px] tabular-nums'>{post.commentCount}</span></span>
              <span className='flex items-center gap-0.5'><Eye className='size-3 shrink-0' /><span className='inline-block w-[20px] tabular-nums'>{post.viewCount}</span></span>
            </div>
          )}
        </>
      )}
      <ChevronRight className='size-4 shrink-0 text-slate-300' />
    </button>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const btnBase = 'inline-flex h-[30px] min-w-[30px] items-center justify-center rounded-lg border text-[12px] font-bold transition-colors';
  return (
    <div className='flex items-center gap-1.5'>
      <button disabled={page === 1} onClick={() => onChange(page - 1)} className={cn(btnBase, 'border-border bg-white text-slate-400 hover:border-primary hover:text-primary disabled:opacity-40')}><ChevronLeft className='size-3.5' /></button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button key={n} onClick={() => onChange(n)} className={cn(btnBase, n === page ? 'border-primary bg-primary text-white' : 'border-border bg-white text-slate-500 hover:border-primary hover:text-primary')}>{n}</button>
      ))}
      <button disabled={page === totalPages} onClick={() => onChange(page + 1)} className={cn(btnBase, 'border-border bg-white text-slate-400 hover:border-primary hover:text-primary disabled:opacity-40')}><ChevronRight className='size-3.5' /></button>
    </div>
  );
}

function SidePopular({ posts, onOpen }: { posts: Post[]; onOpen: (post: Post) => void }) {
  const top5 = posts.filter((p) => !p.isBlind).sort((a, b) => b.likeCount - a.likeCount).slice(0, 5);
  return (
    <div className='overflow-hidden rounded-2xl border border-border bg-white shadow-sm'>
      <div className='flex items-center gap-2 border-b border-border px-4 py-3.5'>
        <Heart className='size-4 text-red-400' />
        <span className='text-[14px] font-bold text-slate-800'>이 게시판 인기글</span>
      </div>
      <div>
        {top5.map((post, i) => (
          <button key={post.postId} onClick={() => onOpen(post)} className='flex w-full items-start gap-2.5 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50'>
            <span className={cn('mt-0.5 shrink-0 text-[13px] font-extrabold tabular-nums', i < 3 ? 'text-primary' : 'text-slate-300')}>{i + 1}</span>
            <div className='min-w-0 flex-1'>
              <div className='truncate text-[12px] font-medium text-slate-700'>{post.title}</div>
              <div className='mt-0.5 flex items-center gap-2 text-[11px] text-slate-400'>
                <span className='flex items-center gap-1'><Heart className='size-2.5' />{post.likeCount}</span>
                <span className='flex items-center gap-1'><MessageCircle className='size-2.5' />{post.commentCount}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SideRules({ rules }: { rules: string[] }) {
  return (
    <div className='overflow-hidden rounded-2xl border border-border bg-white shadow-sm'>
      <div className='flex items-center gap-2 px-4 pt-4 pb-1'>
        <Shield className='size-4 text-primary' />
        <span className='text-[14px] font-bold text-slate-800'>게시판 이용 안내</span>
      </div>
      <div className='px-4 pb-4'>
        {rules.map((rule, i) => (
          <div key={i} className='flex items-start gap-2 py-1'>
            <Check className='mt-0.5 size-3.5 shrink-0 text-primary' />
            <span className='text-[12px] leading-relaxed text-slate-500'>{rule}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CommunityBoardViewProps {
  board: BoardType;
  posts: Post[];
  onRefresh?: () => void;
}

export default function CommunityBoardView({ board, posts, onRefresh }: CommunityBoardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [sortBy, setSortBy] = useState<'최신순' | '인기순' | '댓글순'>('최신순');

  const isAnon = board === 'secret';
  const meta = BOARD_META[board];

  useEffect(() => {
    const postIdParam = searchParams.get('postId');
    if (!postIdParam) return;
    const postId = Number(postIdParam);
    if (selectedPost?.postId === postId) return;
    const found = posts.find((p) => p.postId === postId);
    if (found) { setSelectedPost(found); }
    else { getPostById(postId).then((data) => setSelectedPost(data)).catch(() => {}); }
  }, [searchParams, posts]);

  const filteredPosts = selectedCategory === '전체' ? posts : posts.filter((p) => p.category === selectedCategory);
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === '인기순') return b.likeCount - a.likeCount;
    if (sortBy === '댓글순') return b.commentCount - a.commentCount;
    return 0;
  });
  const totalPages = Math.ceil(sortedPosts.length / PAGE_SIZE);
  const visiblePosts = sortedPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleBack = () => {
    setSelectedPost(null);
    router.replace(`/community/${board}`);
    onRefresh?.();
  };

  if (selectedPost) {
    return (
      <div className='min-h-screen bg-slate-50 px-[30px] py-6'>
        <CommunityBoardDetail
          post={selectedPost}
          isAnon={isAnon}
          board={board}
          onBack={handleBack}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-50 px-[30px] py-6'>
      <div className='mx-auto max-w-[1140px]'>
        <div className='mb-5 flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit'>
          {BOARD_TABS.map((tab) => (
            <Link key={tab.key} href={`/community/${tab.key}`}
              className={cn('flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all',
                board === tab.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              {tab.icon}{tab.label}
            </Link>
          ))}
        </div>

        <div className='flex items-start gap-5'>
          <div className='min-w-0 flex-1'>
            <div className={cn('mb-4 overflow-hidden rounded-2xl border p-7 shadow-sm', meta.headerBg)}>
              <div className='flex items-start gap-4'>
                <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-sm', meta.iconBg)}>
                  {meta.icon}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <h1 className='text-[18px] font-extrabold text-slate-900'>{meta.label}</h1>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', meta.badgeBg)}>
                      전체 {posts.length}
                    </span>
                  </div>
                  <p className='mt-1 text-[13px] text-slate-500'>{meta.desc}</p>
                  <div className='mt-4 flex items-center gap-4'>
                    <span className='flex items-center gap-1.5 text-[12px] text-slate-400'>
                      <svg className='size-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' /><circle cx='9' cy='7' r='4' />
                        <path d='M23 21v-2a4 4 0 0 0-3-3.87' /><path d='M16 3.13a4 4 0 0 1 0 7.75' />
                      </svg>
                      멤버 <b className='text-slate-600'>12,480</b>
                    </span>
                    <span className='flex items-center gap-1.5 text-[12px] text-slate-400'>
                      <svg className='size-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M12 20h9' /><path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' />
                      </svg>
                      오늘 <b className={meta.accentText}>64</b>개의 새 글
                    </span>
                  </div>
                </div>
                {/* 알림 버튼 — 흰 배경 + 명확한 테두리 */}
                <button className='flex shrink-0 size-[34px] items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400 shadow-sm transition-colors hover:border-primary hover:text-primary'>
                  <Bell className='size-[16px]' />
                </button>
              </div>
            </div>

            <div className='mb-3 flex items-center justify-between'>
              <div className='flex flex-wrap gap-1.5'>
                {meta.categories.map((cat) => (
                  <button key={cat} onClick={() => { setSelectedCategory(cat); setPage(1); }}
                    className={cn('rounded-full border px-3 py-1 text-[12px] font-semibold transition-all',
                      selectedCategory === cat ? 'border-primary bg-primary text-white' : 'border-border bg-white text-slate-500 hover:border-primary hover:text-primary')}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className='flex items-center gap-1 text-[11px] text-slate-400'>
                {(['최신순', '인기순', '댓글순'] as const).map((s, i) => (
                  <span key={s} className='flex items-center'>
                    {i > 0 && <span className='mx-1'>·</span>}
                    <button onClick={() => setSortBy(s)} className={cn('font-semibold transition-colors', sortBy === s ? 'text-primary' : 'hover:text-slate-700')}>{s}</button>
                  </span>
                ))}
              </div>
            </div>

            <div className='overflow-hidden rounded-2xl border border-border bg-white shadow-sm'>
              {visiblePosts.length === 0 ? (
                <div className='py-16 text-center text-[13px] text-slate-400'>게시글이 없어요.</div>
              ) : (
                visiblePosts.map((post) => (
                  <PostRow key={post.postId} post={post} isAnon={isAnon} isNotice={board === 'notice'} onOpen={() => setSelectedPost(post)} />
                ))
              )}
            </div>

            <div className='relative mt-5 flex justify-center'>
              <Pagination page={page} totalPages={totalPages} onChange={(p) => { setPage(p); setSelectedPost(null); }} />
              {board !== 'notice' && (
                <div className='absolute right-0'>
                  <Button onClick={() => router.push(`/community/${board}/write`)} className='shadow-sm'>
                    <Pencil className='size-3.5' />글쓰기
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className='w-[280px] shrink-0'>
            <div className='sticky top-20 flex flex-col gap-4'>
              <SidePopular posts={posts} onOpen={setSelectedPost} />
              <SideRules rules={meta.rules} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
