'use client';

import { TriangleAlert } from 'lucide-react';
import { SectionTitle } from './shared';
import { deactivateCommunity } from '@/lib/cmypageApi';
import { useState } from 'react';
import AccountDeactivateModal from './AccountDeactivateModal';
import ResultModal from './ResultModal';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

const S = {
  container: 'mb-4 max-w-[620px] overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm',
  statusRow: 'flex items-center justify-between',
  statusLabel: 'text-[14px] font-bold text-slate-800',
  statusDesc: 'mt-1 text-[13px] text-slate-400',
  statusBadge: 'flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[12px] font-bold text-primary',
  statusDot: 'size-1.5 animate-pulse rounded-full bg-primary',
  deleteContainer: 'max-w-[620px] overflow-hidden rounded-2xl border border-red-200 bg-red-50 p-5',
  deleteRow: 'flex items-center justify-between gap-4',
  deleteLeft: 'min-w-0',
  deleteLabel: 'flex items-center gap-2 text-[14px] font-bold text-red-600',
  deleteIcon: 'size-4',
  deleteDesc: 'mt-1.5 text-[13px] leading-relaxed text-slate-500',
  deleteButton: 'shrink-0 rounded-xl bg-red-500 px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-red-600',
};

export default function AccountSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const logoutAction = useAuthStore(state => state.logoutAction);
  const router = useRouter();
  const [resultState, setResultState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const handleDeactivate = async () => {
    setIsLoading(true);
    try {
      await deactivateCommunity();
      setIsModalOpen(false);
      setResultState({
        isOpen: true,
        type: 'success',
        title: '비활성화 완료',
        message: '성공적으로 계정이 비활성화되었습니다.\n안전을 위해 로그아웃 처리됩니다.'
      });
    } catch (e) {
      console.error(e);
      setIsModalOpen(false);
      setResultState({
        isOpen: true,
        type: 'error',
        title: '오류 발생',
        message: '비활성화 처리에 실패했습니다.\n잠시 후 다시 시도해주세요.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultConfirm = async () => {
    if (resultState.type === 'success') {
      await logoutAction();
      router.replace('/home');
    } else {
      setResultState(prev => ({ ...prev, isOpen: false }));
    }
  };

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
              계정 비활성화
            </div>
            <div className={S.deleteDesc}>
              계정 비활성화 시 게시글과 댓글 등 활동 내역의 처리 정책에 따라 숨겨지거나 유지될 수 있습니다.
            </div>
          </div>
          <button 
            className={S.deleteButton}
            onClick={() => setIsModalOpen(true)}
          >
            비활성화하기
          </button>
        </div>
      </div>

      {isModalOpen && (
        <AccountDeactivateModal 
          loading={isLoading}
          onClose={() => !isLoading && setIsModalOpen(false)}
          onSubmit={handleDeactivate}
        />
      )}

      {resultState.isOpen && (
        <ResultModal
          type={resultState.type}
          title={resultState.title}
          message={resultState.message}
          onConfirm={handleResultConfirm}
        />
      )}
    </>
  );
}
