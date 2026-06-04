"use client";

import { Suspense } from "react";
import CommunitySearch from "@/components/common/CommunitySearch";

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">검색 중...</p>
      </div>
    }>
      <CommunitySearch />
    </Suspense>
  );
}