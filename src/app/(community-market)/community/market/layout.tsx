'use client';

import CommunityGuard from '@/components/auth/CommunityGuard';
import CommunityHeader from '@/components/layout/CommunityHeader';

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CommunityGuard>
      <CommunityHeader />
      <main className='flex-1'>{children}</main>
    </CommunityGuard>
  );
}
