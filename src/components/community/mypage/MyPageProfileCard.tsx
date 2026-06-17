'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMyPageSummary, getMyProfile } from '@/lib/cmypageApi';
import { useAuthStore } from '@/store/authStore';
import type { MyPageSummary, UserProfile } from '@/types/mypage';

const S = {
  container: 'mb-6 flex items-center justify-between rounded-2xl border border-border bg-white px-8 py-6 shadow-sm',
  profileGroup: 'flex items-center gap-5',
  avatar: 'flex size-16 items-center justify-center rounded-full bg-primary text-[22px] font-bold text-white shadow-sm',
  infoGroup: 'flex items-end gap-2',
  nickname: 'text-[20px] font-extrabold tracking-tight text-slate-900',
  univName: 'mb-0.5 text-[14px] font-medium text-slate-500',
  joinDate: 'mt-1 text-[13px] text-slate-400',
  statsGroup: 'flex items-center gap-8',
  statLink: 'group flex flex-col items-center gap-1 transition-transform hover:-translate-y-0.5',
  statNumber: 'text-[18px] font-extrabold text-slate-900 group-hover:text-primary',
  statLabel: 'text-[12px] font-bold text-slate-500 group-hover:text-primary',
  divider: 'h-8 w-px bg-slate-200',
};

const EMPTY_SUMMARY: MyPageSummary = {
  postCount: 0,
  commentCount: 0,
  likedPostCount: 0,
  tradeCount: 0,
  wishlistCount: 0,
};

function firstLetter(value: string) {
  return Array.from(value.trim() || 'U')[0];
}

function formatJoinDate(value?: string | null) {
  if (!value) return '가입일 정보 없음';
  return `가입 ${value.slice(0, 10).replaceAll('-', '.')}`;
}

export default function MyPageProfileCard() {
  const memberName = useAuthStore((s) => s.memberName);
  const communityNickname = useAuthStore((s) => s.communityNickname);
  const univName = useAuthStore((s) => s.univName);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<MyPageSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    let mounted = true;

    const fetchProfileCard = async () => {
      try {
        const [profileData, summaryData] = await Promise.all([
          getMyProfile(),
          getMyPageSummary(),
        ]);

        if (!mounted) return;
        setProfile(profileData);
        setSummary(summaryData);
      } catch (error) {
        console.error(error);
      }
    };

    fetchProfileCard();

    return () => {
      mounted = false;
    };
  }, []);

  const displayName = profile?.memberName ?? memberName ?? '사용자';
  const displayNickname = communityNickname ?? profile?.communityNickname ?? displayName;
  const displaySchool = profile?.univName ?? univName ?? '소속 대학 정보 없음';
  const joinDate = formatJoinDate(profile?.createdAt);

  return (
    <div className={S.container}>
      <div className={S.profileGroup}>
        <div className={S.avatar}>{firstLetter(displayNickname)}</div>
        <div>
          <div className={S.infoGroup}>
            <h1 className={S.nickname}>{displayNickname}</h1>
            <span className={S.univName}>{displaySchool}</span>
          </div>
          <div className={S.joinDate}>{joinDate}</div>
        </div>
      </div>
      <div className={S.statsGroup}>
        <Link href='/community/mypage/posts' className={S.statLink}>
          <span className={S.statNumber}>{summary.postCount}</span>
          <span className={S.statLabel}>작성글</span>
        </Link>
        <div className={S.divider} />
        <Link href='/community/mypage/comments' className={S.statLink}>
          <span className={S.statNumber}>{summary.commentCount}</span>
          <span className={S.statLabel}>댓글</span>
        </Link>
        <div className={S.divider} />
        <Link href='/community/mypage/liked' className={S.statLink}>
          <span className={S.statNumber}>{summary.likedPostCount}</span>
          <span className={S.statLabel}>좋아요</span>
        </Link>
      </div>
    </div>
  );
}
