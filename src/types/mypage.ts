export interface MyPost {
  postId: number;
  title: string;
  board: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

export interface MyComment {
  commentId: number;
  content: string;
  postTitle: string;
  board: string;
  createdAt: string;
}

export interface MyTrade {
  tradeId: number;
  productName: string;
  price: number;
  status: '판매중' | '예약중' | '거래완료';
  role: '판매' | '구매';
  createdAt: string;
}

export interface MyWishlist {
  productId: number;
  productName: string;
  price: number;
  place: string;
  status: '판매중' | '예약중' | '거래완료';
}

export interface UserProfile {
  name: string;
  nickname: string;
  department: string;
  joinedAt: string;
  postCount: number;
  commentCount: number;
  likeCount: number;
}
