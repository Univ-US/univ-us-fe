'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoardBadge, SectionTitle } from './shared';
import type { MyComment } from '@/types/mypage';
import { getMyComments } from '@/lib/cmypageApi';

const S = {
  emptyState: 'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50/50 py-16 text-center',
  emptyIcon: 'mb-3 size-10 text-slate-300',
  emptyText: 'text-[14px] font-medium text-slate-500',
  listContainer: 'overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
  listItem: 'px-[18px] py-3.5 transition-colors hover:bg-slate-50',
  listBorder: 'border-b border-border',
  content: 'mb-2 text-[14px] font-semibold text-slate-800',
  metaGroup: 'flex items-center gap-2 text-[12px] text-slate-400',
  chevron: 'size-3.5',
  postTitle: 'min-w-0 truncate',
  date: 'shrink-0',
};

export default function MyComments() {
  const [comments, setComments] = useState<MyComment[]>([]);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await getMyComments();
        setComments(data.map((c: MyComment & { boardName?: string }) => ({
          commentId: c.commentId,
          content: c.content,
          postTitle: c.postTitle,
          board: c.boardName ?? '기타',
          createdAt: String(c.createdAt),
        })));
      } catch (e) {
        console.error(e);
      }
    };
    fetchComments();
  }, []);

  return (
    <>
      <SectionTitle sub={`작성한 댓글 ${comments.length}개`}>
        내가 쓴 댓글
      </SectionTitle>
      {comments.length === 0 ? (
        <div className={S.emptyState}>
          <MessageSquare className={S.emptyIcon} />
          <p className={S.emptyText}>작성한 댓글이 없습니다.</p>
        </div>
      ) : (
        <div className={S.listContainer}>
          {comments.map((comment, i) => (
            <div
              key={comment.commentId}
              className={cn(S.listItem, i < comments.length - 1 && S.listBorder)}
            >
              <p className={S.content}>{comment.content}</p>
              <div className={S.metaGroup}>
                <BoardBadge board={comment.board} />
                <ChevronRight className={S.chevron} />
                <span className={S.postTitle}>{comment.postTitle}</span>
                <span>·</span>
                <span className={S.date}>{comment.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
