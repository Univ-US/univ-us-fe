"use client";

import { Suspense } from "react";
import CommunityBoardWrite from "@/components/common/CommunityBoardWrite";

export default function SecretBoardWritePage() {
  return (
    <Suspense>
      <CommunityBoardWrite board="secret" />
    </Suspense>
  );
}
