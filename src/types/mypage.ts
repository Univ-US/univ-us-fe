export interface MyPost {
  postId: number;
  boardId: number;
  title: string;
  board: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

export interface MyComment {
  commentId: number;
  postId: number;
  boardId: number;
  content: string;
  postTitle: string;
  board: string;
  boardName?: string;
  createdAt: string;
}

export interface MyTrade {
  tradeId: number;
  productId?: number;
  roomId?: number | null;
  productName: string;
  price: number;
  status: string;
  role: '판매' | '구매';
  createdAt: string;
}

export interface MyWishlist {
  productId: number;
  productName: string;
  price: number;
  place: string;
  status: string;
}

export interface UserProfile {
  memberId: number;
  memberName: string;
  communityNickname: string | null;
  univName: string | null;
  deptName: string | null;
  status: string;
  createdAt: string;
}

export interface MyPageSummary {
  postCount: number;
  commentCount: number;
  likedPostCount: number;
  tradeCount: number;
  wishlistCount: number;
}

export interface ProfileUpdatePayload {
  communityNickname: string;
}
