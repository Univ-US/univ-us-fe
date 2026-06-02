"use client";

import { useState } from "react";
import CommunityMarketList from "@/components/common/CommunityMarketList";
import CommunityMarketDetail from "@/components/common/CommunityMarketDetail";
import { SAMPLE_PRODUCTS } from "@/lib/sampleData";
import type { Product } from "@/types/community";

export default function MarketPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  if (selectedProduct) {
    return (
      <CommunityMarketDetail
        product={selectedProduct}
        onBack={() => setSelectedProduct(null)}
      />
    );
  }

  return (
    <CommunityMarketList
      products={SAMPLE_PRODUCTS}
      onSelectProduct={setSelectedProduct}
    />
  );
}