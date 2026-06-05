// src/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:9090",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

export default api;