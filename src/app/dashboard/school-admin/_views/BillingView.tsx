"use client";

export default function BillingView() {

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">구독·결제</h1>
                <p className="mt-1 text-sm text-slate-500">현재 구독 플랜과 결제 정보를 확인합니다.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                <section className="rounded-2xl bg-[#064b35] p-6 text-white shadow-sm">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold">현재 플랜</span>
                    <p className="mt-5 text-2xl font-black">Campus Pro</p>
                    <div className="mt-4 space-y-1 text-sm text-emerald-100">
                        <p>✓ 최대 1,500명 계정</p>
                        <p>✓ LMS + 커뮤니티 + AI 챗봇</p>
                        <p>✓ 전용 기술 지원</p>
                    </div>
                    <button className="mt-5 rounded-full border border-white/30 px-4 py-2 text-xs font-black hover:bg-white/10">
                        플랜 변경 문의
                    </button>
                </section>

                <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                    <h2 className="font-black">결제 수단</h2>
                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <p className="text-sm font-black">법인카드 (****-3092)</p>
                        <p className="mt-1 text-xs text-slate-500">자동 갱신 · 다음 청구일 확인 필요</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <button className="flex-1 rounded-lg border border-border py-2 text-xs font-bold hover:bg-slate-50">
                            카드 변경
                        </button>
                        <button className="flex-1 rounded-lg border border-border py-2 text-xs font-bold hover:bg-slate-50">
                            세금계산서 발행
                        </button>
                    </div>
                </section>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                <p className="font-black">결제 내역 조회</p>
                <p className="mt-1 text-amber-700">결제 내역은 서비스 관리자에게 문의해 주세요.</p>
            </div>
        </div>
    );
}
