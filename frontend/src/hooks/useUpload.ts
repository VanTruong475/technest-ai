import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import axiosClient from "@/api/axiosClient";

interface UploadResult {
  url: string;
}

export function useUpload() {
  const mutation = useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axiosClient.post("/api/uploads/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
  });

  const getError = (): string | null => {
    if (!mutation.error) return null;
    if (axios.isAxiosError(mutation.error)) {
      return mutation.error.response?.data?.detail || mutation.error.message;
    }
    return mutation.error.message;
  };

  return {
    upload: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: getError(),
    reset: mutation.reset,
  };
}
