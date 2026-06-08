"use client";

// SLM-001 — 학생 LMS 프로필 (학번·학과·이미지 화면)
// 수정 가능: 프로필 이미지 · 이메일 / 읽기전용(관리자 변경): 이름 · 학번 · 학과 · 휴대폰번호
// 회원탈퇴(SLM-012): 관리자 처리(요청만 전송)
// 프로필 데이터는 공유 스토어(useStudentProfileStore)에서 — 저장 시 사이드바와 동시 동기화
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  requestStudentSecession,
  STUDENT_PROFILE_IMAGE_MAX_SIZE,
  STUDENT_PROFILE_IMAGE_ALLOWED_TYPES,
} from "@/lib/lmsStudentApi";
import { useStudentProfileStore } from "@/store/lms/lmsStudentProfileStore";

// 이미지 URL 해석: BE가 상대경로(/uploads/...)를 주므로 로컬 개발 땐 API 도메인을 붙인다.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9090";
const resolveImageUrl = (url: string | null) =>
  !url ? null : url.startsWith("http") ? url : `${API_BASE}${url}`;

export default function StudentProfilePage() {
  // 공유 스토어 (저장된 프로필 = single source of truth)
  const profile = useStudentProfileStore((s) => s.profile);
  const loadProfile = useStudentProfileStore((s) => s.load);
  const updateProfile = useStudentProfileStore((s) => s.update);

  // 폼 로컬 draft (편집 중 값 — 저장 전엔 스토어/사이드바에 영향 없음)
  const [email, setEmail] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 마운트 시 조회 (스토어가 이미 들고 있으면 스킵)
  useEffect(() => {
    loadProfile().catch(() =>
      setError("프로필을 불러오지 못했습니다. 로그인 상태를 확인해주세요.")
    );
  }, [loadProfile]);

  // 스토어 profile이 바뀌면(최초 로드 / 저장 성공) 폼 draft를 동기화
  useEffect(() => {
    if (profile) {
      setEmail(profile.lmsStudentProfileEmail ?? "");
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
    if (!STUDENT_PROFILE_IMAGE_ALLOWED_TYPES.includes(file.type)) {
      setError("이미지는 JPG 또는 PNG 형식만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > STUDENT_PROFILE_IMAGE_MAX_SIZE) {
      setError("이미지 용량은 30MB를 초과할 수 없습니다.");
      return;
    }
    setImageFile(file);
  };

  const handleCancel = () => {
    if (profile) {
      setEmail(profile.lmsStudentProfileEmail ?? "");
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
      await updateProfile({ email, image: imageFile });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice("변경사항이 저장되었습니다.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "저장에 실패했습니다. 입력값을 확인해주세요."));
    } finally {
      setSaving(false);
    }
  };

  const handleSecession = async () => {
    if (!confirm("회원탈퇴를 요청하시겠습니까? (관리자 승인 후 처리됩니다)")) return;
    setError(null);
    setNotice(null);
    try {
      await requestStudentSecession();
      setNotice("회원탈퇴가 요청되었습니다. 관리자 처리를 기다려주세요.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "회원탈퇴 요청에 실패했습니다."));
    }
  };

  const avatarSrc =
    imagePreview ?? resolveImageUrl(profile?.lmsStudentProfileImageUrl ?? null);
  const initial = profile?.lmsStudentProfileName?.trim()?.[0] ?? "U";

  // 변경사항 여부: 이메일이 저장값과 다르거나 새 이미지를 선택한 경우
  const isDirty =
    !!imageFile || (profile ? email !== (profile.lmsStudentProfileEmail ?? "") : false);

  if (!profile && !error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        프로필을 불러오는 중…
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

          {/* 이름 / 학번 (읽기전용) */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="이름" note="※ 이름은 관리자를 통해 변경 가능">
              <input value={profile?.lmsStudentProfileName ?? ""} readOnly className={readonlyInput} />
            </Field>
            <Field label="학번" note="※ 학번은 관리자를 통해 변경 가능">
              <input value={profile?.lmsStudentProfileStudentNo ?? ""} readOnly className={readonlyInput} />
            </Field>

            {/* 학과 (읽기전용) / 휴대폰 번호 (읽기전용) */}
            <Field label="학과" note="※ 학과는 관리자를 통해 변경 가능">
              <input value={profile?.lmsStudentProfileDepartment ?? ""} readOnly className={readonlyInput} />
            </Field>
            <Field label="휴대폰 번호" note="※ 휴대폰 번호는 관리자를 통해 변경 가능">
              <input value={profile?.lmsStudentProfilePhoneNumber ?? ""} readOnly className={readonlyInput} />
            </Field>
          </div>

          {/* 이메일 (수정 가능) */}
          <div className="mt-5">
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

          {/* 회원탈퇴 요청 (SLM-012) */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-400">계정을 더 이상 사용하지 않으시나요?</span>
            <button
              type="button"
              onClick={handleSecession}
              className="text-sm font-semibold text-red-500 hover:underline"
            >
              ⚠ 회원탈퇴 요청 (관리자 처리)
            </button>
          </div>
        </section>
      </div>
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
