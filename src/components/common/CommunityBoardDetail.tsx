'use client';

import { useState } from 'react';
import { ArrowLeft, Heart, Flag, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import CommunityBoardComment from '@/components/common/CommunityBoardComment';
import CommunityReportModal from '@/components/common/CommunityReportModal';
import type { Post } from '@/types/community';

const SAMPLE_COMMENTS = [
  {
    commentId: 1,
    authorName: '이준호',
    createdAt: '30분 전',
    content: '저요! 날짜만 맞으면 무조건 갑니다',
    likeCount: 8,
    replies: [
      {
        commentId: 11,
        authorName: '김서연',
        createdAt: '28분 전',
        content: '오 좋아요! 날짜 정해지면 바로 공유할게요 :)',
        likeCount: 2,
      },
    ],
  },
  {
    commentId: 2,
    authorName: '박지민',
    createdAt: '12분 전',
    content: '인원 대충 몇 명 정도 모이나요? 예산도 궁금합니다',
    likeCount: 1,
    replies: [],
  },
];

interface CommunityBoardDetailProps {
  post: Post;
  isAnon: boolean;
  onBack: () => void;
}

export default function CommunityBoardDetail({
  post,
  isAnon,
  onBack,
}: CommunityBoardDetailProps) {
  const [liked, setLiked] = useState(false);
  const [reporting, setReporting] = useState(false);

  // ── 블라인드 ───────────────────────────────────────
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
            블라인드 처리된 게시글이에요
          </h2>
          <p className='mx-auto max-w-[360px] text-[13px] leading-relaxed text-slate-400'>
            신고가 <b className='text-red-500'>{post.reportCount}회</b> 누적되어
            자동으로 가려진 게시글이에요.
            <br /> 열람이 제한됩니다.
          </p>
          <Button variant='outline' className='mt-6' onClick={onBack}>
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // ── 정상 게시글 ────────────────────────────────────
  return (
    <>
      <div className='mx-auto max-w-[920px]'>
        {/* 뒤로가기 */}
        <button
          onClick={onBack}
          className='mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700'
        >
          <ArrowLeft className='size-4' /> 목록으로
        </button>

        <div className='overflow-hidden rounded-2xl border border-border bg-white shadow-sm'>
          <div className='p-6'>
            {/* 카테고리 + HOT */}
            <div className='mb-3 flex items-center gap-2'>
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
                  {post.createdAt} · 조회 {post.viewCount ?? 0}
                </div>
              </div>
            </div>

            {/* 본문 */}
            <p className='my-6 whitespace-pre-line text-[14px] leading-[1.9] text-slate-600'>
              {post.content ?? '본문 내용이 여기에 표시됩니다.'}
            </p>

            {/* 하단 액션 */}
            <div className='flex items-center justify-between border-t border-border pt-4'>
              <button
                onClick={() => setLiked(!liked)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold transition-all',
                  liked
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-slate-500 hover:border-primary hover:text-primary',
                )}
              >
                <Heart className={cn('size-4', liked && 'fill-current')} />
                좋아요 {post.likeCount + (liked ? 1 : 0)}
              </button>
              <button
                onClick={() => setReporting(true)}
                className='flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600'
              >
                <Flag className='size-3.5' />
                신고
              </button>
            </div>
          </div>
        </div>

        {/* 댓글 */}
        <CommunityBoardComment
          postId={post.postId}
          isAnon={isAnon}
          initialComments={SAMPLE_COMMENTS}
        />
      </div>

      {reporting && (
        <CommunityReportModal
          targetType='post'
          targetId={post.postId}
          onClose={() => setReporting(false)}
        />
      )}
    </>
  );
}
