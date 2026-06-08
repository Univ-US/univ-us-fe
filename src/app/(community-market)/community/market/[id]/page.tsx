import MarketDetailClient from "./MarketDetailClient";

// output: 'export' 정적 배포 필수
// 빌드 시점에 존재할 상품 ID 범위를 미리 생성
// TODO: 실제 배포 전 DB의 최대 PRODUCT_ID 이상으로 범위 조정
export function generateStaticParams() {
  return Array.from({ length: 200 }, (_, i) => ({
    id: String(i + 1),
  }));
}

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MarketDetailClient id={id} />;
}
