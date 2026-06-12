'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getMyPosts, getMyComments, getLikedPosts } from '@/lib/cmypageApi';

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

export default function MyPageProfileCard() {
  const memberName = useAuthStore((s) => s.memberName);
  const communityNickname = useAuthStore((s) => s.communityNickname);
  const univName = useAuthStore((s) => s.univName);

  const [stats, setStats] = useState({ posts: 0, comments: 0, likes: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [posts, comments, liked] = await Promise.all([
          getMyPosts(),
          getMyComments(),
          getLikedPosts()
        ]);
        setStats({
          posts: posts.length,
          comments: comments.length,
          likes: liked.length,
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className={S.container}>
      <div className={S.profileGroup}>
        <div className={S.avatar}>
          {(communityNickname || memberName || '사').charAt(0)}
        </div>
        <div>
          <div className={S.infoGroup}>
            <h1 className={S.nickname}>
              {communityNickname || memberName || '사용자'}
            </h1>
            <span className={S.univName}>
              {univName || '소속 학교'}
            </span>
          </div>
          <div className={S.joinDate}>가입 - - -</div>
        </div>
      </div>
      <div className={S.statsGroup}>
        <Link href='/community/mypage/posts' className={S.statLink}>
          <span className={S.statNumber}>{stats.posts}</span>
          <span className={S.statLabel}>작성글</span>
        </Link>
        <div className={S.divider} />
        <Link href='/community/mypage/comments' className={S.statLink}>
          <span className={S.statNumber}>{stats.comments}</span>
          <span className={S.statLabel}>댓글</span>
        </Link>
        <div className={S.divider} />
        <Link href='/community/mypage/liked' className={S.statLink}>
          <span className={S.statNumber}>{stats.likes}</span>
          <span className={S.statLabel}>좋아요</span>
        </Link>
      </div>
    </div>
  );
}
