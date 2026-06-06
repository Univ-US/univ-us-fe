"use client";

import { Suspense } from "react";
import CommunityBoardWrite from "@/components/common/CommunityBoardWrite";

export default function NoticeBoardWritePage() {
  return (
    <Suspense>
      <CommunityBoardWrite board="notice" />
    </Suspense>
  );
}
