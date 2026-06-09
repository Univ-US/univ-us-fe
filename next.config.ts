import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Apache 정적 배포용
  trailingSlash: true, // /community/free → /community/free/index.html 생성

  images: {
    unoptimized: true,
  },
};

export default nextConfig;
