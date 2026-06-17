import api from "./api";
import type { Post } from "@/types/community";
import type {
  MyComment,
  MyPageSummary,
  MyTrade,
  MyWishlist as MyWishlistType,
  ProfileUpdatePayload,
  UserProfile,
} from "@/types/mypage";

interface MyPostsResponse {
  postList: Post[];
  totalCount: number;
  totalPage: number;
  currentPage: number;
}

export const getMyProfile = async (): Promise<UserProfile> => {
  const res = await api.get<UserProfile>("/api/cmypage/profile");
  return res.data;
};

export const updateMyProfile = async (
  payload: ProfileUpdatePayload,
): Promise<UserProfile> => {
  const res = await api.patch<UserProfile>("/api/cmypage/profile", payload);
  return res.data;
};

export const getMyPageSummary = async (): Promise<MyPageSummary> => {
  const res = await api.get<MyPageSummary>("/api/cmypage/summary");
  return res.data;
};

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

export const deactivateCommunity = async (): Promise<void> => {
  await api.post("/api/cmypage/deactivate");
};

export const reactivateCommunity = async (): Promise<void> => {
  await api.post("/api/cmypage/reactivate");
};
