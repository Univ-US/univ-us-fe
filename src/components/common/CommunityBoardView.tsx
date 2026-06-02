"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Pencil,
  Heart, MessageCircle, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import CommunityBoardDetail from "@/components/common/CommunityBoardDetail";
import type { Post, BoardType } from "@/types/community";

const PAGE_SIZE = 10;

// ── 게시글 한 줄 ───────────────────────────────────────
function PostRow({
  post,
  isAnon,
  onOpen,
}: {
  post: Post;
  isAnon: boolean;
  onOpen: () => void;
}) {
  if (post.isBlind) {
    return (
      <button
        onClick={onOpen}
        className="flex w-full items-center gap-3 border-b border-border bg-slate-50 px-[18px] py-[15px] text-left transition-colors last:border-0 hover:bg-slate-100"
      >
        <EyeOff className="size-[17px] shrink-0 text-slate-300" />
        <span className="min-w-0 flex-1 text-sm font-medium text-slate-400">
          신고가 누적되어 블라인드 처리된 게시글이에요.
        </span>
        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-500">
          신고 {post.reportCount}회
        </span>
        <ChevronRight className="size-4 text-slate-300" />
      </button>
    );
  }

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3.5 border-b border-border px-[18px] py-[15px] text-left transition-colors last:border-0 hover:bg-slate-50"
    >
      {/* 태그 or 카테고리 */}
      {post.tag ? (
        <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-600">
          {post.tag}
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
          {post.category}
        </span>
      )}

      {/* 제목 */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-[14.5px] font-semibold text-slate-800">
          {post.title}
        </span>
        {post.isHot && (
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-500">
            HOT
          </span>
        )}
      </div>

      {/* 작성자 + 날짜 */}
      <div className="flex w-[140px] shrink-0 items-center justify-end gap-1 text-xs text-slate-400">
        <span className="truncate">
          {isAnon ? "익명" : post.author}
        </span>
        <span>·</span>
        <span className="shrink-0">{post.createdAt}</span>
      </div>

      {/* 좋아요 + 댓글 */}
      {!post.tag && (
        <div className="flex w-[80px] shrink-0 items-center justify-end gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Heart className="size-3.5" />{post.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3.5" />{post.commentCount}
          </span>
        </div>
      )}

      <ChevronRight className="size-4 text-slate-300" />
    </button>
  );
}

// ── 페이지네이션 ───────────────────────────────────────
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const btnBase =
    "inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border text-[13.5px] font-bold transition-colors";

  return (
    <div className="flex items-center gap-1.5">
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className={cn(
          btnBase,
          "border-border bg-white text-slate-400 hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-slate-400"
        )}
      >
        <ChevronLeft className="size-4" />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={cn(
            btnBase,
            n === page
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-border bg-white text-slate-500 hover:border-primary hover:text-primary"
          )}
        >
          {n}
        </button>
      ))}

      <button
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className={cn(
          btnBase,
          "border-border bg-white text-slate-400 hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-slate-400"
        )}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
interface CommunityBoardViewProps {
  board: BoardType;
  posts: Post[];
}

export default function CommunityBoardView({
  board,
  posts,
}: CommunityBoardViewProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const isAnon = board === "secret";
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);
  const visiblePosts = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-slate-50 px-[30px] py-7">
        <CommunityBoardDetail
          post={selectedPost}
          isAnon={isAnon}
          onBack={() => setSelectedPost(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-[30px] py-7">
      <div className="mx-auto max-w-[920px]">

        {/* 익명 안내 */}
        {isAnon && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-[13px] font-medium text-primary">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            익명게시판에서는 닉네임이 표시되지 않아요. 서로 존중하는 대화를 부탁드려요.
          </div>
        )}

        {/* 공지사항 안내 */}
        {board === "notice" && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] font-medium text-blue-600">
            <span className="size-1.5 shrink-0 rounded-full bg-blue-500" />
            공지사항은 학교·운영진이 작성해요. 중요 공지를 놓치지 않도록 확인해 주세요.
          </div>
        )}

        {/* 게시글 목록 */}
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {visiblePosts.map((post) => (
            <PostRow
              key={post.postId}
              post={post}
              isAnon={isAnon}
              onOpen={() => setSelectedPost(post)}
            />
          ))}
        </div>

        {/* 하단 */}
        <div className="relative mt-5 flex justify-center">
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={(p) => {
              setPage(p);
              setSelectedPost(null);
            }}
          />
          {board !== "notice" && (
            <div className="absolute right-0">
              <Button
                onClick={() => router.push(`/community/${board}/write`)}
                className="shadow-sm"
              >
                <Pencil className="size-4" />
                글쓰기
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}