"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export default function AuthProvider({children,}: { children: React.ReactNode; }) {
    const loadFromStorage = useAuthStore((state) => state.loadFromStorage);

    useEffect(() => { void loadFromStorage(); }, [loadFromStorage]);

    return <>{children}</>;
}
