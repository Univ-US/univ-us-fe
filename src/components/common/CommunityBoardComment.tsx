'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CornerDownRight, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCommentList, createComment, deleteComment } from '@/lib/postApi';
import { formatDate } from '@/lib/utils';
import type { PostComment } from '@/types/community';

const REPLY_PREVIEW_COUNT = 2;

// ── 아바타 ─────────────────────────────────────────────
function Avatar({ name, size = 'default' }: { name: string; size?: 'sm' | 'default' }) {
  const sizeClass = size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm';
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-extrabold text-primary ring-1 ring-primary/10 ${sizeClass}`}>
      {name.slice(0, 1)}
    </div>
  );
}

// ── 대댓글 한 개 ───────────────────────────────────────
function ReplyItem({ reply, isAnon, currentMemberId, onDelete, getAnonymousName }: {
  reply: PostComment; isAnon: boolean; onDelete: (commentId: number) => void;
  currentMemberId?: number | null;
  getAnonymousName: (memberId: number) => string;
}) {
  const displayName = isAnon ? getAnonymousName(reply.memberId) : (reply.authorNickname || reply.authorName);
  const canDelete = currentMemberId != null && currentMemberId === reply.memberId;
  return (
    <div className='flex items-start gap-2 rounded-xl bg-slate-50/80 px-3 py-2.5'>
      <CornerDownRight className='mt-2 size-3.5 shrink-0 text-slate-300' />
      <div className='flex min-w-0 flex-1 items-start gap-2.5'>
        <Avatar size='sm' name={isAnon ? '익' : displayName.slice(0, 1)} />
        <div className='min-w-0 flex-1'>
          <div className='mb-1 flex items-center gap-2'>
            <span className='text-[13px] font-extrabold text-slate-900'>{displayName}</span>
            <span className='text-[11px] font-medium text-slate-400'>{formatDate(reply.createdAt)}</span>
          </div>
          <p className='text-[13px] leading-relaxed text-slate-700'>{reply.content}</p>
        </div>
        {canDelete && (
          <button onClick={() => onDelete(reply.commentId)}
            className='shrink-0 rounded-md p-1 text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-500 active:translate-y-0'
            aria-label='댓글 삭제'>
            <Trash2 className='size-3.5' />
          </button>
        )}
      </div>
    </div>
  );
}

// ── 댓글 한 개 ─────────────────────────────────────────
function CommentItem({ comment, isAnon, isLast, currentMemberId, onDelete, onReplySubmit, getAnonymousName }: {
  comment: PostComment; isAnon: boolean; isLast: boolean;
  currentMemberId?: number | null;
  onDelete: (commentId: number) => void;
  onReplySubmit: (parentId: number, content: string) => Promise<void>;
  getAnonymousName: (memberId: number) => string;
}) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const displayName = isAnon ? getAnonymousName(comment.memberId) : (comment.authorNickname || comment.authorName);
  const canDelete = currentMemberId != null && currentMemberId === comment.memberId;
  const replies = comment.replies ?? [];
  const replyCount = replies.length;
  const visibleReplies = showAllReplies ? replies : replies.slice(0, REPLY_PREVIEW_COUNT);

  const handleReplySubmit = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      await onReplySubmit(comment.commentId, draft.trim());
      setDraft('');
      setReplying(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`px-1 py-4 ${!isLast ? 'border-b border-slate-100' : ''}`}>
      <div className='flex items-start gap-3'>
        <Avatar size='sm' name={isAnon ? '익' : displayName.slice(0, 1)} />
        <div className='min-w-0 flex-1'>
          <div className='mb-1 flex items-center gap-2'>
            <span className='text-[13px] font-extrabold text-slate-900'>{displayName}</span>
            <span className='text-[11px] font-medium text-slate-400'>{formatDate(comment.createdAt)}</span>
          </div>
          <p className='text-[13px] leading-relaxed text-slate-700'>{comment.content}</p>
          <div className='mt-2 flex items-center gap-3'>
            <button onClick={() => setReplying(!replying)}
              className='flex items-center gap-1 rounded-md py-1 text-xs font-semibold text-slate-400 transition-colors hover:text-primary'>
              <MessageCircle className='size-3.5' />
              답글
            </button>
            {replyCount > REPLY_PREVIEW_COUNT ? (
              <button
                type='button'
                onClick={() => setShowAllReplies((prev) => !prev)}
                className='text-xs font-bold text-primary transition-colors hover:text-primary'
              >
                {showAllReplies ? '답글 접기' : `답글 ${replyCount}개 더보기`}
              </button>
            ) : replyCount > 0 ? (
              <span className='text-xs font-bold text-slate-400'>
                답글 {replyCount}개
              </span>
            ) : null}
          </div>
        </div>
        {canDelete && (
          <button onClick={() => onDelete(comment.commentId)}
            className='shrink-0 rounded-md p-1 text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-500 active:translate-y-0'
            aria-label='댓글 삭제'>
            <Trash2 className='size-3.5' />
          </button>
        )}
      </div>

      {((replyCount > 0) || replying) && (
        <div className='ml-[42px] mt-3 flex flex-col gap-2 border-l border-slate-200 pl-3.5'>
          {visibleReplies.map((reply) => (
            <ReplyItem
              key={reply.commentId}
              reply={reply}
              isAnon={isAnon}
              currentMemberId={currentMemberId}
              onDelete={onDelete}
              getAnonymousName={getAnonymousName}
            />
          ))}
          {replying && (
            <div className='flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm'>
              <Avatar size='sm' name='나' />
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !submitting && handleReplySubmit()}
                placeholder={isAnon ? '익명으로 답글 달기' : '답글을 입력하세요'}
                className='flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400' />
              <Button variant='ghost' size='sm' onClick={() => { setReplying(false); setDraft(''); }}>취소</Button>
              <Button size='sm' onClick={handleReplySubmit} disabled={submitting}>등록</Button>
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
  anonymousAuthorId?: number;
  currentMemberId?: number | null;
  onRefresh?: () => void;
}

export default function CommunityBoardComment({
  postId,
  isAnon,
  anonymousAuthorId,
  currentMemberId,
  onRefresh,
}: CommunityBoardCommentProps) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const flat = await getCommentList(postId);
      const roots: PostComment[] = [];
      const map = new Map<number, PostComment>();
      flat.forEach((c) => map.set(c.commentId, { ...c, replies: [] }));
      map.forEach((c) => {
        if (c.parentId == null) {
          roots.push(c);
        } else {
          const parent = map.get(c.parentId);
          if (parent) parent.replies = [...(parent.replies ?? []), c];
        }
      });
      setComments(roots);
    } catch {
      // 실패해도 빈 목록 유지
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    (async () => {
      await fetchComments();
    })();
  }, [fetchComments]);

  // 최상위 댓글 등록
  const handleCommentSubmit = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      await createComment(postId, { content: draft.trim(), isAnonymous: isAnon ? 1 : 0 });
      setDraft('');
      await fetchComments();
      onRefresh?.();
    } catch {
      alert('댓글 등록에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  // 대댓글 등록
  const handleReplySubmit = async (parentId: number, content: string) => {
    try {
      await createComment(postId, { content, parentId, isAnonymous: isAnon ? 1 : 0 });
      await fetchComments();
      onRefresh?.();
    } catch {
      alert('답글 등록에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  // 댓글/대댓글 삭제
  const handleDelete = async (commentId: number) => {
    if (!confirm('댓글을 삭제할까요?')) return;
    try {
      await deleteComment(postId, commentId);
      await fetchComments();
      onRefresh?.();
    } catch {
      alert('삭제에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);
  const anonymousNameByMemberId = useMemo(() => {
    const map = new Map<number, string>();
    const assign = (memberId?: number) => {
      if (memberId == null || map.has(memberId)) return;
      map.set(memberId, `익명 ${map.size + 1}`);
    };

    assign(anonymousAuthorId);
    comments.forEach((comment) => {
      assign(comment.memberId);
      comment.replies?.forEach((reply) => assign(reply.memberId));
    });

    return map;
  }, [anonymousAuthorId, comments]);

  const getAnonymousName = useCallback((commentMemberId: number) => {
    const label = anonymousNameByMemberId.get(commentMemberId) ?? '익명';
    return currentMemberId != null && commentMemberId === currentMemberId ? `${label} (나)` : label;
  }, [anonymousNameByMemberId, currentMemberId]);

  return (
    <div className='mt-6'>
      <h3 className='mb-3.5 text-[14px] font-extrabold text-slate-900'>댓글 {totalCount}</h3>

      {/* 댓글 입력창 */}
      <div className='mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all focus-within:border-primary focus-within:shadow-md'>
        <div className='flex items-center gap-3'>
          <Avatar size='sm' name='나' />
          <input value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !submitting && handleCommentSubmit()}
            placeholder={isAnon ? '익명으로 댓글을 남겨 보세요' : '따뜻한 댓글을 남겨 보세요'}
            className='flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-slate-400' />
          <Button size='sm' onClick={handleCommentSubmit} disabled={submitting}>등록</Button>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className='rounded-xl border border-slate-200 bg-white px-5 shadow-sm'>
        {loading ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>불러오는 중...</p>
        ) : comments.length === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>첫 번째 댓글을 남겨 보세요.</p>
        ) : (
          comments.map((comment, i) => (
            <CommentItem key={comment.commentId} comment={comment} isAnon={isAnon}
              isLast={i === comments.length - 1}
              currentMemberId={currentMemberId}
              onDelete={handleDelete} onReplySubmit={handleReplySubmit}
              getAnonymousName={getAnonymousName} />
          ))
        )}
      </div>
    </div>
  );
}
