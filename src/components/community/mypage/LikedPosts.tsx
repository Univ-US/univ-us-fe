'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoardBadge, SectionTitle } from './shared';
import type { MyPost } from '@/types/mypage';
import { getLikedPosts } from '@/lib/cmypageApi';

const S = {
  emptyState: 'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50/50 py-16 text-center',
  emptyIcon: 'mb-3 size-10 text-slate-300',
  emptyText: 'text-[14px] font-medium text-slate-500',
  listContainer: 'overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
  listItem: 'flex items-center gap-3 px-[18px] py-3.5 transition-colors hover:bg-slate-50',
  listBorder: 'border-b border-border',
  title: 'min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-800',
  metaGroup: 'flex shrink-0 items-center gap-3 text-[12px] text-slate-400',
  metaItem: 'flex items-center gap-1',
  metaIcon: 'size-3.5',
  date: 'w-[46px] text-right',
};

export default function LikedPosts() {
  const [posts, setPosts] = useState<MyPost[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getLikedPosts();
        const boardLabels: Record<number, string> = { 1: '자유', 2: '익명', 3: '공지' };
        setPosts(data.map((p: any) => ({
          postId: p.postId,
          title: p.title,
          board: boardLabels[p.boardId] ?? '기타',
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

  return (
    <>
      <SectionTitle sub='좋아요한 글을 모아봐요'>좋아요한 글</SectionTitle>
      {posts.length === 0 ? (
        <div className={S.emptyState}>
          <Heart className={S.emptyIcon} />
          <p className={S.emptyText}>좋아요 한 글이 없습니다.</p>
        </div>
      ) : (
        <div className={S.listContainer}>
          {posts.map((post, i) => (
            <div
              key={post.postId}
              className={cn(S.listItem, i < posts.length - 1 && S.listBorder)}
            >
              <BoardBadge board={post.board} />
              <span className={S.title}>{post.title}</span>
              <div className={S.metaGroup}>
                <span className={S.metaItem}>
                  <Heart className={S.metaIcon} />
                  {post.likeCount}
                </span>
                <span className={S.date}>{post.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
