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

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
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

export const getMyPosts = async (
  page = 0,
  size = 8,
): Promise<PageResponse<Post>> => {
  const res = await api.get<PageResponse<Post>>("/api/cmypage/posts", {
    params: { page, size },
  });
  return res.data;
};

export const getMyComments = async (
  page = 0,
  size = 8,
): Promise<PageResponse<MyComment>> => {
  const res = await api.get<PageResponse<MyComment>>("/api/cmypage/comments", {
    params: { page, size },
  });
  return res.data;
};

export const getLikedPosts = async (
  page = 0,
  size = 8,
): Promise<PageResponse<Post>> => {
  const res = await api.get<PageResponse<Post>>("/api/cmypage/liked-posts", {
    params: { page, size },
  });
  return res.data;
};

export const getMyTrades = async (
  role: "ALL" | "SELLER" | "BUYER" = "ALL",
  page = 0,
  size = 8,
): Promise<PageResponse<MyTrade>> => {
  const res = await api.get<PageResponse<MyTrade>>("/api/cmypage/trades", {
    params: { role, page, size },
  });
  return res.data;
};

export const getMyWishlist = async (
  page = 0,
  size = 6,
): Promise<PageResponse<MyWishlistType>> => {
  const res = await api.get<PageResponse<MyWishlistType>>("/api/cmypage/wishlist", {
    params: { page, size },
  });
  return res.data;
};

export const deactivateCommunity = async (): Promise<void> => {
  await api.post("/api/cmypage/deactivate");
};

export const reactivateCommunity = async (): Promise<void> => {
  await api.post("/api/cmypage/reactivate");
};
