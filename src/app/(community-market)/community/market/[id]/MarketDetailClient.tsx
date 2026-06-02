"use client";

export default function MarketDetailClient({ id }: { id: string }) {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <h1 className="text-2xl font-bold">상품 상세 - ID: {id}</h1>
    </div>
  );
}