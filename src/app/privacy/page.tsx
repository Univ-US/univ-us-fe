import Link from "next/link";
import {
    ArrowLeft,
    CalendarDays,
    ChevronRight,
    ClipboardCheck,
    FileText,
    LockKeyhole,
    ShieldCheck,
    Sparkles,
} from "lucide-react";

const collectionRows = [
    {
        purpose: "회원 가입 및 계정 관리",
        items: "로그인 ID, 비밀번호, 이름, 휴대전화번호, 성별, 생년월일",
        retention: "회원 탈퇴 시까지\n(관계 법령에 따른 보관 필요 시 해당 기간)",
    },
    {
        purpose: "계정 찾기 및 본인 확인",
        items: "로그인 ID, 이름, 휴대전화번호, 생년월일",
        retention: "본인 확인 목적 달성 후 지체 없이 파기",
    },
    {
        purpose: "커뮤니티·문의 서비스 제공",
        items: "게시글, 댓글, 문의 내용, 첨부파일 및 서비스 이용 과정에서 생성되는 정보",
        retention: "게시물·문의 삭제 또는 회원 탈퇴 시까지\n(관계 법령에 따른 보관 필요 시 해당 기간)",
    },
    {
        purpose: "구독·결제 서비스 제공",
        items: "결제 승인·거래 기록, 구독 플랜 및 결제 이력",
        retention: "전자상거래 등 관계 법령에서 정한 보관 기간",
    },
];

const policySections = [
    {
        title: "개인정보의 처리 목적",
        body: "UnivUs는 회원 식별·가입 의사 확인, 계정 관리, 학습·캠퍼스·커뮤니티 서비스 제공, 구독·결제 처리, 문의 응대와 서비스 개선을 위해 개인정보를 처리합니다. 처리 목적이 변경되는 경우 관련 법령에 따라 필요한 절차를 진행합니다.",
    },
    {
        title: "개인정보의 수집 항목 및 보유 기간",
        body: "UnivUs는 서비스 제공에 필요한 최소한의 개인정보를 수집합니다. 각 처리 목적, 수집 항목 및 보유 기간은 아래와 같습니다.",
        table: true,
    },
    {
        title: "개인정보의 파기 절차 및 방법",
        body: "보유 기간이 경과했거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일 형태의 정보는 복구할 수 없는 기술적 방법으로 삭제하며, 종이 문서는 분쇄 또는 소각합니다. 다만 다른 법령에 따라 보존해야 하는 정보는 별도 보관합니다.",
    },
    {
        title: "개인정보의 제3자 제공",
        body: "UnivUs는 정보주체의 개인정보를 처리 목적 범위에서만 이용하며, 정보주체의 동의 또는 법률의 특별한 규정이 있는 경우를 제외하고 제3자에게 제공하지 않습니다.",
    },
    {
        title: "개인정보 처리의 위탁",
        body: "UnivUs는 서비스 운영에 필요한 업무를 외부 전문 업체에 위탁할 수 있습니다. 위탁이 발생하는 경우 관련 법령에 따라 수탁자, 위탁 업무, 보유·이용 기간을 공개하고 개인정보가 안전하게 관리되도록 관리·감독합니다.",
    },
    {
        title: "정보주체의 권리와 행사 방법",
        body: "정보주체는 언제든지 자신의 개인정보에 대해 열람, 정정·삭제, 처리정지, 동의 철회를 요청할 수 있습니다. 요청은 서비스 내 문의 채널을 통해 접수할 수 있으며, UnivUs는 관련 법령이 정한 절차와 기한에 따라 처리합니다.",
    },
    {
        title: "개인정보의 안전성 확보 조치",
        body: "UnivUs는 개인정보의 분실, 도난, 유출, 위·변조 또는 훼손을 방지하기 위해 접근 권한 관리, 인증 정보 보호, 접속 기록 관리와 기술적·관리적 보호 조치를 적용합니다.",
    },
    {
        title: "쿠키의 사용",
        body: "UnivUs는 로그인 상태 유지와 서비스 이용 환경 개선을 위해 쿠키를 사용할 수 있습니다. 이용자는 웹 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.",
    },
    {
        title: "개인정보 보호책임자 및 고충 처리",
        body: "개인정보 보호책임자의 성명, 소속, 연락처와 개인정보 관련 문의·불만 처리 담당 부서는 실제 서비스 운영 전 확정하여 본 방침에 공개합니다. 현재 개인정보 관련 문의는 서비스 내 문의 채널을 통해 접수할 수 있습니다.",
    },
    {
        title: "개인정보처리방침의 변경",
        body: "본 방침은 법령, 서비스 또는 보안 정책의 변경에 따라 수정될 수 있습니다. 중요한 변경이 있는 경우 시행일과 변경 내용을 서비스 화면 또는 공지사항을 통해 안내합니다.",
    },
];

function CollectionTable() {
    return (
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[680px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black text-slate-600">
                    <tr>
                        <th className="px-5 py-4">처리 목적</th>
                        <th className="px-5 py-4">수집 항목</th>
                        <th className="px-5 py-4">보유 및 이용 기간</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {collectionRows.map((row) => (
                        <tr key={row.purpose} className="align-top">
                            <td className="px-5 py-4 font-bold leading-6 text-slate-800">{row.purpose}</td>
                            <td className="px-5 py-4 leading-6 text-slate-600">{row.items}</td>
                            <td className="whitespace-pre-line px-5 py-4 leading-6 text-slate-600">{row.retention}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-[var(--accent)] text-slate-950">
            <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
                <div className="mx-auto flex h-[72px] max-w-[1080px] items-center justify-between px-5 sm:px-6">
                    <Link href="/landing" className="flex items-center gap-2.5" aria-label="UnivUs 랜딩으로 이동">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20"><Sparkles className="size-4" /></span>
                        <span className="text-lg font-black tracking-tight">Univ<span className="text-primary">Us</span></span>
                    </Link>
                    <Link href="/landing" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 transition-colors hover:text-primary"><ArrowLeft className="size-4" />랜딩으로 돌아가기</Link>
                </div>
            </header>

            <section className="border-b border-primary/10 bg-[radial-gradient(circle_at_80%_0%,rgba(15,118,110,0.14),transparent_30%),radial-gradient(circle_at_6%_100%,rgba(19,78,74,0.08),transparent_30%)]">
                <div className="mx-auto max-w-[1080px] px-5 py-20 sm:px-6 sm:py-24">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3.5 py-2 text-xs font-extrabold text-primary shadow-sm"><ShieldCheck className="size-3.5" />PRIVACY POLICY</div>
                    <h1 className="mt-6 text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl">개인정보처리방침</h1>
                    <p className="mt-5 max-w-[680px] text-base leading-8 text-slate-600">UnivUs는 이용자의 개인정보를 소중하게 다루며, 개인정보 보호 관련 법령을 준수하기 위해 노력합니다. 본 방침은 개인정보 처리 기준과 정보주체의 권리를 안내합니다.</p>
                    <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-500"><span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-primary" />시행일: 2026년 6월 22일</span><span className="flex items-center gap-1.5"><FileText className="size-3.5 text-primary" />문서 버전: v1.0</span></div>
                </div>
            </section>

            <section className="mx-auto grid max-w-[1080px] gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[230px_1fr] lg:py-16">
                <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-6">
                    <p className="text-xs font-black tracking-[0.14em] text-primary">CONTENTS</p>
                    <nav className="mt-4 space-y-1.5">{policySections.map((section, index) => <a key={section.title} href={`#policy-${index + 1}`} className="block rounded-lg px-3 py-2 text-xs font-bold leading-5 text-slate-500 transition-colors hover:bg-primary/5 hover:text-primary">{index + 1}. {section.title}</a>)}</nav>
                </aside>

                <div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900"><div className="flex gap-3"><ClipboardCheck className="mt-0.5 size-5 shrink-0" /><div><p className="font-black">운영 전 확인이 필요한 항목</p><p className="mt-1">본 방침은 현재 서비스 구현을 기준으로 한 표준 초안입니다. 실제 운영 전에는 처리위탁 업체, 법정 보관 기간, 개인정보 보호책임자와 담당 부서 연락처를 확정하고 법률 검토를 거쳐야 합니다.</p></div></div></div>

                    <article className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-6 sm:px-8"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="size-5" /></span><div><p className="text-sm font-black text-slate-900">UnivUs 개인정보처리방침</p><p className="mt-1 text-xs text-slate-500">개인정보 처리 기준 및 정보주체의 권리 안내</p></div></div></div>
                        <div className="divide-y divide-slate-100 px-6 sm:px-8">{policySections.map((section, index) => <section id={`policy-${index + 1}`} key={section.title} className="scroll-mt-6 py-7"><h2 className="text-lg font-black tracking-[-0.025em] text-slate-900">{index + 1}. {section.title}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{section.body}</p>{section.table && <CollectionTable />}</section>)}</div>
                    </article>

                    <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-bold leading-6 text-slate-600">개인정보 관련 문의는 서비스 내 문의 채널을 이용해주세요.</span><Link href="/landing" className="flex shrink-0 items-center gap-1 font-black text-primary">UnivUs 홈 <ChevronRight className="size-4" /></Link></div>
                </div>
            </section>
        </main>
    );
}
