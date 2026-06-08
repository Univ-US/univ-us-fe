"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export default function AuthProvider({children,}: { children: React.ReactNode; }) {
    // authStore에 정의된 localStorage 복원 함수를 가져옵니다.
    const loadFromStorage = useAuthStore((state) => state.loadFromStorage);

    // 앱이 브라우저에서 처음 마운트될 때 localStorage에 저장된
    // accessToken, refreshToken, memberId, role 값을 authStore로 복원합니다.
    useEffect(() => {loadFromStorage();}, [loadFromStorage]);

    // 인증 정보를 복원한 뒤에도 별도 UI를 감싸지 않고 기존 화면을 그대로 렌더링합니다.
    return <>{children}</>;
}