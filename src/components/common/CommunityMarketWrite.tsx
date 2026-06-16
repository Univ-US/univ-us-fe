/* eslint-disable */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Camera, X, MapPin, Send, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  createProduct,
  getProductDetail,
  updateProduct,
  updateProductImages,
  uploadProductImages,
} from '@/lib/marketApi';
import { getUniversities, type University } from '@/lib/homeApi';
import { API_BASE_URL } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { ProductCategory, ProductImage, TradeStatus } from '@/types/community';

// ?? 移댄뀒怨좊━ 紐⑸줉 ??????????????????????????????????????
const CATEGORIES: ProductCategory[] = ['援먯옱', '?꾩옄湲곌린', '?앺솢?⑺뭹', '湲고?'];
const EDITABLE_PRODUCT_STATUSES: TradeStatus[] = ['SALE', 'RESERVE'];
const PRODUCT_STATUS_LABELS: Record<TradeStatus, string> = {
  SALE: '?먮ℓ以?,
  RESERVE: '?덉빟以?,
  DONE: '嫄곕옒?꾨즺',
};

const resolveImageUrl = (url: string) =>
  url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

// ?? 移?踰꾪듉 ???????????????????????????????????????????
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
        'rounded-md border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0',
        active
          ? 'scale-[1.03] border-primary bg-primary text-white shadow-sm'
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
    <div className="mb-[22px]">
      <label className="mb-2.5 block text-[13px] font-bold text-slate-800">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ?? 硫붿씤 而댄룷?뚰듃 ??????????????????????????????????????
export default function CommunityMarketWrite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const isEdit = !!productId;
  const [category, setCategory] = useState<ProductCategory>('援먯옱');
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [productStatus, setProductStatus] = useState<TradeStatus>('SALE');
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [initialExistingImageIds, setInitialExistingImageIds] = useState<number[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [targetUnivId, setTargetUnivId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const role = useAuthStore((state) => state.role);
  const authUnivId = useAuthStore((state) => state.univId);
  const totalImageCount = existingImages.length + images.length;
  const isSuperAdmin = role === 'SUA';

  const handleBack = useCallback(() => router.push('/community/market'), [router]);

  useEffect(() => {
    const urls = images.map((image) => URL.createObjectURL(image));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

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
        setProductStatus(product.productStatus === 'DONE' ? 'SALE' : product.productStatus);
        setExistingImages(product.images ?? []);
        setInitialExistingImageIds((product.images ?? []).map((image) => image.imageId));
      } catch (err) {
        console.error('?곹뭹 議고쉶 ?ㅽ뙣:', err);
        alert('?곹뭹 ?뺣낫瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??');
        handleBack();
      }
    };

    fetchProduct();
  }, [handleBack, isEdit, productId]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const imageFiles = selectedFiles.filter((file) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    );

    if (imageFiles.length !== selectedFiles.length) {
      alert('JPG, PNG, WEBP ?대?吏留?泥⑤??????덉뒿?덈떎.');
    }

    const availableSlots = Math.max(0, 5 - totalImageCount);
    if (imageFiles.length > availableSlots) {
      alert('?곹뭹 ?대?吏??湲곗〈 ?대?吏? ???대?吏瑜??⑹퀜 理쒕? 5?κ퉴吏 泥⑤??????덉뒿?덈떎.');
    }
    setImages((prev) => [...prev, ...imageFiles].slice(0, prev.length + availableSlots));
    event.target.value = '';
  };

  const handleRemoveImage = (removeIndex: number) => {
    setImages((prev) => prev.filter((_, index) => index !== removeIndex));
  };

  const handleRemoveExistingImage = (removeIndex: number) => {
    setExistingImages((prev) => prev.filter((_, index) => index !== removeIndex));
  };

  const hasImageChanges = () => {
    if (images.length > 0) return true;
    const currentImageIds = existingImages.map((image) => image.imageId);
    return (
      currentImageIds.length !== initialExistingImageIds.length ||
      currentImageIds.some((imageId, index) => imageId !== initialExistingImageIds[index])
    );
  };

  const handleSubmit = async () => {
    if (!productName.trim()) {
      alert('?곹뭹紐낆쓣 ?낅젰??二쇱꽭??');
      return;
    }
    if (!isFree && !price.trim()) {
      alert('媛寃⑹쓣 ?낅젰??二쇱꽭??');
      return;
    }
    if (!place.trim()) {
      alert('嫄곕옒 ?щ쭩 ?μ냼瑜??낅젰??二쇱꽭??');
      return;
    }
    if (!description.trim()) {
      alert('?곹뭹 ?ㅻ챸???낅젰??二쇱꽭??');
      return;
    }

    if (isSuperAdmin && !isEdit && targetUnivId == null) {
      alert('?곹뭹???깅줉???숆탳瑜??좏깮?댁쨾.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedUnivId = isSuperAdmin ? targetUnivId ?? undefined : authUnivId ?? undefined;
      const payload = {
        productName: productName.trim(),
        price: isFree ? 0 : Number(price.replace(/[^0-9]/g, '')),
        description: description.trim(),
        place: place.trim(),
        category,
        productStatus: isEdit ? productStatus : 'SALE',
        univId: selectedUnivId,
      };

      const res = isEdit
        ? await updateProduct(Number(productId), payload)
        : await createProduct(payload);

      if (res.success) {
        if (!isEdit && images.length > 0) {
          const savedProductId = isEdit ? Number(productId) : res.productId;
          if (!savedProductId) {
            throw new Error('?곹뭹 ?대?吏 ?낅줈?쒖뿉 ?꾩슂???곹뭹 ID媛 ?놁뒿?덈떎.');
          }

          await uploadProductImages(savedProductId, images);
        }

        if (isEdit && hasImageChanges()) {
          await updateProductImages(
            Number(productId),
            existingImages.map((image) => image.imageId),
            images,
          );
        }

        alert(isEdit ? '?곹뭹???섏젙?섏뿀?듬땲??' : '?곹뭹???깅줉?섏뿀?듬땲??');
        handleBack();
      } else {
        alert(res.message ?? (isEdit ? '?곹뭹 ?섏젙???ㅽ뙣?덉뒿?덈떎.' : '?곹뭹 ?깅줉???ㅽ뙣?덉뒿?덈떎.'));
      }
    } catch (err) {
      console.error('?곹뭹 ?깅줉 ?ㅽ뙣:', err);
      alert(isEdit ? '?곹뭹 ?섏젙???ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?쒕룄??二쇱꽭??' : '?곹뭹 ?깅줉???ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?쒕룄??二쇱꽭??');
    } finally {
      setSubmitting(false);
    }
  };

  // 媛寃??낅젰 ?щ㎎ (?レ옄留?
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setPrice(raw ? Number(raw).toLocaleString('ko-KR') : '');
  };

  return (
    <div className="min-h-screen bg-slate-50 px-[30px] py-7">
      <div className="mx-auto max-w-[920px]">
        {/* ?ㅻ줈媛湲?*/}
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-all duration-200 hover:-translate-x-0.5 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          以묎퀬嫄곕옒 ??
        </button>

        <div className="mb-5 flex items-end justify-between border-b border-border pb-4">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-primary">
              Market Form
            </p>
            {isSuperAdmin && !isEdit && (
              <div className="mb-3">
                <label className="mb-2 block text-[13px] font-bold text-slate-800">
                  ????숆탳
                </label>
                <select
                  value={targetUnivId ?? ''}
                  onChange={(event) => setTargetUnivId(Number(event.target.value))}
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-3.5 py-2 text-[14px] outline-none transition-colors focus:border-primary"
                >
                  {universities.map((university) => (
                    <option key={university.univId} value={university.univId}>
                      {university.univName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <h2 className="mt-1 text-[24px] font-extrabold tracking-tight text-slate-900">
              {isEdit ? '?곹뭹 ?섏젙' : '?곹뭹 ?깅줉'}
            </h2>
          </div>
          <p className="text-[12px] text-slate-500">
            ?ъ쭊, 媛寃? 嫄곕옒 ?μ냼瑜??뺥솗???곸쑝硫?臾몄쓽媛 鍮⑤씪吏묐땲??
          </p>
        </div>

        <div className="rounded-lg border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
          {/* ?ъ쭊 泥⑤? */}
          <Field label="?곹뭹 ?ъ쭊" hint="理쒕? 5?κ퉴吏 泥⑤??????덉뒿?덈떎. 泥?踰덉㎏ ?ъ쭊??????대?吏濡??쒖떆?⑸땲??">
            <div className="flex flex-wrap gap-3">
              <label
                className="flex size-[108px] flex-col items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-input bg-slate-50 text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:text-primary active:translate-y-0"
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  disabled={totalImageCount >= 5}
                  onChange={handleImageChange}
                />
                {totalImageCount === 0 ? (
                  <ImagePlus className="size-[24px]" />
                ) : (
                  <Camera className="size-[22px]" />
                )}
                <span className="text-xs font-semibold">{totalImageCount} / 5</span>
              </label>

              {existingImages.map((image, i) => (
                <div
                  key={image.imageId}
                  className="group/preview relative size-[108px] overflow-hidden rounded-lg border border-border bg-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <img
                    src={resolveImageUrl(image.imageUrl)}
                    alt={`湲곗〈 ?곹뭹 ?대?吏 ${i + 1}`}
                    className="size-full object-cover transition-transform duration-300 group-hover/preview:scale-105"
                  />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                      ???
                    </span>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    湲곗〈
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(i)}
                    className="absolute right-1.5 top-1.5 flex size-[22px] items-center justify-center rounded-md bg-black/60 text-white transition-all duration-200 hover:scale-105 hover:bg-black/75 active:scale-95"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}

              {previewUrls.map((previewUrl, i) => (
                <div
                  key={`${previewUrl}-${i}`}
                  className="group/preview relative size-[108px] overflow-hidden rounded-lg border border-border bg-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <img
                    src={previewUrl}
                    alt={`?곹뭹 ?대?吏 誘몃━蹂닿린 ${i + 1}`}
                    className="size-full object-cover transition-transform duration-300 group-hover/preview:scale-105"
                  />
                  {existingImages.length === 0 && i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                      ???
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute right-1.5 top-1.5 flex size-[22px] items-center justify-center rounded-md bg-black/60 text-white transition-all duration-200 hover:scale-105 hover:bg-black/75 active:scale-95"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-[1fr_240px] gap-5">
            <div>
              {/* ?곹뭹紐?*/}
              <Field label="?곹뭹紐?>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="?? ?먮즺援ъ“ ?꾧났?쒖쟻 (嫄곗쓽 ?덇쾬)"
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-3.5 py-2 text-[13px] outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary focus:shadow-sm focus:ring-2 focus:ring-primary/10"
                />
              </Field>

              {/* 嫄곕옒 ?щ쭩 ?μ냼 */}
              <Field label="嫄곕옒 ?щ쭩 ?μ냼">
                <div className="flex h-11 items-center gap-2 rounded-lg border border-input px-3.5 transition-all duration-200 focus-within:border-primary focus-within:shadow-sm focus-within:ring-2 focus-within:ring-primary/10">
                  <MapPin className="size-[17px] shrink-0 text-muted-foreground" />
                  <input
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="?? 以묒븰?꾩꽌愿 ??
                    className="flex-1 bg-transparent text-[13px] outline-none"
                  />
                </div>
              </Field>

              {/* ?곹뭹 ?ㅻ챸 */}
              <Field
                label="?곹뭹 ?ㅻ챸"
                hint="?곹뭹 ?곹깭, 援щℓ ?쒓린, 嫄곕옒 諛⑹떇 ?깆쓣 ?곸뼱二쇱꽭??"
              >
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={7}
                  placeholder="?곹뭹??????먯꽭???ㅻ챸??二쇱꽭??"
                  className="flex min-h-20 w-full rounded-lg border border-input bg-background px-3.5 py-3 text-[13px] leading-relaxed outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary focus:shadow-sm focus:ring-2 focus:ring-primary/10"
                />
              </Field>
            </div>

            <div className="rounded-lg border border-border bg-slate-50 p-4">
              {/* 移댄뀒怨좊━ */}
              <Field label="移댄뀒怨좊━">
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

              {isEdit && (
                <Field label="?먮ℓ ?곹깭" hint="嫄곕옒?꾨즺??寃곗젣 ?꾨즺 ???먮룞?쇰줈 蹂寃쎈맗?덈떎.">
                  <div className="flex flex-wrap gap-2">
                    {EDITABLE_PRODUCT_STATUSES.map((status) => (
                      <Chip
                        key={status}
                        label={PRODUCT_STATUS_LABELS[status]}
                        active={productStatus === status}
                        onClick={() => setProductStatus(status)}
                      />
                    ))}
                  </div>
                </Field>
              )}

              {/* 媛寃?*/}
              <Field label="媛寃?>
                <div className="space-y-2">
                  <div
                    className={cn(
                      'flex h-11 items-center gap-2 rounded-lg border border-input bg-white px-3.5 transition-all duration-200 focus-within:border-primary focus-within:shadow-sm focus-within:ring-2 focus-within:ring-primary/10',
                      isFree && 'bg-slate-100',
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
                      ??
                    </span>
                  </div>
                  <Chip
                    label="?섎닎 (臾대즺)"
                    active={isFree}
                    onClick={() => {
                      setIsFree(!isFree);
                      setPrice('');
                    }}
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* ?섎떒 踰꾪듉 */}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={handleBack} disabled={submitting} className="transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">
              痍⑥냼
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:translate-x-0.5">
              <Send className="size-4" />
              {submitting ? (isEdit ? '?섏젙 以?..' : '?깅줉 以?..') : isEdit ? '?곹뭹 ?섏젙' : '?곹뭹 ?깅줉'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

