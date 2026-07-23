import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Pencil, Trash2, Plus, Package } from "lucide-react";
import Pagination from "@/components/common/Pagination";

import ImageUpload from "@/components/common/ImageUpload";
import { TableSkeleton } from "@/components/common/Skeleton";
import { formatPrice } from "@/utils/format";
import { getErrorMessage } from "@/utils/api";
import { PRODUCT_STATUS_LABELS } from "@/constants/orderStatus";
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange";
import type { Product, Category, Brand, ProductsResponse } from "@/types";

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  useScrollToTopOnChange(page);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingStock, setEditingStock] = useState<Record<number, number>>({});
  const limit = 10;

  // Debounce search input — wait 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch products
  const { data: productsData, isLoading, error: productsError } = useQuery<ProductsResponse>({
    queryKey: ["admin-products", debouncedSearch, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
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
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Tạo sản phẩm thất bại"));
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
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Cập nhật sản phẩm thất bại"));
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
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Xóa sản phẩm thất bại"));
    },
  });

  // Bulk stock update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (items: { product_id: number; stock: number }[]) => {
      const res = await axiosClient.put("/api/products/bulk-update", { items });
      return res.data;
    },
    onSuccess: (data: { updated: number }) => {
      toast.success(`Đã cập nhật tồn kho ${data.updated} sản phẩm!`);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedIds(new Set());
      setEditingStock({});
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Cập nhật tồn kho thất bại"));
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
    if (form.sale_price && form.sale_price >= form.price) {
      toast.error("Giá khuyến mãi phải nhỏ hơn giá gốc");
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const products = productsData?.items || [];
  const categories = categoriesData?.items || [];
  const brands = brandsData?.items || [];

  const getCategoryName = (id: number) => categories.find((c) => c.id === id)?.name || `#${id}`;
  const getBrandName = (id: number) => brands.find((b) => b.id === id)?.name || `#${id}`;

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!products.length) return;
    setSelectedIds((prev) => {
      if (prev.size === products.length) return new Set();
      return new Set(products.map((p) => p.id));
    });
  }, [products]);

  const handleStockChange = useCallback((productId: number, value: string) => {
    const stock = parseInt(value, 10);
    if (!isNaN(stock) && stock >= 0) {
      setEditingStock((prev) => ({ ...prev, [productId]: stock }));
    }
  }, []);

  const handleBulkUpdate = useCallback(() => {
    const items = Object.entries(editingStock)
      .filter(([id]) => selectedIds.has(Number(id)))
      .map(([id, stock]) => ({ product_id: Number(id), stock }));
    if (items.length === 0) {
      toast.error("Vui lòng chỉnh sửa tồn kho trước khi cập nhật");
      return;
    }
    bulkUpdateMutation.mutate(items);
  }, [editingStock, selectedIds, bulkUpdateMutation]);

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm w-full"
        />
      </div>

      {/* Sheet — Add / Edit Product */}
      <Sheet open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
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
              <Label>Hình ảnh sản phẩm</Label>
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
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
                {createMutation.isPending || updateMutation.isPending
                  ? "Đang lưu..."
                  : editingProduct ? "Cập nhật" : "Tạo mới"}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                Hủy
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">
            Đã chọn {selectedIds.size} sản phẩm
          </span>
          <Button
            size="sm"
            onClick={handleBulkUpdate}
            disabled={bulkUpdateMutation.isPending || Object.keys(editingStock).filter((id) => selectedIds.has(Number(id))).length === 0}
          >
            <Package className="h-4 w-4 mr-1" />
            {bulkUpdateMutation.isPending ? "Đang cập nhật..." : "Cập nhật tồn kho"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSelectedIds(new Set()); setEditingStock({}); }}
          >
            Bỏ chọn
          </Button>
        </div>
      )}

      {/* Products Table */}
      {isLoading ? (
        <TableSkeleton columns={8} rows={5} />
      ) : productsError ? (
        <div className="text-center py-12 text-destructive">Không thể tải danh sách sản phẩm. Vui lòng thử lại.</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Không có sản phẩm nào.</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={products.length > 0 && selectedIds.size === products.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-border"
                      />
                    </th>
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
                  {products.map((product) => {
                    const isSelected = selectedIds.has(product.id);
                    const currentStock = editingStock[product.id] ?? product.stock;
                    const stockChanged = currentStock !== product.stock;
                    return (
                    <tr key={product.id} className={`border-b hover:bg-muted/30 ${isSelected ? "bg-muted/40" : ""}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(product.id)}
                          className="h-4 w-4 rounded border-border"
                        />
                      </td>
                      <td className="p-3">{product.id}</td>
                      <td className="p-3 font-medium max-w-[200px] truncate">{product.name}</td>
                      <td className="p-3 text-muted-foreground">{getCategoryName(product.category_id)}</td>
                      <td className="p-3 text-muted-foreground">{getBrandName(product.brand_id)}</td>
                      <td className="p-3 text-right">
                        {product.sale_price ? (
                          <div>
                            <span className="text-sale font-medium">{formatPrice(product.sale_price)}</span>
                            <span className="text-xs text-muted-foreground line-through ml-1">{formatPrice(product.price)}</span>
                          </div>
                        ) : (
                          <span className="font-medium">{formatPrice(product.price)}</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {isSelected ? (
                          <Input
                            type="number"
                            min={0}
                            value={currentStock}
                            onChange={(e) => handleStockChange(product.id, e.target.value)}
                            className={`w-20 h-7 text-right ml-auto ${stockChanged ? "border-primary" : ""}`}
                          />
                        ) : (
                          <span>{product.stock}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            product.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {PRODUCT_STATUS_LABELS[product.status] || product.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditForm(product)} aria-label={`Chỉnh sửa ${product.name}`} className="h-8 w-8 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            title="Xóa sản phẩm?"
                            description={`Hành động này không thể hoàn tác. Sản phẩm "${product.name}" sẽ bị xóa khỏi hệ thống.`}
                            confirmText="Xóa"
                            cancelText="Hủy"
                            variant="destructive"
                            onConfirm={() => deleteMutation.mutate(product.id)}
                          >
                            <Button variant="ghost" size="icon" aria-label={`Xóa ${product.name}`} className="h-8 w-8 hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </ConfirmDialog>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {productsData && productsData.total_pages > 1 && (
        <div className="mt-6">
          <Pagination page={page} totalPages={productsData.total_pages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
