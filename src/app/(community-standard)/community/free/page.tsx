'use client';

import { useEffect, useState, useCallback } from 'react';
import CommunityBoardView from '@/components/common/CommunityBoardView';
import { getPostList } from '@/lib/postApi';
import type { Post } from '@/types/community';

const FREE_BOARD_ID = 1;

export default function FreeBoardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await getPostList({ boardId: FREE_BOARD_ID, page: 1, size: 50 });
      setPosts(data.postList ?? []);
    } catch (err) {
      console.error('FreeBoardPage fetch error:', err);
      setError('게시글을 불러오는 데 실패했어. 백엔드가 켜져 있는지 확인해줘.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchPosts();
    })();
  }, [fetchPosts]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400 text-[14px]">게시글 불러오는 중...</div>;
  if (error) return <div className="flex min-h-screen items-center justify-center text-red-400 text-[14px]">{error}</div>;

  return <CommunityBoardView board="free" posts={posts} onRefresh={fetchPosts} />;
}
