import api from "./api";
import type { Post } from "@/types/community";

interface MyPostsResponse {
  postList: Post[];
  totalElements: number;
  totalPages: number;
}

export const getMyPosts = async (): Promise<Post[]> => {
  const res = await api.get<MyPostsResponse>("/api/cmypage/posts");
  return res.data.postList ?? [];
};
import type { MyComment } from "@/types/mypage";

export const getMyComments = async (): Promise<MyComment[]> => {
  const res = await api.get<MyComment[]>("/api/cmypage/comments");
  return res.data ?? [];
};

export const getLikedPosts = async (): Promise<Post[]> => {
  const res = await api.get<Post[]>("/api/cmypage/liked-posts");
  return res.data ?? [];
};
