'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Camera, X, MapPin, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createProduct, getProductDetail, updateProduct } from '@/lib/marketApi';
import type { ProductCategory } from '@/types/community';

// ── 카테고리 목록 ──────────────────────────────────────
const CATEGORIES: ProductCategory[] = ['교재', '전자기기', '생활용품', '기타'];

// ── 칩 버튼 ───────────────────────────────────────────
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
        'rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors',
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
    <div className="mb-[22px]">
      <label className="mb-2.5 block text-[13px] font-bold">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function CommunityMarketWrite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const isEdit = !!productId;
  const [category, setCategory] = useState<ProductCategory>('교재');
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [imageCount, setImageCount] = useState(0); // TODO: 실제 파일 업로드로 교체
  const [submitting, setSubmitting] = useState(false);

  const handleBack = useCallback(() => router.push('/community/market'), [router]);

  useEffect(() => {
    if (!isEdit) return;

    const fetchProduct = async () => {
      try {
        const product = await getProductDetail(Number(productId));
        setCategory(product.category as ProductCategory);
        setProductName(product.productName);
        setPrice(product.price ? product.price.toLocaleString('ko-KR') : '');
        setIsFree(product.price === 0);
        setPlace(product.place ?? '');
        setDescription(product.description ?? '');
      } catch (err) {
        console.error('상품 조회 실패:', err);
        alert('상품 정보를 불러오지 못했어.');
        handleBack();
      }
    };

    fetchProduct();
  }, [handleBack, isEdit, productId]);

  const handleSubmit = async () => {
    if (!productName.trim()) {
      alert('상품명을 입력해주세요.');
      return;
    }
    if (!isFree && !price.trim()) {
      alert('가격을 입력해주세요.');
      return;
    }
    if (!place.trim()) {
      alert('거래 희망 장소를 입력해주세요.');
      return;
    }
    if (!description.trim()) {
      alert('상품 설명을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        productName: productName.trim(),
        price: isFree ? 0 : Number(price.replace(/[^0-9]/g, '')),
        description: description.trim(),
        place: place.trim(),
        category,
        productStatus: 'SALE',
      };

      const res = isEdit
        ? await updateProduct(Number(productId), payload)
        : await createProduct(payload);

      if (res.success) {
        alert(isEdit ? '상품이 수정되었습니다.' : '상품이 등록되었습니다.');
        handleBack();
      } else {
        alert(res.message ?? (isEdit ? '상품 수정에 실패했어.' : '상품 등록에 실패했어.'));
      }
    } catch (err) {
      console.error('상품 등록 실패:', err);
      alert(isEdit ? '상품 수정에 실패했어. 다시 시도해줘.' : '상품 등록에 실패했어. 다시 시도해줘.');
    } finally {
      setSubmitting(false);
    }
  };

  // 가격 입력 포맷 (숫자만)
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setPrice(raw ? Number(raw).toLocaleString('ko-KR') : '');
  };

  return (
    <div className="px-[30px] py-7">
      <div className="mx-auto max-w-[760px]">
        {/* 뒤로가기 */}
        <button
          onClick={handleBack}
          className="mb-3.5 flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          중고거래 홈
        </button>

        <h2 className="mb-5 text-[22px] font-extrabold tracking-tight">
          {isEdit ? '상품 수정' : '상품 등록'}
        </h2>

        {/* 사진 첨부 */}
        <Field label="상품 사진" hint="최대 5장까지 첨부할 수 있어요.">
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (imageCount < 5) setImageCount(imageCount + 1);
              }}
              className="flex size-[100px] flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-input bg-slate-50 text-muted-foreground hover:bg-slate-100"
            >
              <Camera className="size-[22px]" />
              <span className="text-xs font-semibold">{imageCount} / 5</span>
            </button>

            {Array.from({ length: imageCount }).map((_, i) => (
              <div
                key={i}
                className="relative size-[100px] overflow-hidden rounded-xl bg-gradient-to-br from-teal-400 to-teal-700"
              >
                <button
                  onClick={() => setImageCount(imageCount - 1)}
                  className="absolute right-1.5 top-1.5 flex size-[22px] items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Field>

        {/* 상품명 */}
        <Field label="상품명">
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 자료구조 전공서적 (거의 새것)"
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3.5 py-2 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
          />
        </Field>

        {/* 카테고리 */}
        <Field label="카테고리">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                active={category === cat}
                onClick={() => setCategory(cat)}
              />
            ))}
          </div>
        </Field>

        {/* 가격 */}
        <Field label="가격">
          <div className="flex gap-3">
            <div
              className={cn(
                'flex flex-1 items-center gap-2 rounded-lg border border-input px-3.5 py-2.5',
                isFree && 'bg-slate-50',
              )}
            >
              <input
                disabled={isFree}
                value={isFree ? '' : price}
                onChange={handlePriceChange}
                placeholder="0"
                className="flex-1 bg-transparent text-right text-[14px] tabular-nums outline-none disabled:cursor-not-allowed"
              />
              <span className="text-[13px] font-semibold text-muted-foreground">
                원
              </span>
            </div>
            <Chip
              label="나눔 (무료)"
              active={isFree}
              onClick={() => {
                setIsFree(!isFree);
                setPrice('');
              }}
            />
          </div>
        </Field>

        {/* 거래 희망 장소 */}
        <Field label="거래 희망 장소">
          <div className="flex items-center gap-2 rounded-lg border border-input px-3.5 py-2.5 focus-within:border-primary">
            <MapPin className="size-[17px] shrink-0 text-muted-foreground" />
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="예) 중앙도서관 앞"
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
          </div>
        </Field>

        {/* 상품 설명 */}
        <Field
          label="상품 설명"
          hint="상품 상태, 구매 시기, 거래 방식 등을 적어주세요."
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder="상품에 대해 자세히 설명해주세요."
            className="flex min-h-20 w-full rounded-lg border border-input bg-background px-3.5 py-3 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
          />
        </Field>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" onClick={handleBack} disabled={submitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Send className="size-4" />
            {submitting ? (isEdit ? '수정 중...' : '등록 중...') : isEdit ? '상품 수정' : '상품 등록'}
          </Button>
        </div>
      </div>
    </div>
  );
}
