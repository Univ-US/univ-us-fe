'use client';

import CommunityBoardView from '@/components/common/CommunityBoardView';
import { SAMPLE_POSTS } from '@/lib/sampleData';

export default function FreeBoardPage() {
  // TODO: API 연결 후 교체
  return <CommunityBoardView board='free' posts={SAMPLE_POSTS.free} />;
}
