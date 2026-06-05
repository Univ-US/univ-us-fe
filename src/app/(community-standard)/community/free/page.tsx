'use client';

import { useEffect, useState } from 'react';
import CommunityBoardView from '@/components/common/CommunityBoardView';
import { getPostList } from '@/lib/postApi';
import type { Post } from '@/types/community';

export default function FreeBoardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getPostList({ boardId: 1, page: 1, size: 20 });
        setPosts(data.postList);
      } catch (error) {
        console.error('게시글 목록 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) return <div>로딩 중...</div>;

  return <CommunityBoardView board='free' posts={posts} />;
}