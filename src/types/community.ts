// src/types/community.ts
// 백엔드 DTO랑 네이밍 맞춰야 해서 별도 파일로 분리

export type BoardType = 'free' | 'secret' | 'notice';
export type TradeStatus = '판매중' | '예약중' | '거래완료';
export type ProductCategory = '교재' | '전자기기' | '생활용품' | '기타';

export interface Post {
  postId: number;
  title: string;
  author: string;
  category: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isHot?: boolean;
  isAnonymous?: boolean;
  isBlind?: boolean;
  reportCount?: number;
  tag?: string; // 공지사항 태그 ("중요" | "공지")
  content?: string;
}

export interface Product {
  productId: number;
  productName: string;
  price: number;
  category: ProductCategory;
  sellerName: string;
  place: string;
  createdAt: string;
  likeCount: number;
  chatCount: number;
  viewCount: number;
  productStatus: TradeStatus;
  description?: string;
}
