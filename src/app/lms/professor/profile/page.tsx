"use client";

// PLM-001 — 교수 LMS 프로필 (소속·이미지 수정)
// 수정 가능: 프로필 이미지 · 이메일 · 소개 / 읽기전용(관리자 변경): 이름 · 소속학과 · 핸드폰번호
// 회원탈퇴(PLM-012): 관리자 처리(요청만 전송)
// 프로필 데이터는 공유 스토어(useProfessorProfileStore)에서 — 저장 시 사이드바와 동시 동기화
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  PROFILE_IMAGE_MAX_SIZE,
  PROFILE_IMAGE_ALLOWED_TYPES,
} from "@/lib/lmsProfessorApi";
import { useProfessorProfileStore } from "@/store/lms/lmsProfessorProfileStore";
import { describeApiError } from "@/lib/lmsApiError";
import ImageCropDialog from "@/components/lms/ImageCropDialog";

// 이미지 URL 해석: BE가 상대경로(/uploads/...)를 주므로 로컬 개발 땐 API 도메인을 붙인다.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9090";
const resolveImageUrl = (url: string | null) =>
  !url ? null : url.startsWith("http") ? url : `${API_BASE}${url}`;

export default function ProfessorProfilePage() {
  // 공유 스토어 (저장된 프로필 = single source of truth)
  const profile = useProfessorProfileStore((s) => s.profile);
  const loadProfile = useProfessorProfileStore((s) => s.load);
  const reloadProfile = useProfessorProfileStore((s) => s.reload);
  const updateProfile = useProfessorProfileStore((s) => s.update);

  // 폼 로컬 draft (편집 중 값 — 저장 전엔 스토어/사이드바에 영향 없음)
  const [email, setEmail] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 크롭 모달: 선택 이미지의 ObjectURL + 원본 메타(파일명/타입)
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropMeta, setCropMeta] = useState<{ name: string; type: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null); // 최초 조회 실패(BE 문제)
  const [notice, setNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 마운트 시 조회 (스토어가 이미 들고 있으면 스킵)
  useEffect(() => {
    loadProfile().catch((e) => setLoadError(describeApiError(e)));
  }, [loadProfile]);

  const handleRetry = () => {
    setLoadError(null);
    reloadProfile().catch((e) => setLoadError(describeApiError(e)));
  };

  // 스토어 profile이 바뀌면(최초 로드 / 저장 성공) 폼 draft를 동기화
  useEffect(() => {
    if (profile) {
      setEmail(profile.lmsProfessorProfileEmail ?? "");
      setIntroduction(profile.lmsProfessorProfileIntroduction ?? "");
      setImageFile(null);
    }
  }, [profile]);

  // 선택한 이미지 미리보기 URL 정리(메모리 누수 방지)
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handlePickImage = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!PROFILE_IMAGE_ALLOWED_TYPES.includes(file.type)) {
      setError("이미지는 JPG 또는 PNG 형식만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_SIZE) {
      setError("이미지 용량은 30MB를 초과할 수 없습니다.");
      return;
    }
    // 바로 적용하지 않고 크롭 모달을 띄워 위치를 조정한다
    setCropSrc(URL.createObjectURL(file));
    setCropMeta({ name: file.name, type: file.type });
  };

  // 크롭 모달 닫기(취소/완료 공통): ObjectURL 정리 + 파일 input 초기화
  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 크롭 적용: 잘라낸 File을 draft 이미지로 사용
  const handleCropComplete = (file: File) => {
    setImageFile(file);
    closeCrop();
  };

  const handleCancel = () => {
    if (profile) {
      setEmail(profile.lmsProfessorProfileEmail ?? "");
      setIntroduction(profile.lmsProfessorProfileIntroduction ?? "");
    }
    setImageFile(null);
    setError(null);
    setNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      // 저장 성공 시 스토어 profile 갱신 → 위 useEffect가 폼 동기화 + 사이드바도 자동 반영
      await updateProfile({ email, introduction, image: imageFile });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice("변경사항이 저장되었습니다.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "저장에 실패했습니다. 입력값을 확인해주세요."));
    } finally {
      setSaving(false);
    }
  };

  const router = useRouter();

  // 회원 탈퇴(PLM-012): 직접 처리 대신 문의(/home/contact)로 이동 — 관리자가 문의로 처리
  const handleSecession = () => {
    if (!confirm("회원 탈퇴는 문의를 통해 처리됩니다. 문의 페이지로 이동할까요?")) return;
    router.push("/home/contact");
  };

  const avatarSrc =
    imagePreview ?? resolveImageUrl(profile?.lmsProfessorProfileImageUrl ?? null);
  const initial = profile?.lmsProfessorProfileName?.trim()?.[0] ?? "U";

  // 변경사항 여부: 이메일/소개가 저장값과 다르거나 새 이미지를 선택한 경우
  const isDirty =
    !!imageFile ||
    (profile
      ? email !== (profile.lmsProfessorProfileEmail ?? "") ||
        introduction !== (profile.lmsProfessorProfileIntroduction ?? "")
      : false);

  if (!profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        {loadError ? (
          <>
            <p className="text-sm text-red-500">⚠ 프로필을 불러오지 못했습니다 — {loadError}</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              다시 시도
            </Button>
          </>
        ) : (
          <p className="text-slate-500">프로필을 불러오는 중…</p>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">프로필 설정</h1>
          <p className="text-sm text-slate-500">계정 정보 및 프로필 이미지 관리</p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-slate-800">프로필 정보 수정</h2>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
          )}
          {notice && (
            <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>
          )}

          {/* 프로필 이미지 */}
          <div className="mb-8 flex flex-col items-center gap-2">
            <div className="relative">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-teal-600 text-4xl font-semibold text-white">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="프로필 이미지" className="h-full w-full object-cover" />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="프로필 이미지 변경"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-white shadow hover:bg-slate-800"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handlePickImage}
                className="hidden"
              />
            </div>
            <p className="text-xs text-slate-400">이미지를 클릭하여 변경 · JPG, PNG / 최대 30MB</p>
          </div>

          {/* 이름 / 사번 / 소속 학과 (읽기전용) */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="이름" note="※ 이름은 관리자를 통해 변경 가능">
              <input value={profile?.lmsProfessorProfileName ?? ""} readOnly className={readonlyInput} />
            </Field>
            <Field label="사번" note="※ 사번은 관리자를 통해 변경 가능">
              <input value={profile?.lmsProfessorProfileEmployeeNo ?? ""} readOnly className={readonlyInput} />
            </Field>
            <Field label="소속 학과" note="※ 소속 학과는 관리자를 통해 변경 가능">
              <input value={profile?.lmsProfessorProfileDepartment ?? ""} readOnly className={readonlyInput} />
            </Field>

            <Field label="핸드폰 번호" note="※ 핸드폰 번호는 관리자를 통해 변경 가능">
              <input value={profile?.lmsProfessorProfilePhoneNumber ?? ""} readOnly className={readonlyInput} />
            </Field>
            <Field label="이메일">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@univus.ac.kr"
                className={editableInput}
              />
            </Field>
          </div>

          {/* 소개 (수정 가능, 200자) */}
          <div className="mt-5">
            <Field label="소개">
              <textarea
                value={introduction}
                onChange={(e) => setIntroduction(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="간단한 소개를 입력하세요 (최대 200자)"
                className={`${editableInput} resize-none`}
              />
              <p className="mt-1 text-right text-xs text-slate-400">{introduction.length}/200</p>
            </Field>
          </div>

          {/* 버튼 */}
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleCancel}
              disabled={saving || !isDirty}
            >
              취소
            </Button>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100"
            >
              {saving ? "저장 중…" : "변경사항 저장"}
            </Button>
          </div>

          {/* 회원탈퇴 요청 (PLM-012) */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-400">계정을 더 이상 사용하지 않으시나요?</span>
            <button
              type="button"
              onClick={handleSecession}
              className="text-sm font-semibold text-red-500 hover:underline"
            >
              ⚠ 회원 탈퇴 (문의하기)
            </button>
          </div>
        </section>
      </div>

      {/* 프로필 이미지 크롭/위치 조정 모달 */}
      <ImageCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        fileName={cropMeta?.name ?? "profile.png"}
        mimeType={cropMeta?.type ?? "image/png"}
        onCancel={closeCrop}
        onComplete={handleCropComplete}
      />
    </main>
  );
}

// ── 작은 헬퍼들 ─────────────────────────────────────────────
const readonlyInput =
  "w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500";
const editableInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30";

function Field({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </div>
  );
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const resp = (err as { response?: { data?: unknown } }).response;
    const data = resp?.data;
    if (typeof data === "string" && data) return data;
    if (typeof data === "object" && data !== null && "message" in data) {
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === "string" && msg) return msg;
    }
  }
  return fallback;
}
