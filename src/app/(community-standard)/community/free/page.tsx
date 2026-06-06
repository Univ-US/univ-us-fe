'use client';

import { useEffect, useState } from 'react';
import CommunityBoardView from '@/components/common/CommunityBoardView';
import { getPostList } from '@/lib/postApi';
import type { Post } from '@/types/community';

const FREE_BOARD_ID = 1; // DB BOARD_TYPE 테이블 기준

export default function FreeBoardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const data = await getPostList({ boardId: FREE_BOARD_ID, page: 1, size: 50 });
        const postList: Post[] = data.postList ?? [];
        setPosts(postList);
      } catch (err) {
        console.error('FreeBoardPage fetch error:', err);
        setError('게시글을 불러오는 데 실패했어. 백엔드가 켜져 있는지 확인해줘.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400 text-[14px]">
        게시글 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-400 text-[14px]">
        {error}
      </div>
    );
  }

  return <CommunityBoardView board="free" posts={posts} />;
}
