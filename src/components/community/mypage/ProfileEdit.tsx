'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/apiError';
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
  footer: 'border-t border-border bg-slate-50 p-4 text-right',
  saveBtn: 'rounded-xl bg-primary px-6 py-2.5 text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none',
};

type MessageState = {
  type: 'success' | 'error';
  text: string;
} | null;

function firstLetter(value: string) {
  return Array.from(value.trim() || 'U')[0];
}

function statusLabel(status?: string | null) {
  if (status === 'ACTIVE') return '활성';
  if (status === 'INACTIVE') return '비활성';
  return status || '상태 정보 없음';
}

export default function ProfileEdit() {
  const memberName = useAuthStore((s) => s.memberName);
  const communityNickname = useAuthStore((s) => s.communityNickname);
  const univName = useAuthStore((s) => s.univName);
  const updateCommunityNickname = useAuthStore((s) => s.updateCommunityNickname);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState(communityNickname ?? memberName ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        const data = await getMyProfile();
        if (!mounted) return;

        setProfile(data);
        setNickname(data.communityNickname ?? data.memberName ?? '');
      } catch (error) {
        if (!mounted) return;
        setMessage({
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

  const baseNickname = profile?.communityNickname ?? communityNickname ?? '';
  const displayName = profile?.memberName ?? memberName ?? '사용자';
  const displayNickname = nickname.trim() || baseNickname || displayName;
  const schoolText = profile?.univName ?? univName ?? '소속 대학 정보 없음';
  const deptText = profile?.deptName ?? '학과 정보 없음';
  const isUnchanged = nickname.trim() === baseNickname.trim();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextNickname = nickname.trim();
    if (nextNickname.length < 2 || nextNickname.length > 20) {
      setMessage({
        type: 'error',
        text: '닉네임은 2자 이상 20자 이하로 입력해주세요.',
      });
      return;
    }

    if (isUnchanged) {
      setMessage({
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
      const updatedNickname = updatedProfile.communityNickname ?? nextNickname;

      setProfile(updatedProfile);
      setNickname(updatedNickname);
      updateCommunityNickname(updatedNickname);
      setMessage({
        type: 'success',
        text: '프로필이 저장되었습니다.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, '프로필 저장에 실패했습니다.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SectionTitle sub='커뮤니티에서 사용할 닉네임과 내 정보를 확인하세요.'>
        프로필 수정
      </SectionTitle>
      <form className={S.container} onSubmit={handleSubmit}>
        <div className={S.content}>
          <div className={S.avatarRow}>
            <div className={S.avatar}>{firstLetter(displayNickname)}</div>
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
            disabled={isLoading || isSaving || !nickname.trim()}
          >
            {isSaving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </>
  );
}
