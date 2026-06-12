'use client';

import { useAuthStore } from '@/store/authStore';
import { SectionTitle } from './shared';

const S = {
  container: 'max-w-[620px] overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
  content: 'p-6',
  avatarRow: 'mb-8 flex items-center gap-5',
  avatar: 'flex size-20 items-center justify-center rounded-full bg-primary text-[28px] font-bold text-white',
  changeImageBtn: 'rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-200',
  formGroup: 'flex flex-col gap-5',
  label: 'mb-1.5 block text-[13px] font-bold text-slate-700',
  input: 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary focus:bg-white',
  inputDisabled: 'w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-[14px] text-slate-500 outline-none',
  footer: 'border-t border-border bg-slate-50 p-4 text-right',
  saveBtn: 'rounded-xl bg-primary px-6 py-2.5 text-[14px] font-bold text-white shadow-sm hover:bg-primary/90',
};

export default function ProfileEdit() {
  const memberName = useAuthStore((s) => s.memberName);
  const communityNickname = useAuthStore((s) => s.communityNickname);
  const univName = useAuthStore((s) => s.univName);

  return (
    <>
      <SectionTitle sub='커뮤니티에서 사용할 닉네임과 내 정보를 수정해요'>
        프로필 수정
      </SectionTitle>
      <div className={S.container}>
        <div className={S.content}>
          <div className={S.avatarRow}>
            <div className={S.avatar}>
              {(communityNickname || memberName || '사').charAt(0)}
            </div>
            <button className={S.changeImageBtn}>
              이미지 변경
            </button>
          </div>
          <div className={S.formGroup}>
            <div>
              <label className={S.label}>닉네임</label>
              <input
                type='text'
                defaultValue={communityNickname || memberName || '사용자'}
                className={S.input}
              />
            </div>
            <div>
              <label className={S.label}>학교 (수정 불가)</label>
              <input
                type='text'
                value={univName || '소속 학교'}
                disabled
                className={S.inputDisabled}
              />
            </div>
          </div>
        </div>
        <div className={S.footer}>
          <button className={S.saveBtn}>저장하기</button>
        </div>
      </div>
    </>
  );
}
