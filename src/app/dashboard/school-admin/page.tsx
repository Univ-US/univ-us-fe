"use client";

import RoleGuard from "@/components/auth/RoleGuard";

export default function SchoolAdminDashboardPage() {
    return (
        <RoleGuard allowedRoles={["ADM"]}>
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
                    <p className="text-sm font-bold text-primary">ADM</p>
                    <h1 className="mt-2 text-2xl font-extrabold">
                        학교 관리자 대시보드
                    </h1>
                    <p className="mt-3 text-sm text-slate-500">
                        학교 관리자 대시보드는 해당자가 추후 구현할 예정입니다.
                    </p>
                </div>
            </main>
        </RoleGuard>
    );
}