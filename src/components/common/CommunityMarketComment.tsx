'use client';

import { useEffect, useState, useCallback } from 'react';
import { Heart, CornerDownRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getProductCommentList,
  createProductComment,
  deleteProductComment,
} from '@/lib/marketApi';
import { useAuthStore } from '@/store/authStore';
import type { ProductComment } from '@/types/community';

// ── cn 유틸 ────────────────────────────────────────────
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
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

  const authorLabel =
    comment.isAnonymous === 1
      ? '익명'
      : (comment.authorNickname ?? comment.authorName);

  const submitReply = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    await onReplySubmit(comment.commentId, draft.trim());
    setDraft('');
    setReplying(false);
    setSubmitting(false);
  };

  return (
    <div className={`px-1 py-3 ${!isLast ? 'border-b border-border' : ''}`}>
      {/* 댓글 본문 */}
      <div className="flex items-start gap-3">
        <Avatar name={authorLabel} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[13px] font-bold">{authorLabel}</span>
            {comment.isSeller && (
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-primary">
                판매자
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {String(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">
            {comment.content}
          </p>
          <div className="mt-1 flex gap-3">
            <button
              onClick={() => setReplying(!replying)}
              className="flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CornerDownRight className="size-3.5" />
              답글
            </button>
            {currentMemberId === comment.memberId && (
              <button
                onClick={() => onDelete(comment.commentId)}
                className="flex items-center gap-1 py-1 text-xs text-red-400 hover:text-red-600"
              >
                <Trash2 className="size-3.5" />
                삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 대댓글 + 입력창 */}
      {((comment.replies && comment.replies.length > 0) || replying) && (
        <div className="ml-[42px] mt-2.5 flex flex-col gap-3 border-l-2 border-border pl-3.5">
          {comment.replies?.map((reply) => {
            const replyLabel =
              reply.isAnonymous === 1
                ? '익명'
                : (reply.authorNickname ?? reply.authorName);
            return (
              <div key={reply.commentId} className="flex items-start gap-2">
                <CornerDownRight className="mt-2 size-3.5 shrink-0 text-muted-foreground/60" />
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <Avatar name={replyLabel} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[13px] font-bold">{replyLabel}</span>
                      {reply.isSeller && (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-primary">
                          판매자
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {String(reply.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {reply.content}
                    </p>
                    {currentMemberId === reply.memberId && (
                      <button
                        onClick={() => onDelete(reply.commentId)}
                        className="mt-1 flex items-center gap-1 py-1 text-xs text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" />
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {replying && (
            <div className="flex items-center gap-2 rounded-[10px] bg-slate-50 px-2.5 py-2">
              <Avatar name="나" />
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !submitting && submitReply()}
                placeholder="답글을 입력하세요"
                className="flex-1 bg-transparent text-[13.5px] outline-none"
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
      alert('댓글 등록에 실패했어.');
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
      alert('댓글 삭제에 실패했어.');
    }
  };

  const handleReplySubmit = async (parentId: number, content: string) => {
    try {
      await createProductComment(productId, { content, parentId, isAnonymous: 0 });
      await fetchComments();
    } catch (err) {
      console.error('답글 등록 실패:', err);
      alert('답글 등록에 실패했어.');
    }
  };

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length ?? 0),
    0,
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
            onKeyDown={(e) => e.key === 'Enter' && !submitting && submitComment()}
            placeholder="상품에 대해 궁금한 점을 물어보세요"
            className="flex-1 bg-transparent py-1.5 text-sm outline-none"
          />
          <Button size="sm" onClick={submitComment} disabled={submitting}>
            등록
          </Button>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className="rounded-2xl border border-border bg-card px-5">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            불러오는 중...
          </p>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            첫 번째 문의를 남겨보세요!
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
