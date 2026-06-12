import api from "./api";
import type { Post } from "@/types/community";
import type { MyComment, MyTrade, MyWishlist as MyWishlistType } from "@/types/mypage";

interface MyPostsResponse {
  postList: Post[];
  totalElements: number;
  totalPages: number;
}

export const getMyPosts = async (): Promise<Post[]> => {
  const res = await api.get<MyPostsResponse>("/api/cmypage/posts");
  return res.data.postList ?? [];
};

export const getMyComments = async (): Promise<MyComment[]> => {
  const res = await api.get<MyComment[]>("/api/cmypage/comments");
  return res.data ?? [];
};

export const getLikedPosts = async (): Promise<Post[]> => {
  const res = await api.get<Post[]>("/api/cmypage/liked-posts");
  return res.data ?? [];
};

export const getMyTrades = async (): Promise<MyTrade[]> => {
  const res = await api.get<MyTrade[]>("/api/cmypage/trades");
  return res.data ?? [];
};

export const getMyWishlist = async (): Promise<MyWishlistType[]> => {
  const res = await api.get<MyWishlistType[]>("/api/cmypage/wishlist");
  return res.data ?? [];
};
