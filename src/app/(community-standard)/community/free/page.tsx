'use client';
import CommunityBoardView from '@/components/common/CommunityBoardView';
import { SAMPLE_POSTS } from '@/lib/sampleData';

export default function FreeBoardPage() {
  // TODO: useEffect + axios로 API 연결 예정
  return <CommunityBoardView board='free' posts={SAMPLE_POSTS.free} />;
}
