'use client';

import { useEffect, useState } from 'react';
import { Heart, MessageSquare, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BoardBadge, getBoardLabel, getPostDetailHref, SectionTitle } from './shared';
import type { MyPost } from '@/types/mypage';
import { getMyPosts } from '@/lib/cmypageApi';
import type { Post } from '@/types/community';
import Link from 'next/link';

const PAGE_SIZE = 8;

const S = {
  emptyState: 'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50/50 py-16 text-center',
  emptyIcon: 'mb-3 size-10 text-slate-300',
  emptyText: 'mb-4 text-[14px] font-medium text-slate-500',
  listContainer: 'overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
  listItem: 'flex items-center gap-3 px-[18px] py-3.5 text-left transition-colors hover:bg-slate-50',
  listBorder: 'border-b border-border',
  title: 'min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-800',
  metaGroup: 'flex shrink-0 items-center gap-3 text-[12px] text-slate-400',
  metaItem: 'flex items-center gap-1',
  metaIcon: 'size-3.5',
  date: 'w-[46px] text-right',
  moreWrap: 'mt-4 flex justify-center',
  moreButton: 'rounded-xl border border-border bg-white px-5 py-2 text-[13px] font-bold text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary active:translate-y-0',
};

export default function MyPosts() {
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getMyPosts();
        setPosts(data.map((p: Post) => ({
          postId: p.postId,
          boardId: p.boardId,
          title: p.title,
          board: getBoardLabel(p.boardId),
          createdAt: String(p.createdAt),
          likeCount: p.likeCount,
          commentCount: p.commentCount,
        })));
      } catch (e) {
        console.error(e);
      }
    };
    fetchPosts();
  }, []);

  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  return (
    <>
      <SectionTitle sub={`작성한 글 ${posts.length}개`}>
        내가 쓴 글
      </SectionTitle>
      {posts.length === 0 ? (
        <div className={S.emptyState}>
          <FileText className={S.emptyIcon} />
          <p className={S.emptyText}>작성한 글이 없습니다.</p>
          <Link href="/community">
            <Button variant='outline' size='sm'>
              새 글 쓰러가기
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className={S.listContainer}>
            {visiblePosts.map((post, i) => (
              <Link
                key={post.postId}
                href={getPostDetailHref(post.boardId, post.postId)}
                className={cn(S.listItem, i < visiblePosts.length - 1 && S.listBorder)}
              >
                <BoardBadge board={post.board} />
                <span className={S.title}>{post.title}</span>
                <div className={S.metaGroup}>
                  <span className={S.metaItem}>
                    <Heart className={S.metaIcon} />
                    {post.likeCount}
                  </span>
                  <span className={S.metaItem}>
                    <MessageSquare className={S.metaIcon} />
                    {post.commentCount}
                  </span>
                  <span className={S.date}>{post.createdAt}</span>
                </div>
              </Link>
            ))}
          </div>
          {hasMore && (
            <div className={S.moreWrap}>
              <button
                type='button'
                className={S.moreButton}
                onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
              >
                더보기 {visibleCount} / {posts.length}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
