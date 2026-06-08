"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

interface RoleGuardProps {
    // 접근을 허용할 role 목록입니다.
    allowedRoles: string[];

    // 권한 검사를 통과했을 때 보여줄 실제 페이지 내용입니다.
    children: React.ReactNode;
}

export default function RoleGuard({
                                      allowedRoles,
                                      children,
                                  }: RoleGuardProps) {
    const router = useRouter();

    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const role = useAuthStore((state) => state.role);

    // allowedRoles 배열은 렌더링마다 새 배열이 될 수 있으므로,
    // effect 의존성에서는 안정적인 문자열 key로 비교합니다.
    const allowedRoleKey = allowedRoles.join("|");

    const hasAllowedRole = !!role && allowedRoleKey.split("|").includes(role);

    useEffect(() => {
        // AuthProvider가 localStorage 복원을 끝내기 전에는 판단하지 않습니다.
        if (!isInitialized) return;

        // 로그인하지 않은 사용자는 로그인 페이지로 보냅니다.
        if (!isLoggedIn) {
            router.replace("/login");
            return;
        }

        // 로그인은 했지만 허용된 role이 아니면 홈으로 보냅니다.
        if (!hasAllowedRole) {
            router.replace("/landing");
        }
    }, [hasAllowedRole, isInitialized, isLoggedIn, router]);

    // 인증 상태 복원 전에는 잠깐 아무것도 보여주지 않습니다.
    if (!isInitialized) {
        return null;
    }

    // 비로그인 사용자는 로그인 페이지로 이동시키는 중이므로 화면을 보여주지 않습니다.
    if (!isLoggedIn) {
        return null;
    }

    // 권한이 없는 로그인 사용자는 홈으로 이동시키는 중이므로 화면을 보여주지 않습니다.
    if (!hasAllowedRole) {
        return null;
    }

    // 모든 검사를 통과한 사용자에게만 실제 페이지를 보여줍니다.
    return <>{children}</>;
}