'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Flag, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import CommunityBoardComment from '@/components/common/CommunityBoardComment';
import CommunityReportModal from '@/components/common/CommunityReportModal';
import { getPostById, deletePost, togglePostLike, getPostLikeStatus, getPostReportStatus } from '@/lib/postApi';
import type { Post, BoardType } from '@/types/community';
import { useAuthStore } from '@/store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:9090';

const resolveImageUrl = (url: string) =>
  url.startsWith('http') ? url : `${API_BASE}${url}`;

interface CommunityBoardDetailProps {
  post: Post;
  isAnon: boolean;
  board: BoardType;
  onBack: () => void;
  onRefresh?: () => void; // 목록 댓글 수 동기화용
}

export default function CommunityBoardDetail({
  post: initialPost,
  isAnon,
  board,
  onBack,
  onRefresh,
}: CommunityBoardDetailProps) {
  const router = useRouter();
  const memberId = useAuthStore((s) => s.memberId);
  const role = useAuthStore((s) => s.role);
  const [post, setPost] = useState<Post>(initialPost);
  const [liked, setLiked] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [reportToast, setReportToast] = useState(false);

  const handleReportClick = () => {
    if (alreadyReported) {
      setReportToast(true);
      setTimeout(() => setReportToast(false), 3000);
      return;
    }
    setReporting(true);
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const [data, likeStatus, reportStatus] = await Promise.all([
          getPostById(initialPost.postId),
          getPostLikeStatus(initialPost.postId),
          getPostReportStatus(initialPost.postId),
        ]);
        setPost(data);
        setLiked(likeStatus.liked);
        setAlreadyReported(reportStatus.reported);
      } catch {
        // 실패해도 기존 데이터 유지
      }
    };
    fetchDetail();
  }, [initialPost.postId]);

  const handleLike = async () => {
    try {
      const result = await togglePostLike(post.postId);
      setLiked(result.liked);
      setPost((prev) => ({
        ...prev,
        likeCount: result.liked ? prev.likeCount + 1 : prev.likeCount - 1,
      }));
    } catch {
      alert('좋아요 처리에 실패했습니다.');
    }
  };

  const canManagePost = (memberId != null && post.memberId === memberId) || role === 'SUA' || role === 'ADM';

  const handleEdit = () => router.push(`/community/${board}/write?postId=${post.postId}`);

  const handleDelete = async () => {
    if (!confirm('게시글을 삭제할까요?')) return;
    try {
      await deletePost(post.postId);
      onBack();
    } catch {
      alert('삭제에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  // 블라인드
  if (post.isBlind) {
    return (
      <div className='mx-auto max-w-[920px]'>
        <button
          onClick={onBack}
          className='mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700'
        >
          <ArrowLeft className='size-4' /> 목록으로
        </button>
        <div className='flex flex-col items-center rounded-2xl border border-border bg-white p-14 text-center shadow-sm'>
          <span className='flex size-14 items-center justify-center rounded-full bg-red-50'>
            <EyeOff className='size-[26px] text-red-400' />
          </span>
          <h2 className='mb-2 mt-4 text-[16px] font-extrabold text-slate-800'>
            블라인드 처리된 게시글입니다.
          </h2>
          <p className='mx-auto max-w-[360px] text-[13px] leading-relaxed text-slate-400'>
            신고가 <b className='text-red-500'>{post.reportCount}회</b> 누적되어
            자동으로 가려진 게시글입니다.
            <br /> 열람이 제한됩니다.
          </p>
          <Button variant='outline' className='mt-6' onClick={onBack}>
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='mx-auto max-w-[920px]'>
        <button
          onClick={onBack}
          className='mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700'
        >
          <ArrowLeft className='size-4' /> 목록으로
        </button>

        <div className='overflow-hidden rounded-2xl border border-border bg-white shadow-sm'>
          <div className='p-6'>
            {/* 카테고리 + HOT + 수정/삭제 */}
            <div className='mb-3 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                {post.tag ? (
                  <span className='rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-600'>
                    {post.tag}
                  </span>
                ) : (
                  <span className='rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary'>
                    {post.category}
                  </span>
                )}
                {post.isHot && (
                  <span className='rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-500'>
                    HOT
                  </span>
                )}
              </div>
              <div className='flex items-center gap-1.5'>
                {canManagePost && (
                  <>
                    <button
                      onClick={handleEdit}
                      className='flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:border-primary hover:text-primary'
                    >
                      <Pencil className='size-3.5' />
                      수정
                    </button>
                    <button
                      onClick={handleDelete}
                      className='flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:border-red-400 hover:text-red-500'
                    >
                      <Trash2 className='size-3.5' />
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 제목 */}
            <h2 className='mb-4 text-[20px] font-extrabold leading-snug tracking-tight text-slate-900'>
              {post.title}
            </h2>

            {/* 작성자 */}
            <div className='flex items-center gap-3 border-b border-border pb-4'>
              <div className='flex size-[30px] items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm'>
                {isAnon ? '익' : post.authorName.slice(0, 1)}
              </div>
              <div>
                <div className='text-[12px] font-bold text-slate-800'>
                  {isAnon ? '익명' : post.authorName}
                </div>
                <div className='text-xs text-slate-400'>
                  {formatDate(post.createdAt)} · 조회 {post.viewCount ?? 0}
                </div>
              </div>
            </div>

            {/* 본문 */}
            <p className='my-6 whitespace-pre-line text-[14px] leading-[1.9] text-slate-600'>
              {post.content ?? '본문 내용이 여기에 표시됩니다.'}
            </p>

            {post.images && post.images.length > 0 && (
              <div className='mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3'>
                {post.images.map((image) => (
                  <div key={image.imageId} className='overflow-hidden rounded-xl border border-border bg-slate-100'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveImageUrl(image.imageUrl)}
                      alt='게시글 첨부 이미지'
                      className='aspect-square w-full object-cover'
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 하단 액션 */}
            <div className='flex items-center justify-between border-t border-border pt-4'>
              <button
                onClick={handleLike}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold transition-all',
                  liked
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-slate-500 hover:border-primary hover:text-primary',
                )}
              >
                <Heart className={cn('size-4', liked && 'fill-current')} />
                좋아요 {post.likeCount}
              </button>
              <button
                onClick={handleReportClick}
                className='flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3.5 py-1.5 text-[12px] font-semibold text-red-400 transition-colors hover:bg-red-100 hover:text-red-500'
              >
                <Flag className='size-3.5' />
                {alreadyReported ? '신고완료' : '신고'}
              </button>
            </div>
          </div>
        </div>

        {/* 댓글 */}
        <CommunityBoardComment
          postId={post.postId}
          isAnon={isAnon}
          onRefresh={onRefresh}
        />
      </div>

      {reporting && (
        <CommunityReportModal
          targetType='post'
          targetId={post.postId}
          onClose={(reported?: boolean) => {
            setReporting(false);
            if (reported) setAlreadyReported(true);
          }}
        />
      )}

      {/* 신고 완료 토스트 */}
      {reportToast && (
        <div className='fixed bottom-8 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-white px-5 py-3.5 shadow-lg'>
          <Flag className='size-4 text-red-400' />
          <p className='text-[13px] font-semibold text-slate-700'>이미 신고한 게시글입니다.</p>
        </div>
      )}
    </>
  );
}
