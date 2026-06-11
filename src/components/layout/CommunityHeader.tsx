'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  MessageCircle,
  PackageOpen,
  UserRound,
  GraduationCap,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const NAV_ITEMS = [
  { href: '/community', label: '홈', exact: true },
  { href: '/community/free', label: '자유게시판' },
  { href: '/community/secret', label: '익명게시판' },
  { href: '/community/notice', label: '공지사항', count: 2 },
  { href: '/community/market', label: '중고거래' },
  { href: '/community/reservation', label: '시설 이용' },
];

export default function CommunityHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const univName = useAuthStore((s) => s.univName);
  const { memberName, communityNickname, logoutAction } = useAuthStore();
  const displayName = communityNickname || memberName || '사용자';

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const submitSearch = () => {
    const trimmed = searchValue.trim();
    router.push(
      trimmed
        ? `/community/search?q=${encodeURIComponent(trimmed)}`
        : '/community/search',
    );
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      ) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className='sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm'>
      <div className='mx-auto flex h-16 max-w-[1300px] items-center gap-2 px-6'>
        {/* 로고 */}
        <Link
          href='/community'
          className='flex shrink-0 items-center gap-2'
        >
          {univName ? (
            <span className='text-[15px] font-extrabold tracking-tight text-slate-900'>
              {univName}
            </span>
          ) : (
            <img src='/univus-logo.svg' alt='UniVUs' className='h-10 w-auto' />
          )}
        </Link>

        {/* 구분선 */}
        <div className='h-5 w-px shrink-0 bg-border mx-0' />

        {/* 네비게이션 */}
        <nav className='hidden shrink-0 items-center gap-0.5 md:flex'>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group/nav relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-[13.5px] font-semibold transition-all duration-200 hover:-translate-y-0.5',
                  active
                    ? 'bg-primary/5 text-primary'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                {item.label}
                {item.count ? (
                  <span className='rounded-full bg-primary/10 px-[7px] py-px text-[11px] font-bold text-primary transition-transform duration-200 group-hover/nav:scale-105'>
                    {item.count}
                  </span>
                ) : null}
                {active && (
                  <span className='absolute inset-x-2 -bottom-[17px] h-[2.5px] origin-center animate-in fade-in zoom-in-75 rounded-full bg-primary duration-300' />
                )}
                {!active && (
                  <span className='absolute inset-x-2 -bottom-[17px] h-[2.5px] origin-center scale-x-0 rounded-full bg-primary/40 transition-transform duration-200 group-hover/nav:scale-x-100' />
                )}
              </Link>
            );
          })}
        </nav>

        {/* 우측 액션 */}
        <div className='ml-auto flex shrink-0 items-center gap-3'>
          {/* LMS 바로가기 버튼 */}

          <Link
            href='/home'
            className='inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full border border-[#A1EBE0] bg-[#ECFBF8] px-[15px] py-[7px] text-[13px] font-bold text-[#0E6F64] transition-all hover:bg-[#CFF5EE] hover:shadow-sm active:scale-[0.97]'
          >
            <GraduationCap className='h-[17px] w-[17px]' />
            <span>LMS</span>
          </Link>
          <span className='h-6 w-px shrink-0 bg-slate-200' />

          {/* 검색창 */}
          <div className='relative hidden lg:block'>
            <Search className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder='게시글, 상품 검색'
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitSearch();
                }
              }}
              onFocus={() => {
                if (pathname !== '/community/search') {
                  router.prefetch('/community/search');
                }
              }}
              className='h-9 w-56 rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 focus:shadow-sm cursor-pointer'
            />
          </div>

          {/* 알림 버튼 */}
          <div className='relative' ref={notificationRef}>
            <button
              type='button'
              onClick={() => setNotificationOpen((prev) => !prev)}
              className={cn(
                'relative flex size-9 shrink-0 items-center justify-center rounded-full border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 active:translate-y-0',
                notificationOpen
                  ? 'border-primary text-primary'
                  : 'border-slate-200 text-slate-500 hover:border-primary hover:text-primary',
              )}
              aria-label='알림함 열기'
            >
              <Bell className='size-[18px]' />
              <span className='absolute right-2 top-2 size-[7px] rounded-full border-2 border-white bg-red-500' />
            </button>

            {notificationOpen && (
              <div className='absolute right-0 top-[calc(100%+10px)] z-50 w-[320px] animate-in fade-in slide-in-from-top-2 overflow-hidden rounded-xl border border-border bg-white shadow-lg duration-300'>
                <div className='flex items-center justify-between border-b border-border px-4 py-3'>
                  <div>
                    <div className='text-[13px] font-extrabold text-slate-900'>알림</div>
                    <div className='text-[11px] font-medium text-slate-400'>전체 커뮤니티 알림함</div>
                  </div>
                  <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary'>
                    준비중
                  </span>
                </div>
                <div className='divide-y divide-slate-100'>
                  <div className='flex items-start gap-3 px-4 py-3'>
                    <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                      <MessageCircle className='size-4' />
                    </span>
                    <div className='min-w-0 flex-1'>
                      <div className='text-[12px] font-bold text-slate-800'>댓글/답글 알림</div>
                      <p className='mt-0.5 text-[11px] leading-relaxed text-slate-400'>
                        내 글과 댓글에 달린 새 반응이 여기에 표시됩니다.
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start gap-3 px-4 py-3'>
                    <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500'>
                      <PackageOpen className='size-4' />
                    </span>
                    <div className='min-w-0 flex-1'>
                      <div className='text-[12px] font-bold text-slate-800'>거래/예약 알림</div>
                      <p className='mt-0.5 text-[11px] leading-relaxed text-slate-400'>
                        중고거래 채팅, 결제, 시설 예약 알림을 연결할 예정입니다.
                      </p>
                    </div>
                  </div>
                </div>
                <div className='bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold text-slate-400'>
                  백엔드 알림 API 연결 전 임시 알림함입니다.
                </div>
              </div>
            )}
          </div>

          {/* 프로필 드롭다운 */}
          <div className='relative' ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-1.5 transition-all',
                dropdownOpen
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 bg-white hover:border-primary',
              )}
            >
              <div className='flex size-[28px] items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white'>
                {displayName.slice(0, 1)}
              </div>
              <span
                className={cn(
                  'text-[13px] font-semibold',
                  dropdownOpen ? 'text-primary' : 'text-slate-700',
                )}
              >
                {displayName}
              </span>
              <ChevronDown
                className={cn(
                  'size-3.5 transition-transform text-slate-400',
                  dropdownOpen && 'rotate-180 text-primary',
                )}
              />
            </button>

            {/* 드롭다운 메뉴 */}
            {dropdownOpen && (
              <div className='animate-in fade-in slide-in-from-top-2 duration-500 absolute right-0 top-[calc(100%+8px)] z-50 w-[160px] overflow-hidden rounded-xl border border-border bg-white shadow-lg'>
                {/* 프로필 정보 */}
                <div className='border-b border-border px-4 py-3'>
                  <div className='text-[13px] font-bold text-slate-800'>
                    {displayName}
                  </div>
                  <div className='text-[11px] text-slate-400'>
                    {memberName}
                  </div>
                </div>
                {/* 메뉴 */}
                <div className='py-1'>
                  <button
                    onClick={() => {
                      router.push('/community/mypage');
                      setDropdownOpen(false);
                    }}
                    className='flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary'
                  >
                    <UserRound className='size-4 text-slate-400' />
                    마이페이지
                  </button>
                  <button
                    onClick={async () => {
                      setDropdownOpen(false);
                      sessionStorage.setItem('communityLogout', 'true');
                      await logoutAction();
                      alert('로그아웃되었습니다.');
                      router.push('/home/login');
                    }}
                    className='flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50'
                  >
                    <LogOut className='size-4' />
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
