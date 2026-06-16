import type { NextConfig } from "next";

const allowedDevOrigins = [
  "192.168.0.*",
  process.env.NEXT_ALLOWED_DEV_ORIGIN,
].filter(Boolean) as string[];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  output: 'export', // Apache 정적 배포용
  trailingSlash: true, // /community/free → /community/free/index.html 생성

  images: {
    unoptimized: true,
  },
};

export default nextConfig;
