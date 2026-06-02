'use client';

import CommunityHome from '@/components/common/CommunityHome';
import {
  SAMPLE_POSTS,
  SAMPLE_PRODUCTS,
  SAMPLE_POPULAR,
} from '@/lib/sampleData';

export default function CommunityHomePage() {
  // TODO: useEffect + axios로 API 연결 예정
  return (
    <CommunityHome
      freePosts={SAMPLE_POSTS.free}
      secretPosts={SAMPLE_POSTS.secret}
      noticePosts={SAMPLE_POSTS.notice}
      latestProducts={SAMPLE_PRODUCTS.slice(0, 5)}
      popular={SAMPLE_POPULAR}
    />
  );
}
