"use client";

import { useState } from "react";
import { Heart, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── 타입 ───────────────────────────────────────────────
interface MarketComment {
  commentId: number;
  author: string;
  createdAt: string;
  content: string;
  likeCount: number;
  isSeller?: boolean;
  replies?: MarketComment[];
}

// ── 아바타 ─────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  return (
    <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
      {name.slice(0, 1)}
    </div>
  );
}

// ── 댓글 한 개 ─────────────────────────────────────────
function MarketCommentItem({
  comment,
  isLast,
}: {
  comment: MarketComment;
  isLast: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replies, setReplies] = useState<MarketComment[]>(comment.replies ?? []);
  const [draft, setDraft] = useState("");
  const [liked, setLiked] = useState(false);

  const submitReply = () => {
    if (!draft.trim()) return;
    setReplies([
      ...replies,
      {
        commentId: Date.now(),
        author: "나",
        createdAt: "방금",
        content: draft.trim(),
        likeCount: 0,
      },
    ]);
    setDraft("");
    setReplying(false);
  };

  return (
    <div className={`px-1 py-3 ${!isLast ? "border-b border-border" : ""}`}>
      {/* 댓글 본문 */}
      <div className="flex items-start gap-3">
        <Avatar name={comment.author} />
        <div className="min-w-0 flex-1">
          {/* 작성자 정보 */}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[13px] font-bold">{comment.author}</span>
            {comment.isSeller && (
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-primary">
                판매자
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {comment.createdAt}
            </span>
          </div>

          {/* 내용 */}
          <p className="text-sm leading-relaxed text-foreground/80">
            {comment.content}
          </p>

          {/* 액션 */}
          <div className="mt-1 flex gap-3">
            <button
              onClick={() => setLiked(!liked)}
              className="flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Heart className={cn("size-3.5", liked && "fill-current text-red-500")} />
              {comment.likeCount + (liked ? 1 : 0)}
            </button>
            <button
              onClick={() => setReplying(!replying)}
              className="flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CornerDownRight className="size-3.5" />
              답글
            </button>
          </div>
        </div>
      </div>

      {/* 대댓글 + 입력창 */}
      {(replies.length > 0 || replying) && (
        <div className="ml-[42px] mt-2.5 flex flex-col gap-3 border-l-2 border-border pl-3.5">
          {replies.map((reply) => (
            <div key={reply.commentId} className="flex items-start gap-2">
              <CornerDownRight className="mt-2 size-3.5 shrink-0 text-muted-foreground/60" />
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <Avatar name={reply.author} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[13px] font-bold">{reply.author}</span>
                    {reply.isSeller && (
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-primary">
                        판매자
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {reply.createdAt}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {reply.content}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {replying && (
            <div className="flex items-center gap-2 rounded-[10px] bg-slate-50 px-2.5 py-2">
              <Avatar name="나" />
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitReply()}
                placeholder="답글을 입력하세요"
                className="flex-1 bg-transparent text-[13.5px] outline-none"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setReplying(false); setDraft(""); }}
              >
                취소
              </Button>
              <Button size="sm" onClick={submitReply}>등록</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── cn 유틸 ────────────────────────────────────────────
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── 샘플 댓글 ──────────────────────────────────────────
const SAMPLE_MARKET_COMMENTS: MarketComment[] = [
  {
    commentId: 1,
    author: "이준호",
    createdAt: "30분 전",
    content: "혹시 직거래 가능한가요?",
    likeCount: 2,
    replies: [
      {
        commentId: 11,
        author: "김서연",
        createdAt: "25분 전",
        content: "네, 학교 안에서 가능해요!",
        likeCount: 0,
        isSeller: true,
      },
    ],
  },
  {
    commentId: 2,
    author: "박지민",
    createdAt: "1시간 전",
    content: "가격 조금 네고 가능할까요?",
    likeCount: 0,
    replies: [],
  },
];

// ── 메인 컴포넌트 ──────────────────────────────────────
interface CommunityMarketCommentProps {
  productId: number;
  initialComments?: MarketComment[];
}

export default function CommunityMarketComment({
  productId,
  initialComments = SAMPLE_MARKET_COMMENTS,
}: CommunityMarketCommentProps) {
  const [comments, setComments] = useState<MarketComment[]>(initialComments);
  const [draft, setDraft] = useState("");

  const submitComment = () => {
    if (!draft.trim()) return;
    setComments([
      ...comments,
      {
        commentId: Date.now(),
        author: "나",
        createdAt: "방금",
        content: draft.trim(),
        likeCount: 0,
      },
    ]);
    setDraft("");
  };

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length ?? 0),
    0
  );

  return (
    <div className="mt-6">
      <h3 className="mb-3.5 text-[15px] font-bold">문의 {totalCount}</h3>

      {/* 입력창 */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Avatar name="나" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
            placeholder="상품에 대해 궁금한 점을 물어보세요"
            className="flex-1 bg-transparent py-1.5 text-sm outline-none"
          />
          <Button size="sm" onClick={submitComment}>등록</Button>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className="rounded-2xl border border-border bg-card px-5">
        {comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            첫 번째 문의를 남겨보세요!
          </p>
        ) : (
          comments.map((comment, i) => (
            <MarketCommentItem
              key={comment.commentId}
              comment={comment}
              isLast={i === comments.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}