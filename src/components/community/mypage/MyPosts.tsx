'use client';

import { useCallback, useEffect, useState } from 'react';
import { Heart, MessageSquare, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BoardBadge, formatDate, getBoardLabel, getPostDetailHref, SectionTitle } from './shared';
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
  date: 'w-[72px] text-right',
  moreWrap: 'mt-4 flex justify-center',
  moreButton: 'rounded-xl border border-border bg-white px-5 py-2 text-[13px] font-bold text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary active:translate-y-0',
};

export default function MyPosts() {
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPosts = useCallback(async (nextPage: number, append: boolean) => {
    setLoadingMore(true);
    try {
      const data = await getMyPosts(nextPage, PAGE_SIZE);
      const nextPosts = data.content.map((p: Post) => ({
          postId: p.postId,
          boardId: p.boardId,
          title: p.title,
          board: getBoardLabel(p.boardId),
          createdAt: String(p.createdAt),
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          reportCount: p.reportCount,
          isBlind: p.isBlind,
      }));
      setPosts((current) => append ? [...current, ...nextPosts] : nextPosts);
      setPage(data.page);
      setTotalElements(data.totalElements);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts(0, false);
  }, [loadPosts]);

  const hasMore = posts.length < totalElements;

  return (
    <>
      <SectionTitle sub={`작성한 글 ${totalElements}개`}>
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
            {posts.map((post, i) => {
              const blind = Boolean(post.isBlind);

              return (
                <Link
                  key={post.postId}
                  href={getPostDetailHref(post.boardId, post.postId)}
                  className={cn(
                    S.listItem,
                    blind && 'bg-slate-50 text-slate-400 hover:bg-slate-100',
                    i < posts.length - 1 && S.listBorder,
                  )}
                >
                  <BoardBadge board={post.board} />
                  {blind && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">
                      블라인드
                    </span>
                  )}
                  <span className={cn(S.title, blind && 'text-slate-400')}>
                    {blind ? '신고 누적으로 블라인드 처리된 게시글입니다.' : post.title}
                  </span>
                  <div className={S.metaGroup}>
                    <span className={S.metaItem}>
                      <Heart className={S.metaIcon} />
                      {blind ? `신고 ${post.reportCount ?? 5}` : post.likeCount}
                    </span>
                    <span className={S.metaItem}>
                      <MessageSquare className={S.metaIcon} />
                      {post.commentCount}
                    </span>
                    <span className={S.date}>{formatDate(post.createdAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
          {hasMore && (
            <div className={S.moreWrap}>
              <button
                type='button'
                className={S.moreButton}
                disabled={loadingMore}
                onClick={() => void loadPosts(page + 1, true)}
              >
                {loadingMore ? '불러오는 중' : `더보기 ${posts.length} / ${totalElements}`}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
