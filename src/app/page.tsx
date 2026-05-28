import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6 bg-slate-50">
      <h1 className="text-4xl font-bold text-slate-900">
        🎓 Univ-us 프론트엔드 !
      </h1>
      <p className="text-lg text-slate-600">
        Next.js + Tailwind CSS + Shadcn UI 세팅
      </p>
      
      <Button size="lg" className="font-bold">
        시작하기 (테스트 버튼) 
      </Button>
    </div>
  );
}