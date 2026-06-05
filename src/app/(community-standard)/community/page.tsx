'use client';

import { useEffect, useState } from 'react';
import CommunityHome from '@/components/common/CommunityHome';
import { getPostList } from '@/lib/postApi';
import type { Post } from '@/types/community';
import { SAMPLE_PRODUCTS, SAMPLE_POPULAR } from '@/lib/sampleData';

export default function CommunityHomePage() {
  const [freePosts, setFreePosts] = useState<Post[]>([]);
  const [secretPosts, setSecretPosts] = useState<Post[]>([]);
  const [noticePosts, setNoticePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // 자유, 익명, 공지 동시에 호출
        const [freeData, secretData, noticeData] = await Promise.all([
          getPostList({ boardId: 1, page: 1, size: 5 }),
          getPostList({ boardId: 2, page: 1, size: 5 }),
          getPostList({ boardId: 3, page: 1, size: 3 }),
        ]);

        setFreePosts(freeData.postList);
        setSecretPosts(secretData.postList);
        setNoticePosts(noticeData.postList);
      } catch (error) {
        console.error('홈 게시글 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) return <div>로딩 중...</div>;

  return (
    <CommunityHome
      freePosts={freePosts}
      secretPosts={secretPosts}
      noticePosts={noticePosts}
      latestProducts={SAMPLE_PRODUCTS.slice(0, 5)}
      popular={SAMPLE_POPULAR}
    />
  );
}