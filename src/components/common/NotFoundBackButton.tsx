"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFoundBackButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-11 px-4"
      onClick={() => window.history.back()}
    >
      <ArrowLeft className="size-4" />
      뒤로가기
    </Button>
  );
}
