"use client";

// ─────────────────────────────────────────────────────────────
// [공용 모달 컴포넌트] LMS 프로필 이미지 크롭/위치 조정 다이얼로그
// - PLM-001(교수)·SLM-001(학생) 프로필 페이지가 함께 재사용하는 공용 컴포넌트.
//   추가로 LMS 프로필 이미지 편집이 필요한 화면이 생기면 이 컴포넌트를 그대로 가져다 쓴다.
// - 선택한 이미지를 원형 영역에 맞춰 줌/드래그로 위치 조정 후 잘라낸 File을 반환
// - 결과 mimeType·파일명은 원본 유지(JPG/PNG), 업로드 흐름(updateXxxProfile)에 그대로 투입
// ─────────────────────────────────────────────────────────────
import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import useEscapeClose from "@/components/lms/useEscapeClose";

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string | null; // 선택 이미지의 ObjectURL
  fileName: string; // 원본 파일명 유지
  mimeType: string; // 원본 타입 유지 (image/jpeg | image/png)
  onCancel: () => void;
  onComplete: (file: File) => void;
}

export default function ImageCropDialog({
  open,
  imageSrc,
  fileName,
  mimeType,
  onCancel,
  onComplete,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setAreaPixels(areaPx);
  }, []);

  // ESC = '취소' 버튼과 동일 (적용 중엔 취소 버튼처럼 비활성)
  useEscapeClose(open && !!imageSrc && !processing, onCancel);

  const handleApply = async () => {
    if (!imageSrc || !areaPixels) return;
    setProcessing(true);
    try {
      const file = await getCroppedFile(imageSrc, areaPixels, fileName, mimeType);
      onComplete(file);
    } finally {
      setProcessing(false);
    }
  };

  if (!open || !imageSrc) return null;

  return (
    <div
      // 사이드바(w-60=240px)를 제외한 본문 영역 기준으로 중앙 정렬 (left-60)
      className="fixed inset-y-0 right-0 left-60 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="프로필 이미지 위치 조정"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">프로필 이미지 조정</h3>
          <p className="text-xs text-slate-500">확대·드래그로 위치를 맞춘 뒤 적용하세요.</p>
        </div>

        {/* 크롭 영역 (원형 미리보기) */}
        <div className="relative h-72 w-full bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* 줌 슬라이더 */}
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="text-xs text-slate-500">축소</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="확대/축소"
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary"
          />
          <span className="text-xs text-slate-500">확대</span>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button variant="outline" size="lg" onClick={onCancel} disabled={processing}>
            취소
          </Button>
          <Button size="lg" onClick={handleApply} disabled={processing || !areaPixels}>
            {processing ? "적용 중…" : "적용"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── 캔버스로 선택 영역을 잘라 File 생성 ──────────────────────
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

async function getCroppedFile(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string,
  mimeType: string
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context를 가져올 수 없습니다.");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const type = mimeType === "image/png" ? "image/png" : "image/jpeg";
  const quality = type === "image/jpeg" ? 0.92 : undefined;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("이미지 변환에 실패했습니다."))),
      type,
      quality
    );
  });

  return new File([blob], fileName, { type });
}
