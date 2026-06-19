'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  getCommunityDisplayName,
  getCommunityInitial,
  getCommunityNicknameValue,
  normalizeProfileText,
} from '@/lib/communityProfileDisplay';
import { getMyProfile, updateMyProfile } from '@/lib/cmypageApi';
import { useAuthStore } from '@/store/authStore';
import type { UserProfile } from '@/types/mypage';
import { SectionTitle } from './shared';

const S = {
  container: 'max-w-[620px] overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
  content: 'p-6',
  avatarRow: 'mb-8 flex items-center gap-5',
  avatar: 'flex size-20 items-center justify-center rounded-full bg-primary text-[28px] font-bold text-white',
  avatarText: 'flex flex-col gap-1',
  avatarTitle: 'text-[16px] font-extrabold text-slate-900',
  avatarSub: 'text-[13px] font-medium text-slate-500',
  formGroup: 'flex flex-col gap-5',
  label: 'mb-1.5 block text-[13px] font-bold text-slate-700',
  input: 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary focus:bg-white disabled:cursor-not-allowed disabled:opacity-60',
  inputDisabled: 'w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-[14px] text-slate-500 outline-none',
  hint: 'mt-1.5 text-[12px] font-medium text-slate-400',
  metaGrid: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
  message: 'mt-4 rounded-xl px-4 py-3 text-[13px] font-bold',
  success: 'bg-emerald-50 text-emerald-700',
  error: 'bg-rose-50 text-rose-700',
  toast: 'fixed right-6 top-6 z-50 max-w-[calc(100vw-3rem)] rounded-xl border px-4 py-3 text-[13px] font-bold shadow-lg',
  toastSuccess: 'border-emerald-200 bg-white text-emerald-700',
  toastError: 'border-rose-200 bg-white text-rose-700',
  footer: 'border-t border-border bg-slate-50 p-4 text-right',
  saveBtn: 'rounded-xl bg-primary px-6 py-2.5 text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none',
};

type FeedbackState = {
  type: 'success' | 'error';
  text: string;
} | null;

function statusLabel(status?: string | null) {
  if (status === 'ACTIVE') return '활성';
  if (status === 'SUSPENDED') return '정지';
  if (status === 'INACTIVE') return '비활성';
  return status || '상태 정보 없음';
}

export default function ProfileEdit() {
  const memberName = useAuthStore((s) => s.memberName);
  const communityNickname = useAuthStore((s) => s.communityNickname);
  const univName = useAuthStore((s) => s.univName);
  const updateCommunityNickname = useAuthStore((s) => s.updateCommunityNickname);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState(communityNickname ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<FeedbackState>(null);
  const [toast, setToast] = useState<FeedbackState>(null);

  const showFeedback = (next: Exclude<FeedbackState, null>) => {
    setMessage(next);
    setToast(next);
  };

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        const data = await getMyProfile();
        if (!mounted) return;

        setProfile(data);
        setNickname(getCommunityNicknameValue(data));
      } catch (error) {
        if (!mounted) return;
        showFeedback({
          type: 'error',
          text: getApiErrorMessage(error, '프로필 정보를 불러오지 못했습니다.'),
        });
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const savedNickname = profile
    ? getCommunityNicknameValue(profile)
    : getCommunityNicknameValue({ communityNickname });
  const nextNickname = nickname.trim();
  const displayName =
    normalizeProfileText(profile?.memberName) ??
    normalizeProfileText(memberName) ??
    '사용자';
  const displayNickname = getCommunityDisplayName({
    communityNickname: nextNickname || savedNickname,
    memberName: displayName,
  });
  const schoolText = profile?.univName ?? univName ?? '소속 대학 정보 없음';
  const deptText = profile?.deptName ?? '학과 정보 없음';
  const isUnchanged = nextNickname === savedNickname.trim();
  const isSaveDisabled = isLoading || isSaving || !nextNickname || isUnchanged;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nextNickname) {
      showFeedback({
        type: 'error',
        text: '커뮤니티 닉네임을 입력해주세요.',
      });
      return;
    }

    if (nextNickname.length < 2 || nextNickname.length > 20) {
      showFeedback({
        type: 'error',
        text: '닉네임은 2자 이상 20자 이하로 입력해주세요.',
      });
      return;
    }

    if (isUnchanged) {
      showFeedback({
        type: 'success',
        text: '변경된 내용이 없습니다.',
      });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const updatedProfile = await updateMyProfile({
        communityNickname: nextNickname,
      });
      const updatedNickname = getCommunityNicknameValue(updatedProfile) || nextNickname;

      setProfile(updatedProfile);
      setNickname(updatedNickname);
      updateCommunityNickname(updatedNickname);
      showFeedback({
        type: 'success',
        text: '프로필이 저장되었습니다.',
      });
    } catch (error) {
      showFeedback({
        type: 'error',
        text: getApiErrorMessage(error, '프로필 저장에 실패했습니다.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {toast && (
        <div
          aria-live='polite'
          className={`${S.toast} ${toast.type === 'success' ? S.toastSuccess : S.toastError}`}
        >
          {toast.text}
        </div>
      )}
      <SectionTitle sub='커뮤니티에서 사용할 닉네임과 내 정보를 확인하세요.'>
        프로필 수정
      </SectionTitle>
      <form className={S.container} onSubmit={handleSubmit}>
        <div className={S.content}>
          <div className={S.avatarRow}>
            <div className={S.avatar}>
              {getCommunityInitial({
                communityNickname: displayNickname,
                memberName: displayName,
              })}
            </div>
            <div className={S.avatarText}>
              <strong className={S.avatarTitle}>{displayNickname}</strong>
              <span className={S.avatarSub}>{displayName}</span>
            </div>
          </div>

          <div className={S.formGroup}>
            <div>
              <label className={S.label} htmlFor='communityNickname'>
                커뮤니티 닉네임
              </label>
              <input
                id='communityNickname'
                type='text'
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                className={S.input}
                maxLength={20}
                placeholder='닉네임을 입력해주세요.'
                disabled={isLoading || isSaving}
              />
              <p className={S.hint}>2자 이상 20자 이하로 입력해주세요.</p>
            </div>

            <div className={S.metaGrid}>
              <div>
                <label className={S.label}>대학</label>
                <input type='text' value={schoolText} disabled className={S.inputDisabled} />
              </div>
              <div>
                <label className={S.label}>학과</label>
                <input type='text' value={deptText} disabled className={S.inputDisabled} />
              </div>
              <div>
                <label className={S.label}>이름</label>
                <input type='text' value={displayName} disabled className={S.inputDisabled} />
              </div>
              <div>
                <label className={S.label}>상태</label>
                <input
                  type='text'
                  value={statusLabel(profile?.status)}
                  disabled
                  className={S.inputDisabled}
                />
              </div>
            </div>
          </div>

          {message && (
            <p className={`${S.message} ${message.type === 'success' ? S.success : S.error}`}>
              {message.text}
            </p>
          )}
        </div>
        <div className={S.footer}>
          <button
            type='submit'
            className={S.saveBtn}
            disabled={isSaveDisabled}
          >
            {isSaving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </>
  );
}
