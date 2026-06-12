'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  MessageSquare,
  Heart,
  Receipt,
  Bookmark,
  UserRoundCog,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const S = {
  container: 'w-[240px] shrink-0',
  stickyBox: 'sticky top-24 overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
  groupWrapper: 'border-t border-border',
  groupTitle: 'px-5 pb-2 pt-4 text-[12px] font-extrabold tracking-tight text-slate-400',
  itemsWrapper: 'flex flex-col py-2',
  itemLinkBase: 'group flex items-center gap-3 border-l-[3px] px-5 py-3 text-[14px] font-bold transition-colors',
  itemLinkActive: 'border-primary bg-primary/5 text-primary',
  itemLinkInactive: 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900',
  iconBase: 'transition-colors',
  iconActive: 'text-primary',
  iconInactive: 'text-slate-400 group-hover:text-slate-600',
  iconSize: 'size-[17px]',
};

const MENU = [
  {
    group: '커뮤니티 활동',
    items: [
      { path: '/community/mypage/posts', icon: <FileText className={S.iconSize} />, label: '내가 쓴 글' },
      { path: '/community/mypage/comments', icon: <MessageSquare className={S.iconSize} />, label: '내가 쓴 댓글' },
      { path: '/community/mypage/liked', icon: <Heart className={S.iconSize} />, label: '좋아요한 글' },
    ],
  },
  {
    group: '중고거래',
    items: [
      { path: '/community/mypage/trades', icon: <Receipt className={S.iconSize} />, label: '거래 내역' },
      { path: '/community/mypage/wishlist', icon: <Bookmark className={S.iconSize} />, label: '관심목록' },
    ],
  },
  {
    group: '계정',
    items: [
      { path: '/community/mypage/profile', icon: <UserRoundCog className={S.iconSize} />, label: '프로필 수정' },
      { path: '/community/mypage/account', icon: <Settings className={S.iconSize} />, label: '계정 설정' },
    ],
  },
];

export default function MyPageSidebar() {
  const pathname = usePathname();

  return (
    <div className={S.container}>
      <div className={S.stickyBox}>
        {MENU.map((group, groupIdx) => (
          <div
            key={group.group}
            className={cn(groupIdx > 0 && S.groupWrapper)}
          >
            <div className={S.groupTitle}>
              {group.group}
            </div>
            <div className={S.itemsWrapper}>
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      S.itemLinkBase,
                      isActive ? S.itemLinkActive : S.itemLinkInactive,
                    )}
                  >
                    <span
                      className={cn(
                        S.iconBase,
                        isActive ? S.iconActive : S.iconInactive,
                      )}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
