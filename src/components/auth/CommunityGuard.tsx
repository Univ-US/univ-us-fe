"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import ReactivateModal from "../community/ReactivateModal";
import { reactivateCommunity } from "@/lib/cmypageApi";
import ResultModal from "../community/mypage/ResultModal";

const COMMUNITY_ALLOWED_ROLES = ["SUA", "ADM", "STU", "ALU"];

export default function CommunityGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const role = useAuthStore((state) => state.role);
    const status = useAuthStore((state) => state.status);
    const updateStatus = useAuthStore((state) => state.updateStatus);

    const hasCommunityRole = !!role && COMMUNITY_ALLOWED_ROLES.includes(role);

    const [isReactivating, setIsReactivating] = useState(false);
    const [resultState, setResultState] = useState<{isOpen: boolean, type: 'success' | 'error', title: string, message: string}>({ isOpen: false, type: 'success', title: '', message: '' });

    useEffect(() => {
        if (!isInitialized) return;

        if (!isLoggedIn) {
            const isLoggingOut = sessionStorage.getItem("communityLogout") === "true";
            const currentPath = `${window.location.pathname}${window.location.search}`;

            if (isLoggingOut) {
                sessionStorage.removeItem("communityLogout");
                router.replace("/home/login");
                return;
            }

            window.alert("로그인이 필요합니다.");
            router.replace(`/home/login?redirect=${encodeURIComponent(currentPath)}`);
            return;
        }

        if (!hasCommunityRole) {
            window.alert("커뮤니티 접근 권한이 없습니다.");
            router.replace("/home");
        }
    }, [hasCommunityRole, isInitialized, isLoggedIn, router]);

    if (!isInitialized) {
        return null;
    }

    if (!isLoggedIn) {
        return null;
    }

    if (!hasCommunityRole) {
        return null;
    }

    if (status === 'INACTIVE') {
        return (
            <>
                <ReactivateModal 
                    loading={isReactivating}
                    onClose={() => router.replace('/home')}
                    onSubmit={async () => {
                        setIsReactivating(true);
                        try {
                            await reactivateCommunity();
                            setResultState({ isOpen: true, type: 'success', title: '활성화 완료', message: '커뮤니티가 다시 활성화되었습니다.\n환영합니다!' });
                        } catch (e) {
                            console.error(e);
                            setResultState({ isOpen: true, type: 'error', title: '활성화 실패', message: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
                        } finally {
                            setIsReactivating(false);
                        }
                    }}
                />
                {resultState.isOpen && (
                    <ResultModal 
                        type={resultState.type}
                        title={resultState.title}
                        message={resultState.message}
                        onConfirm={() => {
                            setResultState(prev => ({...prev, isOpen: false}));
                            if (resultState.type === 'success') {
                                updateStatus('ACTIVE');
                            }
                        }}
                    />
                )}
            </>
        );
    }

    if (status === 'SUSPENDED') {
        return (
            <div className='flex min-h-screen w-full items-center justify-center bg-slate-50 px-4'>
                <div className='w-full max-w-[400px] rounded-2xl border border-border bg-white p-6 shadow-2xl'>
                    <div className='flex flex-col items-center justify-center text-center'>
                        <h2 className='text-[20px] font-extrabold text-slate-900'>
                            커뮤니티 이용이 제한되었습니다
                        </h2>
                        <p className='mt-3 text-[14px] font-medium leading-relaxed text-slate-500'>
                            운영 정책 위반 등의 이유로 커뮤니티 이용이 정지되었습니다.<br/>
                            자세한 사항은 학교 관리자에게 문의해주세요.
                        </p>
                    </div>
                    <div className='mt-6'>
                        <button
                            type='button'
                            onClick={() => router.replace('/home')}
                            className='flex h-12 w-full items-center justify-center rounded-xl bg-slate-100 text-[15px] font-bold text-slate-600 transition-colors hover:bg-slate-200'
                        >
                            메인 홈으로 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
