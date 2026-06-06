"use client";

import { Suspense } from "react";
import CommunityBoardWrite from "@/components/common/CommunityBoardWrite";

export default function FreeBoardWritePage() {
  return (
    <Suspense>
      <CommunityBoardWrite board="free" />
    </Suspense>
  );
}
