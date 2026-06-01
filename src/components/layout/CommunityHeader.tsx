'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/community', label: '커뮤니티 홈', exact: true },
  { href: '/community/free', label: '자유게시판' },
  { href: '/community/secret', label: '익명게시판' },
  { href: '/community/market', label: '중고거래' },
];

export default function CommunityHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className='sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur'>
      <div className='mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-6'>
        {/* 로고 */}
        <Link href='/community' className='flex items-center'>
          <span className='text-xl font-extrabold tracking-tight text-foreground'>
            Univ<span className='text-primary'>Us</span>
          </span>
        </Link>

        {/* 네비게이션 */}
        <nav className='hidden items-center gap-1 md:flex'>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative rounded-md px-3 py-2 text-[15px] font-semibold transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
                {active && (
                  <span className='absolute inset-x-2 -bottom-[17px] h-0.5 rounded-full bg-primary' />
                )}
              </Link>
            );
          })}
        </nav>

        {/* 우측 액션 */}
        <div className='ml-auto flex items-center gap-3'>
          {/* 검색창 */}
          <div className='relative hidden lg:block'>
            <Search className='pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground' />
            <input
              placeholder='게시글, 상품 검색'
              className='h-10 w-64 rounded-full border border-input bg-muted pl-10 pr-4 text-sm outline-none focus:border-primary'
            />
          </div>

          {/* 알림 */}
          <Button
            variant='outline'
            size='icon'
            className='relative rounded-full'
          >
            <Bell className='size-[19px]' />
            <span className='absolute right-2.5 top-2.5 size-[7px] rounded-full border-2 border-card bg-destructive' />
          </Button>

          {/* 마이페이지 */}
          <Button
            variant='outline'
            size='sm'
            onClick={() => router.push('/mypage')}
            className={cn(
              pathname.startsWith('/mypage') && 'border-primary text-primary',
            )}
          >
            <UserRound className='size-4' />
            마이페이지
          </Button>
        </div>
      </div>
    </header>
  );
}
