'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ImagePlus, X, Save, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createPost, createPostWithImages, updatePost, getPostById, uploadPostImages } from '@/lib/postApi';
import type { BoardType } from '@/types/community';

// ── 게시판별 카테고리 ──────────────────────────────────
const CATEGORIES: Record<BoardType, string[]> = {
  free: ['일상', '정보', '질문', '잡담', '모임'],
  secret: ['고민', '잡담', '질문'],
  notice: ['학사', '시설', '생활', '장학'],
};

// ── 게시판별 한글 이름 ─────────────────────────────────
const BOARD_LABEL: Record<BoardType, string> = {
  free: '자유게시판',
  secret: '익명게시판',
  notice: '공지사항',
};

// ── 칩 버튼 (카테고리 선택) ────────────────────────────
function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-card text-muted-foreground hover:bg-slate-50',
      )}
    >
      {label}
    </button>
  );
}

// ── 입력 필드 래퍼 ─────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className='mb-[22px]'>
      <label className='mb-2.5 block text-[13px] font-bold'>{label}</label>
      {children}
      {hint && <p className='mt-1.5 text-xs text-muted-foreground'>{hint}</p>}
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
interface CommunityBoardWriteProps {
  board: BoardType;
}

export default function CommunityBoardWrite({
  board,
}: CommunityBoardWriteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get('postId');
  const isEdit = !!postId;

  const [category, setCategory] = useState(CATEGORIES[board][0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAnon = board === 'secret';
  const isNotice = board === 'notice';

  // 수정 모드일 때 기존 데이터 불러오기
  useEffect(() => {
    if (!isEdit) return;
    const fetchPost = async () => {
      try {
        const post = await getPostById(Number(postId));
        setTitle(post.title);
        setContent(post.content ?? '');
        if (post.category) setCategory(post.category);
      } catch {
        alert('게시글을 불러오는 데 실패했어.');
        router.back();
      }
    };
    fetchPost();
  }, [postId]);

  const handleBack = () => router.push(`/community/${board}`);

  useEffect(() => {
    const urls = images.map((image) => URL.createObjectURL(image));
    setImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const validImages = selectedFiles.filter((file) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    );

    if (validImages.length !== selectedFiles.length) {
      alert('JPG, PNG, WEBP 이미지만 첨부할 수 있어.');
    }

    setImages((prev) => [...prev, ...validImages].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    const BOARD_ID_MAP: Record<BoardType, number> = {
      free:   1,
      secret: 2,
      notice: 3, // DB BOARD_TYPE 테이블 기준
    };

    try {
      if (isEdit) {
        await updatePost(Number(postId), {
          title:    title.trim(),
          content:  content.trim(),
          category: category,
        });
        if (images.length > 0) {
          await uploadPostImages(Number(postId), images);
        }
        alert('수정되었습니다.');
      } else {
        if (images.length > 0) {
          await createPostWithImages({
            boardId:  BOARD_ID_MAP[board],
            title:    title.trim(),
            content:  content.trim(),
            category: category,
          }, images);
        } else {
          await createPost({
            boardId:  BOARD_ID_MAP[board],
            title:    title.trim(),
            content:  content.trim(),
            category: category,
          });
        }
        alert('등록되었습니다.');
      }
      handleBack();
    } catch (err) {
      console.error('writePost error:', err);
      alert(isEdit ? '수정에 실패했어. 다시 시도해줘.' : '게시글 등록에 실패했어. 다시 시도해줘.');
    }
  };

  return (
    <div className='px-[30px] py-7'>
      <div className='mx-auto max-w-[760px]'>
        {/* 뒤로가기 */}
        <button
          onClick={handleBack}
          className='mb-3.5 flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='size-4' />
          취소하고 돌아가기
        </button>

        <h2 className='mb-5 text-[22px] font-extrabold tracking-tight'>
          {isEdit ? `${BOARD_LABEL[board]} 수정` : `${BOARD_LABEL[board]} 글쓰기`}
        </h2>

        {/* 익명 안내 */}
        {isAnon && (
          <div className='mb-[22px] flex items-center gap-2 rounded-[10px] border border-teal-200 bg-teal-50 px-3.5 py-3 text-[13px] text-teal-700'>
            익명으로 작성돼요. 작성자 정보는 표시되지 않지만 서로 존중하는 글을
            부탁드려요.
          </div>
        )}

        {/* 공지사항 안내 */}
        {isNotice && (
          <div className='mb-[22px] flex items-center gap-2 rounded-[10px] border border-blue-200 bg-blue-50 px-3.5 py-3 text-[13px] text-blue-700'>
            공지사항은 운영 권한이 있는 계정만 게시할 수 있어요.
          </div>
        )}

        {/* 카테고리 */}
        <Field label='카테고리'>
          <div className='flex flex-wrap gap-2'>
            {CATEGORIES[board].map((cat) => (
              <Chip
                key={cat}
                label={cat}
                active={category === cat}
                onClick={() => setCategory(cat)}
              />
            ))}
          </div>
        </Field>

        {/* 제목 */}
        <Field label='제목'>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isNotice ? '공지 제목을 입력하세요' : '제목을 입력하세요'
            }
            className='flex h-11 w-full rounded-lg border border-input bg-background px-3.5 py-2 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary'
          />
        </Field>

        {/* 내용 */}
        <Field
          label='내용'
          hint={
            isAnon
              ? '개인정보가 드러나지 않도록 주의해 주세요.'
              : '이미지는 아래 버튼으로 추가할 수 있어요.'
          }
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={9}
            placeholder={
              isAnon
                ? '익명으로 편하게 이야기를 들려주세요.'
                : isNotice
                  ? '공지 내용을 입력하세요. 일정·대상·문의처를 함께 적어주세요.'
                  : '자유롭게 이야기를 적어보세요.'
            }
            className='flex min-h-20 w-full rounded-lg border border-input bg-background px-3.5 py-3 text-[14px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary'
          />
        </Field>

        {/* 이미지 첨부 - 익명게시판 제외 */}
        {!isAnon && (
          <Field label='사진 첨부'>
            <div className='flex gap-3'>
              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                className='flex size-24 flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-input bg-slate-50 text-muted-foreground hover:bg-slate-100'
              >
                <ImagePlus className='size-[22px]' />
                <span className='text-xs font-semibold'>사진 추가</span>
              </button>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg,image/png,image/webp'
                multiple
                onChange={handleImageChange}
                className='hidden'
              />
              {/* 미리보기 — TODO: 파일 업로드 구현 시 교체 */}
              {imagePreviews.map((img, i) => (
                <div
                  key={i}
                  className='relative size-24 overflow-hidden rounded-xl bg-slate-200'
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`첨부 이미지 ${i + 1}`} className='h-full w-full object-cover' />
                  <button
                    type='button'
                    onClick={() =>
                      setImages(images.filter((_, idx) => idx !== i))
                    }
                    className='absolute right-1.5 top-1.5 flex size-[22px] items-center justify-center rounded-full bg-black/60 text-white'
                  >
                    <X className='size-3.5' />
                  </button>
                </div>
              ))}
            </div>
          </Field>
        )}

        {/* 하단 버튼 */}
        <div className='mt-1.5 flex justify-end gap-2 border-t border-border pt-3'>
          <Button variant='outline' onClick={handleBack}>
            취소
          </Button>
          {!isNotice && (
            <Button variant='ghost'>
              <Save className='size-4' />
              임시저장
            </Button>
          )}
          <Button onClick={handleSubmit}>
            <Send className='size-4' />
            {isNotice ? '공지 게시' : isEdit ? '수정 완료' : '등록하기'}
          </Button>
        </div>
      </div>
    </div>
  );
}
