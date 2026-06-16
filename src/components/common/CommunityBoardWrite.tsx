/* eslint-disable */
'use client';

import { useState, useEffect, useId, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ImagePlus, X, Save, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createPost, createPostWithImages, updatePost, getPostById, uploadPostImages } from '@/lib/postApi';
import { getUniversities, type University } from '@/lib/homeApi';
import { useAuthStore } from '@/store/authStore';
import type { BoardType } from '@/types/community';

// ?? 寃뚯떆?먮퀎 移댄뀒怨좊━ ??????????????????????????????????
const CATEGORIES: Record<BoardType, string[]> = {
  free: ['?쇱긽', '?뺣낫', '吏덈Ц', '?〓떞', '紐⑥엫'],
  secret: ['怨좊?', '?〓떞', '吏덈Ц'],
  notice: ['?숈궗', '?쒖꽕', '?앺솢', '?ν븰'],
};

// ?? 寃뚯떆?먮퀎 ?쒓? ?대쫫 ?????????????????????????????????
const BOARD_LABEL: Record<BoardType, string> = {
  free: '?먯쑀寃뚯떆??,
  secret: '?듬챸寃뚯떆??,
  notice: '怨듭??ы빆',
};

// ?? 移?踰꾪듉 (移댄뀒怨좊━ ?좏깮) ????????????????????????????
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

// ?? ?낅젰 ?꾨뱶 ?섑띁 ?????????????????????????????????????
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

// ?? 硫붿씤 而댄룷?뚰듃 ??????????????????????????????????????
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
  const [universities, setUniversities] = useState<University[]>([]);
  const [targetUnivId, setTargetUnivId] = useState<number | null>(null);
  const fileInputId = useId();
  const role = useAuthStore((state) => state.role);
  const authUnivId = useAuthStore((state) => state.univId);

  const isAnon = board === 'secret';
  const isNotice = board === 'notice';
  const isSuperAdmin = role === 'SUA';

  // ?섏젙 紐⑤뱶????湲곗〈 ?곗씠??遺덈윭?ㅺ린
  useEffect(() => {
    if (!isEdit) return;
    const fetchPost = async () => {
      try {
        const post = await getPostById(Number(postId));
        setTitle(post.title);
        setContent(post.content ?? '');
        if (post.category) setCategory(post.category);
      } catch {
        alert('寃뚯떆湲??遺덈윭?ㅻ뒗 ???ㅽ뙣?덉뒿?덈떎.');
        router.back();
      }
    };
    fetchPost();
  }, [postId]);

  useEffect(() => {
    if (!isSuperAdmin || isEdit) return;

    getUniversities()
      .then((items) => {
        setUniversities(items);
        setTargetUnivId((current) => current ?? items[0]?.univId ?? null);
      })
      .catch((error) => {
        console.error('Failed to load universities:', error);
      });
  }, [isEdit, isSuperAdmin]);

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
      alert('JPG, PNG, WEBP ?대?吏留?泥⑤??????덉뒿?덈떎.');
    }

    setImages((prev) => [...prev, ...validImages].slice(0, 10));
    event.target.value = '';
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('?쒕ぉ???낅젰??二쇱꽭??');
      return;
    }
    if (!content.trim()) {
      alert('?댁슜???낅젰??二쇱꽭??');
      return;
    }

    if (isSuperAdmin && !isEdit && targetUnivId == null) {
      alert('寃뚯떆湲???깅줉???숆탳瑜??좏깮?댁쨾.');
      return;
    }

    const BOARD_ID_MAP: Record<BoardType, number> = {
      free:   1,
      secret: 2,
      notice: 3, // DB BOARD_TYPE ?뚯씠釉?湲곗?
    };

    const selectedUnivId = isSuperAdmin ? targetUnivId ?? undefined : authUnivId ?? undefined;
    const postPayload = {
      boardId:  BOARD_ID_MAP[board],
      title:    title.trim(),
      content:  content.trim(),
      category: category,
      univId:   selectedUnivId,
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
        alert('?섏젙?섏뿀?듬땲??');
      } else {
        if (images.length > 0) {
          await createPostWithImages(postPayload, images);
        } else {
          await createPost(postPayload);
        }
        alert('?깅줉?섏뿀?듬땲??');
      }
      handleBack();
    } catch (err) {
      console.error('writePost error:', err);
      alert(isEdit ? '?섏젙???ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?쒕룄??二쇱꽭??' : '寃뚯떆湲 ?깅줉???ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?쒕룄??二쇱꽭??');
    }
  };

  return (
    <div className='px-[30px] py-7'>
      <div className='mx-auto max-w-[760px]'>
        {/* ?ㅻ줈媛湲?*/}
        <button
          onClick={handleBack}
          className='mb-3.5 flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='size-4' />
          痍⑥냼?섍퀬 ?뚯븘媛湲?
        </button>

        {isSuperAdmin && !isEdit && (
          <Field label='????숆탳'>
            <select
              value={targetUnivId ?? ''}
              onChange={(event) => setTargetUnivId(Number(event.target.value))}
              className='flex h-11 w-full rounded-lg border border-input bg-background px-3.5 py-2 text-[14px] outline-none transition-colors focus:border-primary'
            >
              {universities.map((university) => (
                <option key={university.univId} value={university.univId}>
                  {university.univName}
                </option>
              ))}
            </select>
          </Field>
        )}

        <h2 className='mb-5 text-[22px] font-extrabold tracking-tight'>
          {isEdit ? `${BOARD_LABEL[board]} ?섏젙` : `${BOARD_LABEL[board]} 湲?곌린`}
        </h2>

        {/* ?듬챸 ?덈궡 */}
        {isAnon && (
          <div className='mb-[22px] flex items-center gap-2 rounded-[10px] border border-teal-200 bg-teal-50 px-3.5 py-3 text-[13px] text-teal-700'>
            ?듬챸?쇰줈 ?묒꽦?⑸땲?? ?묒꽦???뺣낫???쒖떆?섏? ?딆?留??쒕줈 議댁쨷?섎뒗 湲??
            遺?곷뱶由쎈땲??
          </div>
        )}

        {/* 怨듭??ы빆 ?덈궡 */}
        {isNotice && (
          <div className='mb-[22px] flex items-center gap-2 rounded-[10px] border border-blue-200 bg-blue-50 px-3.5 py-3 text-[13px] text-blue-700'>
            怨듭??ы빆? ?댁쁺 沅뚰븳???덈뒗 怨꾩젙留?寃뚯떆?????덉뒿?덈떎.
          </div>
        )}

        {/* 移댄뀒怨좊━ */}
        <Field label='移댄뀒怨좊━'>
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

        {/* ?쒕ぉ */}
        <Field label='?쒕ぉ'>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isNotice ? '怨듭? ?쒕ぉ???낅젰?섏꽭?? : '?쒕ぉ???낅젰?섏꽭??
            }
            className='flex h-11 w-full rounded-lg border border-input bg-background px-3.5 py-2 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary'
          />
        </Field>

        {/* ?댁슜 */}
        <Field
          label='?댁슜'
          hint={
            isAnon
              ? '媛쒖씤?뺣낫媛 ?쒕윭?섏? ?딅룄濡?二쇱쓽??二쇱꽭??'
              : '?대?吏???꾨옒 踰꾪듉?쇰줈 異붽??????덉뒿?덈떎.'
          }
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={9}
            placeholder={
              isAnon
                ? '?듬챸?쇰줈 ?명븯寃??댁빞湲곕? ?ㅻ젮二쇱꽭??'
                : isNotice
                  ? '怨듭? ?댁슜???낅젰?섏꽭?? ?쇱젙쨌??겶룸Ц?섏쿂瑜??④퍡 ?곸뼱二쇱꽭??'
                  : '?먯쑀濡?쾶 ?댁빞湲곕? ?곸뼱 蹂댁꽭??'
            }
            className='flex min-h-20 w-full rounded-lg border border-input bg-background px-3.5 py-3 text-[14px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary'
          />
        </Field>

        {/* ?대?吏 泥⑤? - ?듬챸寃뚯떆???쒖쇅 */}
        {!isAnon && (
          <Field label='?ъ쭊 泥⑤?'>
            <div className='flex gap-3'>
              <label
                htmlFor={fileInputId}
                className='flex size-24 flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-input bg-slate-50 text-muted-foreground hover:bg-slate-100'
              >
                <ImagePlus className='size-[22px]' />
                <span className='text-xs font-semibold'>?ъ쭊 異붽?</span>
              </label>
              <input
                id={fileInputId}
                type='file'
                accept='image/jpeg,image/png,image/webp'
                multiple
                onChange={handleImageChange}
                className='sr-only'
              />
              {/* 誘몃━蹂닿린 ??TODO: ?뚯씪 ?낅줈??援ы쁽 ??援먯껜 */}
              {imagePreviews.map((img, i) => (
                <div
                  key={i}
                  className='relative size-24 overflow-hidden rounded-xl bg-slate-200'
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`泥⑤? ?대?吏 ${i + 1}`} className='h-full w-full object-cover' />
                  <button
                    type='button'
                    onClick={() =>
                      setImages((prev) => prev.filter((_, idx) => idx !== i))
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

        {/* ?섎떒 踰꾪듉 */}
        <div className='mt-1.5 flex justify-end gap-2 border-t border-border pt-3'>
          <Button variant='outline' onClick={handleBack}>
            痍⑥냼
          </Button>
          {!isNotice && (
            <Button variant='ghost'>
              <Save className='size-4' />
              ?꾩떆???
            </Button>
          )}
          <Button onClick={handleSubmit}>
            <Send className='size-4' />
            {isNotice ? '怨듭? 寃뚯떆' : isEdit ? '?섏젙 ?꾨즺' : '?깅줉?섍린'}
          </Button>
        </div>
      </div>
    </div>
  );
}

