'use client';

import { useEffect, useState } from 'react';
import CommunityHome from '@/components/common/CommunityHome';
import { getPostList } from '@/lib/postApi';
import type { Post } from '@/types/community';

export default function CommunityHomePage() {
  const [freePosts, setFreePosts] = useState<Post[]>([]);
  const [secretPosts, setSecretPosts] = useState<Post[]>([]);
  const [noticePosts, setNoticePosts] = useState<Post[]>([]);
  const [popular, setPopular] = useState<{ postId: number; title: string; board: string; boardPath: string; viewCount: number; likeCount: number; commentCount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [freeData, secretData, noticeData] = await Promise.all([
          getPostList({ boardId: 1, page: 1, size: 5 }),
          getPostList({ boardId: 2, page: 1, size: 5 }),
          getPostList({ boardId: 3, page: 1, size: 3 }),
        ]);

        const free: Post[]   = freeData.postList   ?? [];
        const secret: Post[] = secretData.postList ?? [];
        const notice: Post[] = noticeData.postList ?? [];

        setFreePosts(free);
        setSecretPosts(secret);
        setNoticePosts(notice);

        // 전체 게시글 합쳐서 좋아요*3 + 댓글*2 + 조회수 합산 TOP 5 인기글
        const boardLabel: Record<number, string> = { 1: '자유', 2: '익명', 3: '공지' };
        const boardPath: Record<number, string>  = { 1: 'free', 2: 'secret', 3: 'notice' };
        const all = [...free, ...secret, ...notice];
        const top5 = all
          .sort((a, b) => (b.likeCount * 3 + b.commentCount * 2 + b.viewCount) - (a.likeCount * 3 + a.commentCount * 2 + a.viewCount))
          .slice(0, 5)
          .map((p) => ({
            postId:       p.postId,
            title:        p.title,
            board:        boardLabel[p.boardId] ?? '기타',
            boardPath:    boardPath[p.boardId]  ?? 'free',
            viewCount:    p.viewCount,
            likeCount:    p.likeCount,
            commentCount: p.commentCount,
          }));
        setPopular(top5);
      } catch (err) {
        console.error('CommunityHomePage fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400 text-[14px]">
        불러오는 중...
      </div>
    );
  }

  return (
    <CommunityHome
      freePosts={freePosts}
      secretPosts={secretPosts}
      noticePosts={noticePosts}
      latestProducts={[]}
      popular={popular}
    />
  );
}
