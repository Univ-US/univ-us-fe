import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Apache 정적 배포용

  images: {
    unoptimized: true,
  },
};

export default nextConfig;