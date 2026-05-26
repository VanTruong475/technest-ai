import { AxiosError } from "axios";

export function getErrorMessage(
  err: unknown,
  fallback: string = "Có lỗi xảy ra"
): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.detail || fallback;
  }
  if (err instanceof Error) {
    return err.message || fallback;
  }
  return fallback;
}
