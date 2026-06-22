'use client';

import { useEffect, useState, useCallback } from 'react';
import { CornerDownRight, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getProductCommentList,
  createProductComment,
  deleteProductComment,
} from '@/lib/marketApi';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import type { ProductComment } from '@/types/community';

const REPLY_PREVIEW_COUNT = 2;

// ── 아바타 ─────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary ring-1 ring-primary/10">
      {name.slice(0, 1)}
    </div>
  );
}

// ── 댓글 한 개 ─────────────────────────────────────────
function MarketCommentItem({
  comment,
  isLast,
  currentMemberId,
  onDelete,
  onReplySubmit,
}: {
  comment: ProductComment;
  isLast: boolean;
  currentMemberId: number | null;
  onDelete: (commentId: number) => void;
  onReplySubmit: (parentId: number, content: string) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const authorLabel =
    comment.isAnonymous === 1
      ? '익명'
      : (comment.authorNickname ?? comment.authorName);
  const replies = comment.replies ?? [];
  const replyCount = replies.length;
  const visibleReplies = showAllReplies
    ? replies
    : replies.slice(0, REPLY_PREVIEW_COUNT);

  const submitReply = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    await onReplySubmit(comment.commentId, draft.trim());
    setDraft('');
    setReplying(false);
    setSubmitting(false);
  };

  return (
    <div className={`px-1 py-4 ${!isLast ? 'border-b border-slate-100' : ''}`}>
      {/* 댓글 본문 */}
      <div className="flex items-start gap-3">
        <Avatar name={authorLabel} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[13px] font-extrabold text-slate-900">{authorLabel}</span>
            {comment.isSeller && (
              <span className="rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-bold text-primary">
                판매자
              </span>
            )}
            <span className="text-[11px] font-medium text-slate-400">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-slate-700">
            {comment.content}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => setReplying(!replying)}
              className="flex items-center gap-1 rounded-md py-1 text-xs font-semibold text-slate-400 transition-colors hover:text-primary"
            >
              <MessageCircle className="size-3.5" />
              답글
            </button>
            {replyCount > REPLY_PREVIEW_COUNT ? (
              <button
                type="button"
                onClick={() => setShowAllReplies((prev) => !prev)}
                className="text-xs font-bold text-primary transition-colors hover:text-primary"
              >
                {showAllReplies ? '답글 접기' : `답글 ${replyCount}개 더보기`}
              </button>
            ) : replyCount > 0 ? (
              <span className="text-xs font-bold text-slate-400">
                답글 {replyCount}개
              </span>
            ) : null}
          </div>
        </div>
        {currentMemberId === comment.memberId && (
          <button
            onClick={() => onDelete(comment.commentId)}
            className="shrink-0 rounded-md p-1 text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-500 active:translate-y-0"
            aria-label="댓글 삭제"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {/* 대댓글 + 입력창 */}
      {((replyCount > 0) || replying) && (
        <div className="ml-[42px] mt-3 flex flex-col gap-2 border-l border-slate-200 pl-3.5">
          {visibleReplies.map((reply) => {
            const replyLabel =
              reply.isAnonymous === 1
                ? '익명'
                : (reply.authorNickname ?? reply.authorName);
            return (
              <div key={reply.commentId} className="flex items-start gap-2 rounded-xl bg-slate-50/80 px-3 py-2.5">
                <CornerDownRight className="mt-2 size-3.5 shrink-0 text-slate-300" />
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <Avatar name={replyLabel} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[13px] font-extrabold text-slate-900">{replyLabel}</span>
                      {reply.isSeller && (
                        <span className="rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-bold text-primary">
                          판매자
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-slate-400">
                        {formatDate(reply.createdAt)}
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-slate-700">
                      {reply.content}
                    </p>
                  </div>
                  {currentMemberId === reply.memberId && (
                    <button
                      onClick={() => onDelete(reply.commentId)}
                      className="shrink-0 rounded-md p-1 text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-500 active:translate-y-0"
                      aria-label="댓글 삭제"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {replying && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
              <Avatar name="나" />
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !submitting && submitReply()}
                placeholder="답글을 입력하세요"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReplying(false);
                  setDraft('');
                }}
              >
                취소
              </Button>
              <Button size="sm" onClick={submitReply} disabled={submitting}>
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
interface CommunityMarketCommentProps {
  productId: number;
}

export default function CommunityMarketComment({
  productId,
}: CommunityMarketCommentProps) {
  const memberId = useAuthStore((s) => s.memberId);
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const data = await getProductCommentList(productId);
      setComments(data ?? []);
    } catch (err) {
      console.error('댓글 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const submitComment = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      await createProductComment(productId, { content: draft.trim(), isAnonymous: 0 });
      setDraft('');
      await fetchComments();
    } catch (err) {
      console.error('댓글 등록 실패:', err);
      alert('댓글 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm('댓글을 삭제할까요?')) return;
    try {
      await deleteProductComment(commentId);
      await fetchComments();
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const handleReplySubmit = async (parentId: number, content: string) => {
    try {
      await createProductComment(productId, { content, parentId, isAnonymous: 0 });
      await fetchComments();
    } catch (err) {
      console.error('답글 등록 실패:', err);
      alert('답글 등록에 실패했습니다.');
    }
  };

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length ?? 0),
    0,
  );

  return (
    <div className="mt-6">
      <h3 className="mb-3.5 text-[14px] font-extrabold text-slate-900">문의 {totalCount}</h3>

      {/* 입력창 */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all focus-within:border-primary focus-within:shadow-md">
        <div className="flex items-center gap-3">
          <Avatar name="나" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !submitting && submitComment()}
            placeholder="상품에 대해 궁금한 점을 물어보세요"
            className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-slate-400"
          />
          <Button size="sm" onClick={submitComment} disabled={submitting}>
            등록
          </Button>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 shadow-sm">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            불러오는 중...
          </p>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            첫 번째 문의를 남겨 보세요.
          </p>
        ) : (
          comments.map((comment, i) => (
            <MarketCommentItem
              key={comment.commentId}
              comment={comment}
              isLast={i === comments.length - 1}
              currentMemberId={memberId}
              onDelete={handleDelete}
              onReplySubmit={handleReplySubmit}
            />
          ))
        )}
      </div>
    </div>
  );
}
