'use client';

import { TriangleAlert } from 'lucide-react';
import { SectionTitle } from './shared';

const S = {
  container: 'mb-4 max-w-[620px] overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm',
  statusRow: 'flex items-center justify-between',
  statusLabel: 'text-[14px] font-bold text-slate-800',
  statusDesc: 'mt-1 text-[13px] text-slate-400',
  statusBadge: 'flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[12px] font-bold text-emerald-700',
  statusDot: 'size-1.5 animate-pulse rounded-full bg-emerald-500',
  deleteContainer: 'max-w-[620px] overflow-hidden rounded-2xl border border-red-200 bg-red-50 p-5',
  deleteRow: 'flex items-center justify-between gap-4',
  deleteLeft: 'min-w-0',
  deleteLabel: 'flex items-center gap-2 text-[14px] font-bold text-red-600',
  deleteIcon: 'size-4',
  deleteDesc: 'mt-1.5 text-[13px] leading-relaxed text-slate-500',
  deleteButton: 'shrink-0 rounded-xl bg-red-500 px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-red-600',
};

export default function AccountSettings() {
  return (
    <>
      <SectionTitle sub='계정 상태와 탈퇴를 관리해요'>계정 설정</SectionTitle>
      <div className={S.container}>
        <div className={S.statusRow}>
          <div>
            <div className={S.statusLabel}>
              계정 상태
            </div>
            <div className={S.statusDesc}>
              정상 이용 중인 계정입니다.
            </div>
          </div>
          <span className={S.statusBadge}>
            <span className={S.statusDot} />
            정상
          </span>
        </div>
      </div>
      <div className={S.deleteContainer}>
        <div className={S.deleteRow}>
          <div className={S.deleteLeft}>
            <div className={S.deleteLabel}>
              <TriangleAlert className={S.deleteIcon} />
              회원 탈퇴
            </div>
            <div className={S.deleteDesc}>
              탈퇴 시 작성한 글·댓글·거래 내역이 모두 삭제되며 복구할 수 없습니다.
            </div>
          </div>
          <button className={S.deleteButton}>
            탈퇴하기
          </button>
        </div>
      </div>
    </>
  );
}
