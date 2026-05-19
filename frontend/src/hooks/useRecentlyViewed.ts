import { useCallback } from "react";

const STORAGE_KEY = "techsphere_recently_viewed";
const MAX_ITEMS = 10;

export interface RecentlyViewedProduct {
  id: number;
  name: string;
  image_url: string | null;
  price: number;
  sale_price: number | null;
}

function readFromStorage(): RecentlyViewedProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is RecentlyViewedProduct =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentlyViewedProduct).id === "number" &&
        typeof (item as RecentlyViewedProduct).name === "string"
    );
  } catch {
    return [];
  }
}

function writeToStorage(items: RecentlyViewedProduct[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or disabled — silently ignore
  }
}

export function getRecentlyViewed(): RecentlyViewedProduct[] {
  return readFromStorage();
}

export function addToRecentlyViewed(product: RecentlyViewedProduct): void {
  const items = readFromStorage().filter((item) => item.id !== product.id);
  items.unshift(product);
  writeToStorage(items.slice(0, MAX_ITEMS));
}

export function useRecentlyViewed() {
  const get = useCallback(() => getRecentlyViewed(), []);
  const add = useCallback((product: RecentlyViewedProduct) => addToRecentlyViewed(product), []);

  return { getRecentlyViewed: get, addToRecentlyViewed: add };
}
