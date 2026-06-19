'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoardBadge, formatDate, getBoardLabel, getPostDetailHref, SectionTitle } from './shared';
import type { MyComment } from '@/types/mypage';
import { getMyComments } from '@/lib/cmypageApi';
import Link from 'next/link';

const PAGE_SIZE = 8;

const S = {
  emptyState: 'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50/50 py-16 text-center',
  emptyIcon: 'mb-3 size-10 text-slate-300',
  emptyText: 'text-[14px] font-medium text-slate-500',
  listContainer: 'overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
  listItem: 'block px-[18px] py-3.5 text-left transition-colors hover:bg-slate-50',
  listBorder: 'border-b border-border',
  content: 'mb-2 text-[14px] font-semibold text-slate-800',
  metaGroup: 'flex items-center gap-2 text-[12px] text-slate-400',
  chevron: 'size-3.5',
  postTitle: 'min-w-0 truncate',
  date: 'shrink-0',
  moreWrap: 'mt-4 flex justify-center',
  moreButton: 'rounded-xl border border-border bg-white px-5 py-2 text-[13px] font-bold text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary active:translate-y-0',
};

export default function MyComments() {
  const [comments, setComments] = useState<MyComment[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadComments = useCallback(async (nextPage: number, append: boolean) => {
    setLoadingMore(true);
    try {
      const data = await getMyComments(nextPage, PAGE_SIZE);
      const nextComments = data.content.map((c) => ({
          commentId: c.commentId,
          postId: c.postId,
          boardId: c.boardId,
          content: c.content,
          postTitle: c.postTitle,
          board: c.boardName ?? getBoardLabel(c.boardId),
          boardName: c.boardName,
          createdAt: String(c.createdAt),
      }));
      setComments((current) => append ? [...current, ...nextComments] : nextComments);
      setPage(data.page);
      setTotalElements(data.totalElements);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadComments(0, false);
  }, [loadComments]);

  const hasMore = comments.length < totalElements;

  return (
    <>
      <SectionTitle sub={`작성한 댓글 ${totalElements}개`}>
        내가 쓴 댓글
      </SectionTitle>
      {comments.length === 0 ? (
        <div className={S.emptyState}>
          <MessageSquare className={S.emptyIcon} />
          <p className={S.emptyText}>작성한 댓글이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className={S.listContainer}>
            {comments.map((comment, i) => (
              <Link
                key={comment.commentId}
                href={getPostDetailHref(comment.boardId, comment.postId)}
                className={cn(S.listItem, i < comments.length - 1 && S.listBorder)}
              >
                <p className={S.content}>{comment.content}</p>
                <div className={S.metaGroup}>
                  <BoardBadge board={comment.board} />
                  <ChevronRight className={S.chevron} />
                  <span className={S.postTitle}>{comment.postTitle}</span>
                  <span>·</span>
                  <span className={S.date}>{formatDate(comment.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
          {hasMore && (
            <div className={S.moreWrap}>
              <button
                type='button'
                className={S.moreButton}
                disabled={loadingMore}
                onClick={() => void loadComments(page + 1, true)}
              >
                {loadingMore ? '불러오는 중' : `더보기 ${comments.length} / ${totalElements}`}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
