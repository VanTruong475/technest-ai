// ── Product ──
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
  category_id: number;
  brand_id: number;
  created_at?: string;
  updated_at?: string;
}

// ── Category / Brand ──
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
  is_active?: boolean;
}

// ── Cart ──
export interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
  total_items: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

// ── Order ──
export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_status: string;
  shipping_address: string;
  phone: string;
  note: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

// ── User ──
export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  address?: string | null;
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ── Review ──
export interface Review {
  id: number;
  user_id: number;
  user_name: string;
  product_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

// ── Paginated response ──
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ── AI ──
export interface AISearchResult {
  product: Product;
  score: number;
  reason: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: AISearchResult[];
  suggestions?: string[];
}

// ── Paginated response aliases ──
export type ProductsResponse = PaginatedResponse<Product>;
export type OrdersResponse = PaginatedResponse<Order>;
export type UsersResponse = PaginatedResponse<User>;
