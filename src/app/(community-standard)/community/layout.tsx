'use client';

import CommunityGuard from '@/components/auth/CommunityGuard';
import CommunityHeader from '@/components/layout/CommunityHeader';
import { getSubscriptionStatus } from '@/lib/subscriptionApi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    let active = true;
    void getSubscriptionStatus()
      .then((status) => {
        if (!active) return;
        if (!status.serviceAccessible) {
          router.replace(
            status.role === 'ADM'
              ? '/subscribe'
              : '/landing?subscription=expired',
          );
          return;
        }
        setAccessChecked(true);
      })
      .catch(() => {
        if (active) setAccessChecked(true);
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (!accessChecked) return null;

  return (
    <CommunityGuard>
      <CommunityHeader />
      <main className='flex-1'>{children}</main>
    </CommunityGuard>
  );
}
