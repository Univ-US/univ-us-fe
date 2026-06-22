export function StatusBadge({ value }: { value: string }) {
    const map: Record<string, string> = {
        활성: "bg-primary/10 text-primary",
        정지: "bg-amber-100 text-amber-700",
        탈퇴: "bg-rose-100 text-rose-600",
        완료: "bg-primary/10 text-primary",
        대기: "bg-amber-100 text-amber-700",
        실패: "bg-rose-100 text-rose-600",
    };
    return (
        <span className={`inline-flex min-w-10 justify-center rounded-full px-2.5 py-0.5 text-xs font-extrabold ${map[value] ?? "bg-slate-100 text-slate-600"}`}>
            {value}
        </span>
    );
}

export function TargetBadge({ value }: { value: "전체" | "학생" | "교수" }) {
    const map: Record<string, string> = {
        전체: "bg-primary/10 text-primary",
        학생: "bg-sky-100 text-sky-700",
        교수: "bg-orange-100 text-orange-700",
    };
    return (
        <span className={`flex size-8 items-center justify-center rounded-full text-xs font-black ${map[value]}`}>
            {value.slice(0, 1)}
            <span className="sr-only">{value}</span>
        </span>
    );
}

export function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" | "lg" }) {
    const sizeMap = { sm: "size-8 text-sm", md: "size-10 text-base", lg: "size-12 text-lg" };
    return (
        <span className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-black text-white ${sizeMap[size]}`}>
            {name.slice(0, 1)}
        </span>
    );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-slate-200"}`}
            role="switch"
            aria-checked={checked}
        >
            <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
        </button>
    );
}
