import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import AdminNav from "@/components/common/AdminNav";

interface Product {
  id: number;
  category_id: number;
  brand_id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface ProductFormData {
  category_id: number;
  brand_id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
}

const EMPTY_FORM: ProductFormData = {
  category_id: 0,
  brand_id: 0,
  name: "",
  slug: "",
  description: "",
  image_url: "",
  price: 0,
  sale_price: null,
  stock: 0,
  status: "ACTIVE",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang bán",
  INACTIVE: "Ngừng bán",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
    .replace(/[èéẹẻẽêềếệểễ]/g, "e")
    .replace(/[ìíịỉĩ]/g, "i")
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
    .replace(/[ùúụủũưừứựửữ]/g, "u")
    .replace(/[ỳýỵỷỹ]/g, "y")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminProductPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const limit = 10;

  // Fetch products
  const { data: productsData, isLoading, error: productsError } = useQuery<ProductsResponse>({
    queryKey: ["admin-products", search, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      const res = await axiosClient.get("/api/products", { params });
      return res.data;
    },
  });

  // Fetch categories
  const { data: categoriesData } = useQuery<{ items: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/categories", { params: { limit: 100 } });
      return res.data;
    },
  });

  // Fetch brands
  const { data: brandsData } = useQuery<{ items: Brand[] }>({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/brands", { params: { limit: 100 } });
      return res.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      await axiosClient.post("/api/products", data);
    },
    onSuccess: () => {
      toast.success("Tạo sản phẩm thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Tạo sản phẩm thất bại");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductFormData }) => {
      await axiosClient.put(`/api/products/${id}`, data);
    },
    onSuccess: () => {
      toast.success("Cập nhật sản phẩm thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Cập nhật sản phẩm thất bại");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`/api/products/${id}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa sản phẩm!");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Xóa sản phẩm thất bại");
    },
  });

  const openCreateForm = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setForm({
      category_id: product.category_id,
      brand_id: product.brand_id,
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      image_url: product.image_url || "",
      price: product.price,
      sale_price: product.sale_price,
      stock: product.stock,
      status: product.status,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: editingProduct ? prev.slug : generateSlug(name),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category_id || !form.brand_id) {
      toast.error("Vui lòng chọn danh mục và thương hiệu");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm");
      return;
    }
    if (form.price <= 0) {
      toast.error("Giá phải lớn hơn 0");
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Xác nhận xóa sản phẩm "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const products = productsData?.items || [];
  const categories = categoriesData?.items || [];
  const brands = brandsData?.items || [];

  const getCategoryName = (id: number) => categories.find((c) => c.id === id)?.name || `#${id}`;
  const getBrandName = (id: number) => brands.find((b) => b.id === id)?.name || `#${id}`;

  return (
    <div className="space-y-6">
      <AdminNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý sản phẩm</h1>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-1" />
          Thêm sản phẩm
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Tìm kiếm sản phẩm..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={closeForm}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên sản phẩm *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="iPhone 15 Pro Max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="iphone-15-pro-max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Danh mục *</Label>
                <select
                  id="category"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={form.category_id || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, category_id: Number(e.target.value) }))}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Thương hiệu *</Label>
                <select
                  id="brand"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={form.brand_id || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, brand_id: Number(e.target.value) }))}
                >
                  <option value="">Chọn thương hiệu</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Giá *</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_price">Giá khuyến mãi</Label>
                <Input
                  id="sale_price"
                  type="number"
                  min={0}
                  value={form.sale_price ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, sale_price: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Tồn kho</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm((prev) => ({ ...prev, stock: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Trạng thái</Label>
                <select
                  id="status"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="ACTIVE">Đang bán</option>
                  <option value="INACTIVE">Ngừng bán</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="image_url">URL hình ảnh</Label>
                <Input
                  id="image_url"
                  value={form.image_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <textarea
                  id="description"
                  className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả sản phẩm..."
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProduct ? "Cập nhật" : "Tạo mới"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Đang tải sản phẩm...</div>
      ) : productsError ? (
        <div className="text-center py-12 text-destructive">Không thể tải danh sách sản phẩm. Vui lòng thử lại.</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Không có sản phẩm nào.</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">ID</th>
                    <th className="text-left p-3 font-medium">Tên</th>
                    <th className="text-left p-3 font-medium">Danh mục</th>
                    <th className="text-left p-3 font-medium">Thương hiệu</th>
                    <th className="text-right p-3 font-medium">Giá</th>
                    <th className="text-right p-3 font-medium">Tồn kho</th>
                    <th className="text-center p-3 font-medium">Trạng thái</th>
                    <th className="text-center p-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{product.id}</td>
                      <td className="p-3 font-medium max-w-[200px] truncate">{product.name}</td>
                      <td className="p-3 text-muted-foreground">{getCategoryName(product.category_id)}</td>
                      <td className="p-3 text-muted-foreground">{getBrandName(product.brand_id)}</td>
                      <td className="p-3 text-right">
                        {product.sale_price ? (
                          <div>
                            <span className="text-destructive font-medium">{formatPrice(product.sale_price)}</span>
                            <span className="text-xs text-muted-foreground line-through ml-1">{formatPrice(product.price)}</span>
                          </div>
                        ) : (
                          <span className="font-medium">{formatPrice(product.price)}</span>
                        )}
                      </td>
                      <td className="p-3 text-right">{product.stock}</td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          product.status === "ACTIVE" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-600"
                        }`}>
                          {STATUS_LABELS[product.status] || product.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditForm(product)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id, product.name)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {productsData && productsData.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {productsData.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= productsData.total_pages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
