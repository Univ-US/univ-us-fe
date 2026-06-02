"use client";

import CommunityBoardView from "@/components/common/CommunityBoardView";
import { SAMPLE_POSTS } from "@/lib/sampleData";

export default function NoticeBoardPage() {
  return (
    <CommunityBoardView
      board="notice"
      posts={SAMPLE_POSTS.notice}
    />
  );
}