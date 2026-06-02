// "use client" 없음 — generateStaticParams는 서버 함수
import MarketDetailClient from "./MarketDetailClient";

// 정적 배포 필수 — 빌드 시점에 생성할 경로 목록
// TODO: API 연결 후 DB에서 실제 상품 ID 목록으로 교체
export function generateStaticParams() {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => ({
    id: String(id),
  }));
}

export default function MarketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <MarketDetailClient id={params.id} />;
}