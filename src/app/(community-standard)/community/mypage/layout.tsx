import React from 'react';
import MyPageSidebar from '@/components/community/mypage/MyPageSidebar';
import MyPageProfileCard from '@/components/community/mypage/MyPageProfileCard';

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen bg-slate-50/50 pb-20 pt-8'>
      <div className='mx-auto max-w-[1000px] px-4'>
        <MyPageProfileCard />
        <div className='flex items-start gap-8'>
          <MyPageSidebar />
          <div className='min-w-0 flex-1'>{children}</div>
        </div>
      </div>
    </div>
  );
}
