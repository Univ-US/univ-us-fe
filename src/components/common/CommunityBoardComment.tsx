"use client";

import { useState } from "react";
import { Heart, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── 타입 ───────────────────────────────────────────────
interface Comment {
  commentId: number;
  authorName: string;    // ← author → authorName
  createdAt: string;
  content: string;
  likeCount: number;
  isAnonymous?: boolean;
  isSeller?: boolean;
  replies?: Comment[];
}

// ── 아바타 ─────────────────────────────────────────────
function Avatar({
  name,
  size = "default",
}: {
  name: string;
  size?: "sm" | "default";
}) {
  const sizeClass = size === "sm" ? "size-[30px] text-xs" : "size-[38px] text-sm";
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white ${sizeClass}`}>
      {name.slice(0, 1)}
    </div>
  );
}

// ── 댓글 한 개 ─────────────────────────────────────────
function CommentItem({
  comment,
  isAnon,
  isLast,
}: {
  comment: Comment;
  isAnon: boolean;
  isLast: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replies, setReplies] = useState<Comment[]>(comment.replies ?? []);
  const [draft, setDraft] = useState("");
  const [liked, setLiked] = useState(false);

  const submitReply = () => {
    if (!draft.trim()) return;
    setReplies([
      ...replies,
      {
        commentId: Date.now(),
        authorName: "나",
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
        <Avatar
          size="sm"
          name={isAnon ? "익" : comment.authorName.slice(0, 1)}
        />
        <div className="min-w-0 flex-1">
          {/* 작성자 정보 */}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[13px] font-bold">
              {isAnon ? "익명" : comment.authorName}
            </span>
            {comment.isSeller && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
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

          {/* 액션 버튼 */}
          <div className="mt-1 flex gap-3">
            <button
              onClick={() => setLiked(!liked)}
              className="flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Heart className={`size-3.5 ${liked ? "fill-current text-red-500" : ""}`} />
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

      {/* 대댓글 목록 + 입력창 */}
      {(replies.length > 0 || replying) && (
        <div className="ml-[42px] mt-2.5 flex flex-col gap-3 border-l-2 border-border pl-3.5">
          {replies.map((reply) => (
            <div key={reply.commentId} className="flex items-start gap-2">
              <CornerDownRight className="mt-2 size-3.5 shrink-0 text-muted-foreground/60" />
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <Avatar
                  size="sm"
                  name={isAnon ? "익" : reply.authorName.slice(0, 1)}
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[13px] font-bold">
                      {isAnon ? "익명" : reply.authorName}
                    </span>
                    {reply.isSeller && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
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

          {/* 대댓글 입력창 */}
          {replying && (
            <div className="flex items-center gap-2 rounded-[10px] bg-slate-50 px-2.5 py-2">
              <Avatar size="sm" name="나" />
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitReply()}
                placeholder={isAnon ? "익명으로 답글 달기" : "답글을 입력하세요"}
                className="flex-1 bg-transparent text-[13.5px] outline-none"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setReplying(false); setDraft(""); }}
              >
                취소
              </Button>
              <Button size="sm" onClick={submitReply}>
                등록
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
interface CommunityBoardCommentProps {
  postId: number;
  isAnon: boolean;
  initialComments?: Comment[];
}

export default function CommunityBoardComment({
  postId,
  isAnon,
  initialComments = [],
}: CommunityBoardCommentProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [draft, setDraft] = useState("");

  const submitComment = () => {
    if (!draft.trim()) return;
    setComments([
      ...comments,
      {
        commentId: Date.now(),
        authorName: "나",
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
      <h3 className="mb-3.5 text-[15px] font-bold">댓글 {totalCount}</h3>

      {/* 댓글 입력창 */}
      <div className="mb-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar size="sm" name="나" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
            placeholder={
              isAnon ? "익명으로 댓글을 남겨보세요" : "따뜻한 댓글을 남겨보세요"
            }
            className="flex-1 bg-transparent py-1.5 text-sm outline-none"
          />
          <Button size="sm" onClick={submitComment}>
            등록
          </Button>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className="rounded-2xl border border-border bg-white px-5 shadow-sm">
        {comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            첫 번째 댓글을 남겨보세요!
          </p>
        ) : (
          comments.map((comment, i) => (
            <CommentItem
              key={comment.commentId}
              comment={comment}
              isAnon={isAnon}
              isLast={i === comments.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}