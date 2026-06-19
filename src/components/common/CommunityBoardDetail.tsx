'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Flag, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import CommunityBoardComment from '@/components/common/CommunityBoardComment';
import CommunityReportModal from '@/components/common/CommunityReportModal';
import { getPostById, deletePost, togglePostLike, getPostLikeStatus, getPostReportStatus, increasePostViewCount } from '@/lib/postApi';
import type { Post, BoardType } from '@/types/community';
import { useAuthStore } from '@/store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:9090';

const resolveImageUrl = (url: string) =>
  url.startsWith('http') ? url : `${API_BASE}${url}`;

const viewedPostIds = new Set<number>();

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
  const [detailReady, setDetailReady] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [reportToast, setReportToast] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleReportClick = () => {
    if (memberId != null && post.memberId === memberId) return;
    if (role === 'SUA' || role === 'ADM') return;
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
        setPost((prev) => ({
          ...data,
          viewCount: Math.max(data.viewCount ?? 0, prev.viewCount ?? 0),
        }));
        setSelectedImageIndex(0);
        setLiked(likeStatus.liked);
        setAlreadyReported(reportStatus.reported);
      } catch {
        // 실패해도 기존 데이터 유지
      } finally {
        // 목록에서 넘어온 캐시된 isBlind는 신뢰하지 않고, 단건 조회 응답이 와야 블라인드 여부를 확정한다
        setDetailReady(true);
      }
    };
    fetchDetail();
  }, [initialPost.postId]);

  useEffect(() => {
    const postId = initialPost.postId;
    if (viewedPostIds.has(postId)) return;
    viewedPostIds.add(postId);

    increasePostViewCount(postId)
      .then((data) => {
        setPost((prev) => ({
          ...prev,
          viewCount: data.viewCount,
        }));
      })
      .catch(() => {
        viewedPostIds.delete(postId);
      });
  }, [initialPost.postId]);

  const handleLike = async () => {
    if (isPostOwner) return;
    if (isAdminUser) return;
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

  const isPostOwner = memberId != null && post.memberId === memberId;
  const isAdminUser = role === 'SUA' || role === 'ADM';
  const isAdminNotice = post.isAdminNotice === 1 || post.isPinned === 1;
  const canReactToPost = !isPostOwner && !isAdminUser;
  const canManagePost = isPostOwner || role === 'SUA' || role === 'ADM';
  const anonymousPostLabel =
    isAdminNotice ? '관리자' : isAnon ? `익명 1${memberId != null && post.memberId === memberId ? ' (나)' : ''}` : post.authorName;
  const postImages = post.images ?? [];
  const selectedImage = postImages[selectedImageIndex] ?? postImages[0];

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

  // 목록에서 넘어온 post는 isBlind가 최신이 아닐 수 있으므로, 단건 조회가 끝나기 전엔 내용을 보여주지 않는다
  if (!detailReady) {
    return (
      <div className='mx-auto flex max-w-[920px] items-center justify-center py-24 text-[13px] font-medium text-slate-400'>
        불러오는 중...
      </div>
    );
  }

  // 블라인드
  if (post.isBlind) {
    return (
      <div className='mx-auto max-w-[920px]'>
        <button
          onClick={onBack}
          className='mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:text-slate-700 active:translate-y-0'
        >
          <ArrowLeft className='size-4' /> 목록으로
        </button>
        <div className='flex flex-col items-center rounded-2xl border border-border bg-white p-14 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md'>
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
          {isPostOwner ? (
            <Button className='mt-6 bg-red-500 hover:bg-red-600' onClick={handleDelete}>
              삭제하기
            </Button>
          ) : (
            <Button variant='outline' className='mt-6' onClick={onBack}>
              목록으로 돌아가기
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='mx-auto max-w-[920px]'>
        <button
          onClick={onBack}
          className='mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:text-slate-700 active:translate-y-0'
        >
          <ArrowLeft className='size-4' /> 목록으로
        </button>

        <div className='overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md'>
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
                      className='flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary hover:shadow-sm active:translate-y-0'
                    >
                      <Pencil className='size-3.5' />
                      수정
                    </button>
                    <button
                      onClick={handleDelete}
                      className='flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-400 hover:text-red-500 hover:shadow-sm active:translate-y-0'
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
              <div className='flex size-[30px] items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm transition-transform duration-200 hover:scale-105'>
                {isAnon ? '익' : post.authorName.slice(0, 1)}
              </div>
              <div>
                <div className='text-[12px] font-bold text-slate-800'>
                  {anonymousPostLabel}
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

            {selectedImage && (
              <div className='mb-6'>
                <div className='group/image overflow-hidden rounded-xl border border-border bg-slate-100 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md'>
                  <img
                    src={resolveImageUrl(selectedImage.imageUrl)}
                    alt='게시글 첨부 이미지'
                    className='aspect-[16/10] w-full object-contain transition-transform duration-500 group-hover/image:scale-[1.01]'
                  />
                </div>
                {postImages.length > 1 && (
                  <div className='mt-2.5 flex gap-2 overflow-x-auto pb-1'>
                    {postImages.map((image, i) => (
                      <button
                        key={image.imageId}
                        type='button'
                        onClick={() => setSelectedImageIndex(i)}
                        className={cn(
                          'size-[72px] shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-105',
                          i === selectedImageIndex
                            ? 'scale-[1.03] border-primary shadow-sm'
                            : 'border-transparent opacity-60 hover:opacity-90',
                        )}
                      >
                        <img
                          src={resolveImageUrl(image.imageUrl)}
                          alt={`게시글 첨부 이미지 ${i + 1}`}
                          className='size-full object-cover'
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 하단 액션 */}
            <div className='flex items-center justify-between border-t border-border pt-4'>
              {!canReactToPost ? (
                <div className='flex items-center gap-2 rounded-full border border-border bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-500'>
                  <Heart className='size-4' />
                  좋아요 {post.likeCount}
                </div>
              ) : (
                <button
                  onClick={handleLike}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0',
                    liked
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-slate-500 hover:border-primary hover:text-primary',
                  )}
                >
                  <Heart className={cn('size-4 transition-transform duration-200', liked && 'scale-110 fill-current')} />
                  좋아요 {post.likeCount}
                </button>
              )}
              <button
                onClick={handleReportClick}
                disabled={!canReactToPost}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-200 active:translate-y-0',
                  !canReactToPost
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300'
                    : 'border-red-200 bg-red-50 text-red-400 hover:-translate-y-0.5 hover:bg-red-100 hover:text-red-500 hover:shadow-sm',
                )}
              >
                <Flag className='size-3.5' />
                {isPostOwner ? '내 게시글' : isAdminUser ? '관리자 계정' : alreadyReported ? '신고완료' : '신고'}
              </button>
            </div>
          </div>
        </div>

        {/* 댓글 */}
        <CommunityBoardComment
          postId={post.postId}
          isAnon={isAnon}
          anonymousAuthorId={post.memberId}
          currentMemberId={memberId}
          onRefresh={onRefresh}
        />
      </div>

      {reporting && (
        <CommunityReportModal
          targetType='post'
          targetId={post.postId}
          onClose={(reported?: boolean, blind?: boolean) => {
            setReporting(false);
            if (reported) setAlreadyReported(true);
            if (blind) onBack();
          }}
        />
      )}

      {/* 신고 완료 토스트 */}
      {reportToast && (
        <div className='fixed bottom-8 left-1/2 z-50 -translate-x-1/2 flex animate-in fade-in slide-in-from-bottom-2 items-center gap-2.5 rounded-2xl border border-red-200 bg-white px-5 py-3.5 shadow-lg duration-300'>
          <Flag className='size-4 text-red-400' />
          <p className='text-[13px] font-semibold text-slate-700'>이미 신고한 게시글입니다.</p>
        </div>
      )}
    </>
  );
}
