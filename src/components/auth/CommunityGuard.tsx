"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

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

    const hasCommunityRole = !!role && COMMUNITY_ALLOWED_ROLES.includes(role);

    useEffect(() => {
        if (!isInitialized) return;

        if (!isLoggedIn) {
            const currentPath = `${window.location.pathname}${window.location.search}`;

            window.alert("로그인이 안되어있습니다");
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

    return <>{children}</>;
}
