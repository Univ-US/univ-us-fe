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

export const getMyComments = async (): Promise<any[]> => {
  const res = await api.get<any[]>("/api/cmypage/comments");
  return res.data ?? [];
};

export const getLikedPosts = async (): Promise<Post[]> => {
  const res = await api.get<Post[]>("/api/cmypage/liked-posts");
  return res.data ?? [];
};
