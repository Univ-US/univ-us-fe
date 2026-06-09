// src/types/community.ts

export type BoardType = "free" | "secret" | "notice";

// PRODUCT.PRODUCT_STATUS DEFAULT 'SALE'
export type TradeStatus = "SALE" | "RESERVE" | "DONE";

// 화면 표시용 한글 변환
export const TRADE_STATUS_LABEL: Record<TradeStatus, string> = {
  SALE:    "판매중",
  RESERVE: "예약중",
  DONE:    "거래완료",
};

export type ProductCategory = "교재" | "전자기기" | "생활용품" | "기타";

// POST 테이블 + MEMBER JOIN
export interface Post {
  postId: number;           // POST_ID
  memberId: number;         // MEMBER_ID
  boardId: number;          // BOARD_ID
  title: string;            // TITLE
  content?: string;         // CONTENT (CLOB)
  category?: string;        // CATEGORY (추가 예정)
  viewCount: number;        // VIEW_COUNT
  isBlind: number;          // IS_BLIND (0|1)
  reportCount: number;      // REPORT_COUNT
  isDeleted: number;        // IS_DELETED (0|1)
  createdAt: string;        // CREATED_AT
  updatedAt?: string;       // UPDATED_AT

  // MEMBER JOIN
  authorName: string;       // MEMBER.MEMBER_NAME
  authorNickname?: string;  // MEMBER.COMMUNITY_NICKNAME

  // COUNT JOIN
  likeCount: number;        // POST_LIKE COUNT
  commentCount: number;     // POST_COMMENT COUNT
  images?: PostImage[];

  // 화면 전용
  isHot?: boolean;
  isAnonymous?: boolean;
  tag?: string;
}

// POST_COMMENT 테이블 + MEMBER JOIN
export interface PostComment {
  commentId: number;        // COMMENT_ID
  memberId: number;         // MEMBER_ID
  postId: number;           // POST_ID
  parentId?: number;        // PARENT_ID
  content: string;          // CONTENT
  isAnonymous: number;      // IS_ANONYMOUS (0|1)
  isDeleted: number;        // IS_DELETED (0|1)
  createdAt: string;        // CREATED_AT

  // MEMBER JOIN
  authorName: string;
  authorNickname?: string;
  likeCount: number;

  // 화면 전용
  isSeller?: boolean;
  replies?: PostComment[];
}

// PRODUCT 테이블 + MEMBER JOIN
export interface Product {
  productId: number;         // PRODUCT_ID
  memberId: number;          // MEMBER_ID
  productName: string;       // PRODUCT_NAME
  price: number;             // PRICE
  description?: string;      // DESCRIPTION (CLOB)
  viewCount: number;         // VIEW_COUNT
  isDeleted: number;         // IS_DELETED (0|1)
  createdAt: string;         // CREATED_AT
  updatedAt?: string;        // UPDATED_AT
  productStatus: TradeStatus; // PRODUCT_STATUS ('SALE'|'RESERVE'|'DONE')
  place?: string;            // PLACE (추가 예정)
  category: ProductCategory; // CATEGORY (추가 예정)

  // MEMBER JOIN
  sellerName: string;        // MEMBER.MEMBER_NAME
  sellerNickname?: string;   // MEMBER.COMMUNITY_NICKNAME

  // COUNT JOIN
  likeCount: number;         // PRODUCT_LIKE COUNT
  chatCount: number;         // TRADE_CHAT_ROOM COUNT

  // PRODUCT_IMAGE JOIN
  images?: ProductImage[];
}

// PRODUCT_IMAGE 테이블
export interface ProductImage {
  imageId: number;           // IMAGE_ID
  productId: number;         // PRODUCT_ID
  imageUrl: string;          // IMAGE_URL
  imageSort: number;         // IMAGE_SORT
  createdAt: string;         // CREATED_AT
}

// PRODUCT_COMMENT 테이블 + MEMBER JOIN
export interface ProductComment {
  commentId: number;         // COMMENT_ID
  memberId: number;          // MEMBER_ID
  productId: number;         // PRODUCT_ID
  parentId?: number;         // PARENT_ID
  content: string;           // CONTENT
  isAnonymous: number;       // IS_ANONYMOUS (0|1)
  isDeleted: number;         // IS_DELETED (0|1)
  createdAt: string;         // CREATED_AT

  // MEMBER JOIN
  authorName: string;
  authorNickname?: string;
  likeCount: number;

  // 화면 전용
  isSeller?: boolean;
  replies?: ProductComment[];
}

// TRADE 테이블
export interface Trade {
  tradeId: number;           // TRADE_ID
  productId: number;         // PRODUCT_ID
  sellerId: number;          // SELLER_ID
  buyerId: number;           // BUYER_ID
  tradeStatus: string;       // TRADE_STATUS (DEFAULT 'READY')
  price: number;             // PRICE

  // JOIN
  productName?: string;
  sellerName?: string;
  buyerName?: string;
}

// TRADE_CHAT_ROOM 테이블
export interface TradeChatRoom {
  roomId: number;            // ROOM_ID
  productId: number;         // PRODUCT_ID
  sellerId: number;          // SELLER_ID
  buyerId: number;           // BUYER_ID
  createdAt: string;         // CREATED_AT

  // JOIN + 화면 전용
  productName?: string;
  otherUserName?: string;
  lastMessage?: string;
  unreadCount?: number;
}

// TRADE_CHAT_MESSAGE 테이블
export interface TradeChatMessage {
  messageId: number;         // MESSAGE_ID
  roomId: number;            // ROOM_ID
  senderId: number;          // SENDER_ID
  content: string;           // CONTENT
  isRead: number;            // IS_READ (0|1)
  sendAt: string;            // SEND_AT

  // 화면 전용
  isMine?: boolean;
}

// PAYMENT 테이블
export interface Payment {
  paymentId: number;         // PAYMENT_ID
  tradeId: number;           // TRADE_ID
  impUid: string;            // IMP_UID
  merchantUid: string;       // MERCHANT_UID
  amount: number;            // AMOUNT
  status: string;            // STATUS (DEFAULT 'READY')
  paidAt?: string;           // PAID_AT
}

// MEMBER 테이블
export interface Member {
  memberId: number;          // MEMBER_ID
  memberName: string;        // MEMBER_NAME
  communityNickname?: string; // COMMUNITY_NICKNAME
  profileImageUrl?: string;  // PROFILE_IMAGE_URL (추가 예정)
  bio?: string;              // BIO (추가 예정)
  createdAt: string;         // CREATED_AT
}

// POST_REPORT 테이블
export interface PostReport {
  reportId: number;          // REPORT_ID
  memberId: number;          // MEMBER_ID
  postId: number;            // POST_ID
  reason?: string;           // REASON (추가 예정)
  detail?: string;           // DETAIL (추가 예정)
  pressedAt: string;         // PRESSED_AT
}

// PRODUCT_REPORT 테이블 (신규 생성 예정)
export interface ProductReport {
  reportId: number;
  memberId: number;
  productId: number;
  reason?: string;
  detail?: string;
  pressedAt: string;
}

export interface PostImage {
  imageId: number;
  postId: number;
  imageUrl: string;
  imageSort: number;
  createdAt: string;
}
