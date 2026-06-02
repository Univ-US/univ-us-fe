'use client';

import CommunityHeader from '@/components/layout/CommunityHeader';

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CommunityHeader />
      <main className='flex-1'>{children}</main>
    </>
  );
}
