"use client";

// LMS 페이지 접근 가드 (FE 1차 필터링)
// - 커뮤니티(CommunityGuard)와 동일한 UX: 비로그인/권한없음 시 alert + 리다이렉트.
// - 교수(PLM) 레이아웃 → allowedRoles={["SUA","ADM","PROF"]}
// - 학생(SLM) 레이아웃 → allowedRoles={["SUA","ADM","STU","ALU"]}
// ⚠ FE 가드는 UX용 1차 차단일 뿐, 실제 권한 검사는 BE에서 별도로 해야 한다(우회 가능).
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function LmsGuard({
    allowedRoles,
    children,
}: {
    allowedRoles: string[];
    children: React.ReactNode;
}) {
    const router = useRouter();

    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const role = useAuthStore((state) => state.role);

    // allowedRoles는 렌더링마다 새 배열이 될 수 있으므로 안정적인 문자열 key로 비교한다.
    const allowedRoleKey = allowedRoles.join("|");
    const hasAllowedRole = !!role && allowedRoleKey.split("|").includes(role);

    useEffect(() => {
        // AuthProvider가 localStorage 복원을 끝내기 전에는 판단하지 않는다.
        if (!isInitialized) return;

        if (!isLoggedIn) {
            const currentPath = `${window.location.pathname}${window.location.search}`;
            window.alert("로그인이 안되어있습니다");
            router.replace(`/home/login?redirect=${encodeURIComponent(currentPath)}`);
            return;
        }

        if (!hasAllowedRole) {
            window.alert("LMS 접근 권한이 없습니다.");
            router.replace("/home");
        }
    }, [hasAllowedRole, isInitialized, isLoggedIn, router]);

    // 복원 전 / 비로그인 / 권한없음 → 리다이렉트 중이므로 화면을 보여주지 않는다.
    if (!isInitialized) return null;
    if (!isLoggedIn) return null;
    if (!hasAllowedRole) return null;

    return <>{children}</>;
}
