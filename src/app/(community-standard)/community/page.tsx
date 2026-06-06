'use client';

import CommunityHome from '@/components/common/CommunityHome';
import {
  SAMPLE_POSTS,
  SAMPLE_PRODUCTS,
  SAMPLE_POPULAR,
} from '@/lib/sampleData';

export default function CommunityHomePage() {
  return (
    <CommunityHome
      freePosts={SAMPLE_POSTS.free.slice(0, 5)}
      secretPosts={SAMPLE_POSTS.secret.slice(0, 5)}
      noticePosts={SAMPLE_POSTS.notice.slice(0, 3)}
      latestProducts={SAMPLE_PRODUCTS.slice(0, 5)}
      popular={SAMPLE_POPULAR}
    />
  );
}
