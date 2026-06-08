import type { NextConfig } from "next";

// 기존 ㄱ거
// const nextConfig: NextConfig = {
//   output: 'export', // Apache 정적 배포용

//   images: {
//     unoptimized: true,
//   },
// };

// 현재 거
const nextConfig: NextConfig = {
  output: 'export', // Apache 정적 배포용
  trailingSlash: true, // 라우트를 폴더/index.html 구조로 (아파치에서 /community 등 렌더)

  images: {
    unoptimized: true,
  },
};

export default nextConfig;
