'use client';

import { useState, useEffect } from 'react';
import { Heart, CornerDownRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCommentList, createComment, deleteComment } from '@/lib/postApi';
import { formatDate } from '@/lib/utils';
import type { PostComment } from '@/types/community';

// ── 아바타 ─────────────────────────────────────────────
function Avatar({ name, size = 'default' }: { name: string; size?: 'sm' | 'default' }) {
  const sizeClass = size === 'sm' ? 'size-[30px] text-xs' : 'size-[38px] text-sm';
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white ${sizeClass}`}>
      {name.slice(0, 1)}
    </div>
  );
}

// ── 대댓글 한 개 ───────────────────────────────────────
function ReplyItem({ reply, isAnon, onDelete }: {
  reply: PostComment; isAnon: boolean; onDelete: (commentId: number) => void;
}) {
  const displayName = isAnon ? '익명' : (reply.authorNickname || reply.authorName);
  return (
    <div className='flex items-start gap-2'>
      <CornerDownRight className='mt-2 size-3.5 shrink-0 text-muted-foreground/60' />
      <div className='flex min-w-0 flex-1 items-start gap-2'>
        <Avatar size='sm' name={isAnon ? '익' : displayName.slice(0, 1)} />
        <div className='min-w-0 flex-1'>
          <div className='mb-1 flex items-center gap-2'>
            <span className='text-[13px] font-bold'>{displayName}</span>
            <span className='text-[11px] text-muted-foreground'>{formatDate(reply.createdAt)}</span>
          </div>
          <p className='text-sm leading-relaxed text-foreground/80'>{reply.content}</p>
        </div>
        <button onClick={() => onDelete(reply.commentId)}
          className='shrink-0 p-1 text-slate-300 transition-colors hover:text-red-400'>
          <Trash2 className='size-3.5' />
        </button>
      </div>
    </div>
  );
}

// ── 댓글 한 개 ─────────────────────────────────────────
function CommentItem({ comment, isAnon, isLast, onDelete, onReplySubmit }: {
  comment: PostComment; isAnon: boolean; isLast: boolean;
  onDelete: (commentId: number) => void;
  onReplySubmit: (parentId: number, content: string) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const displayName = isAnon ? '익명' : (comment.authorNickname || comment.authorName);

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
    <div className={`px-1 py-3 ${!isLast ? 'border-b border-border' : ''}`}>
      <div className='flex items-start gap-3'>
        <Avatar size='sm' name={isAnon ? '익' : displayName.slice(0, 1)} />
        <div className='min-w-0 flex-1'>
          <div className='mb-1 flex items-center gap-2'>
            <span className='text-[13px] font-bold'>{displayName}</span>
            <span className='text-[11px] text-muted-foreground'>{formatDate(comment.createdAt)}</span>
          </div>
          <p className='text-[13px] leading-relaxed text-foreground/80'>{comment.content}</p>
          <div className='mt-1 flex gap-3'>
            <button onClick={() => setReplying(!replying)}
              className='flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground'>
              <CornerDownRight className='size-3.5' />답글
            </button>
          </div>
        </div>
        <button onClick={() => onDelete(comment.commentId)}
          className='shrink-0 p-1 text-slate-300 transition-colors hover:text-red-400'>
          <Trash2 className='size-3.5' />
        </button>
      </div>

      {((comment.replies && comment.replies.length > 0) || replying) && (
        <div className='ml-[42px] mt-2.5 flex flex-col gap-3 border-l-2 border-border pl-3.5'>
          {comment.replies?.map((reply) => (
            <ReplyItem key={reply.commentId} reply={reply} isAnon={isAnon} onDelete={onDelete} />
          ))}
          {replying && (
            <div className='flex items-center gap-2 rounded-[10px] bg-slate-50 px-2.5 py-1.5'>
              <Avatar size='sm' name='나' />
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !submitting && handleReplySubmit()}
                placeholder={isAnon ? '익명으로 답글 달기' : '답글을 입력하세요'}
                className='flex-1 bg-transparent text-[13px] outline-none' />
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
  onRefresh?: () => void; // 목록 댓글 수 동기화용
}

export default function CommunityBoardComment({ postId, isAnon, onRefresh }: CommunityBoardCommentProps) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
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
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  // 최상위 댓글 등록
  const handleCommentSubmit = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      await createComment(postId, { content: draft.trim(), isAnonymous: isAnon ? 1 : 0 });
      setDraft('');
      await fetchComments();
      onRefresh?.(); // 목록 댓글 수 갱신
    } catch {
      alert('댓글 등록에 실패했어. 다시 시도해줘.');
    } finally {
      setSubmitting(false);
    }
  };

  // 대댓글 등록
  const handleReplySubmit = async (parentId: number, content: string) => {
    await createComment(postId, { content, parentId, isAnonymous: isAnon ? 1 : 0 });
    await fetchComments();
    onRefresh?.(); // 목록 댓글 수 갱신
  };

  // 댓글/대댓글 삭제
  const handleDelete = async (commentId: number) => {
    if (!confirm('댓글을 삭제할까요?')) return;
    try {
      await deleteComment(postId, commentId);
      await fetchComments();
      onRefresh?.(); // 목록 댓글 수 갱신
    } catch {
      alert('삭제에 실패했어. 다시 시도해줘.');
    }
  };

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);

  return (
    <div className='mt-6'>
      <h3 className='mb-3.5 text-[14px] font-bold'>댓글 {totalCount}</h3>

      {/* 댓글 입력창 */}
      <div className='mb-4 rounded-2xl border border-border bg-white p-5 shadow-sm'>
        <div className='flex items-center gap-3'>
          <Avatar size='sm' name='나' />
          <input value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !submitting && handleCommentSubmit()}
            placeholder={isAnon ? '익명으로 댓글을 남겨보세요' : '따뜻한 댓글을 남겨보세요'}
            className='flex-1 bg-transparent py-1.5 text-sm outline-none' />
          <Button size='sm' onClick={handleCommentSubmit} disabled={submitting}>등록</Button>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className='rounded-2xl border border-border bg-white px-5 shadow-sm'>
        {loading ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>불러오는 중...</p>
        ) : comments.length === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>첫 번째 댓글을 남겨보세요!</p>
        ) : (
          comments.map((comment, i) => (
            <CommentItem key={comment.commentId} comment={comment} isAnon={isAnon}
              isLast={i === comments.length - 1}
              onDelete={handleDelete} onReplySubmit={handleReplySubmit} />
          ))
        )}
      </div>
    </div>
  );
}
