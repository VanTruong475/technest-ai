import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import axiosClient from "@/api/axiosClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Clock,
  AlertTriangle,
  XCircle,
  Star,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { DashboardSkeleton } from "@/components/common/Skeleton";
import { formatPrice, formatDate } from "@/utils/format";
import { ORDER_STATUS_MAP } from "@/constants/orderStatus";

interface DashboardSummary {
  total_users: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_reviews: number;
  average_rating: number;
}

interface RevenueByDay {
  date: string;
  revenue: number;
}

interface OrdersByStatus {
  status: string;
  count: number;
}

interface TopProduct {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

interface RecentOrder {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  created_at: string;
}

interface DashboardTrends {
  revenue: number | null;
  orders: number | null;
  users: number | null;
  products: number | null;
}

interface DashboardData {
  summary: DashboardSummary;
  trends?: DashboardTrends;
  charts: {
    revenue_by_day: RevenueByDay[];
    orders_by_status: OrdersByStatus[];
  };
  recent_orders: RecentOrder[];
  top_products: TopProduct[];
}

const PIE_COLORS: Record<string, string> = {
  PENDING: "#eab308",
  CONFIRMED: "#3b82f6",
  SHIPPING: "#a855f7",
  COMPLETED: "#22c55e",
  CANCELLED: "#ef4444",
};

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** Tooltip custom — dùng token theme (bg-popover) nên đúng cả light/dark,
    thay tooltip mặc định của Recharts (nền trắng cố định, vỡ dark mode). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label, kind }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover text-popover-foreground border rounded-md p-2 shadow-md text-xs">
      {kind === "revenue" ? (
        <>
          <p className="font-medium mb-1">Ngày {formatShortDate(String(label))}</p>
          <p className="text-muted-foreground">
            Doanh thu:{" "}
            <span className="font-semibold text-foreground">
              {formatPrice(Number(payload[0].value))}
            </span>
          </p>
        </>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload.map((entry: any, i: number) => {
          const info = ORDER_STATUS_MAP[entry.name as string];
          return (
            <p key={i} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: entry.payload?.fill || entry.color }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground">{info?.label || entry.name}:</span>
              <span className="font-semibold">{entry.value}</span>
            </p>
          );
        })
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/admin/stats");
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">

        <h1 className="text-2xl font-bold">Dashboard</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">

        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-center py-12 space-y-4">
          <p className="text-destructive">Không thể tải dữ liệu dashboard.</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, trends, charts, recent_orders, top_products } = data;

  // Stats cards với color identity riêng cho mỗi metric. iconBg + ring +
  // gradient subtle. Critical metrics (Chờ xử lý/Sắp hết/Hết hàng) dùng tone
  // cảnh báo để admin chú ý ngay.
  const statsCards = [
    {
      label: "Tổng doanh thu",
      value: formatPrice(summary.total_revenue),
      icon: DollarSign,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      gradient: "from-emerald-500/5 to-transparent",
      trend: trends?.revenue,
    },
    {
      label: "Tổng đơn hàng",
      value: summary.total_orders.toLocaleString(),
      icon: ShoppingCart,
      iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      gradient: "from-sky-500/5 to-transparent",
      trend: trends?.orders,
    },
    {
      label: "Tổng người dùng",
      value: summary.total_users.toLocaleString(),
      icon: Users,
      iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      gradient: "from-violet-500/5 to-transparent",
      trend: trends?.users,
    },
    {
      label: "Tổng sản phẩm",
      value: summary.total_products.toLocaleString(),
      icon: Package,
      iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      gradient: "from-indigo-500/5 to-transparent",
      trend: trends?.products,
    },
    {
      label: "Chờ xử lý",
      value: summary.pending_orders.toLocaleString(),
      icon: Clock,
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      gradient: "from-amber-500/5 to-transparent",
    },
    {
      label: "Sắp hết hàng",
      value: summary.low_stock_products.toLocaleString(),
      icon: AlertTriangle,
      iconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      gradient: "from-orange-500/5 to-transparent",
    },
    {
      label: "Hết hàng",
      value: summary.out_of_stock_products.toLocaleString(),
      icon: XCircle,
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      gradient: "from-rose-500/5 to-transparent",
    },
    {
      label: "Đánh giá TB",
      value: summary.total_reviews > 0
        ? `${summary.average_rating.toFixed(1)} / 5`
        : "Chưa có",
      hint: summary.total_reviews > 0 ? `${summary.total_reviews} đánh giá` : undefined,
      icon: Star,
      iconBg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      gradient: "from-yellow-500/5 to-transparent",
    },
  ];

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Cards — icon trái 48px (color identity riêng) | số liệu + trend phải */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className={`relative overflow-hidden bg-gradient-to-br ${card.gradient} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border-border/60`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{card.label}</p>
                    <p className="text-2xl font-bold mt-0.5 truncate">{card.value}</p>
                    {typeof card.trend === "number" ? (
                      <p
                        className={`text-xs font-medium mt-1 truncate ${
                          card.trend >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {card.trend >= 0 ? "↑" : "↓"} {Math.abs(card.trend)}% so tháng trước
                      </p>
                    ) : card.hint ? (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{card.hint}</p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doanh thu 7 ngày gần nhất</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.revenue_by_day.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-400/20 to-blue-500/20 blur-2xl rounded-full" aria-hidden="true" />
                  <div className="h-14 w-14 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <BarChart3 className="h-7 w-7" />
                  </div>
                </div>
                <p className="text-sm font-medium mb-0.5">Chưa có dữ liệu doanh thu</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Biểu đồ sẽ hiển thị khi có đơn hàng hoàn thành trong 7 ngày gần nhất.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts.revenue_by_day}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    content={<ChartTooltip kind="revenue" />}
                    cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đơn hàng theo trạng thái</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.orders_by_status.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-400/20 to-purple-500/20 blur-2xl rounded-full" aria-hidden="true" />
                  <div className="h-14 w-14 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                    <PieChartIcon className="h-7 w-7" />
                  </div>
                </div>
                <p className="text-sm font-medium mb-0.5">Chưa có đơn hàng nào</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Khi có đơn hàng, biểu đồ sẽ phân bổ theo trạng thái (Chờ/Đã xác nhận/Hoàn thành...).
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={charts.orders_by_status}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="status"
                    label={({ name, value }) => {
                      const info = ORDER_STATUS_MAP[name as string];
                      return `${info?.label || name}: ${value}`;
                    }}
                  >
                    {charts.orders_by_status.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={PIE_COLORS[entry.status] || "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip kind="status" />} />
                  <Legend
                    formatter={(value: string) => {
                      const info = ORDER_STATUS_MAP[value];
                      return info?.label || value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top selling products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {top_products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                  <Package className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium mb-0.5">Chưa có dữ liệu bán hàng</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Sản phẩm bán chạy sẽ xuất hiện khi có đơn hàng được tạo.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">#</th>
                      <th className="text-left p-3 font-medium">Sản phẩm</th>
                      <th className="text-right p-3 font-medium">Đã bán</th>
                      <th className="text-right p-3 font-medium">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top_products.map((p, i) => (
                      <tr key={p.product_id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                        <td className="p-3 font-medium">{p.product_name}</td>
                        <td className="p-3 text-right">{p.total_quantity}</td>
                        <td className="p-3 text-right font-medium">
                          {formatPrice(p.total_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent_orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4">
                  <ShoppingCart className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium mb-0.5">Chưa có đơn hàng nào</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Đơn hàng mới nhất sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">ID</th>
                        <th className="text-left p-3 font-medium">Ngày</th>
                        <th className="text-right p-3 font-medium">Tổng tiền</th>
                        <th className="text-center p-3 font-medium">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent_orders.map((order) => {
                        const statusInfo = ORDER_STATUS_MAP[order.status] || {
                          label: order.status,
                          color: "text-muted-foreground bg-muted",
                        };
                        return (
                          <tr key={order.id} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="p-3">
                              <Link
                                to={`/orders/${order.id}`}
                                className="text-primary hover:underline font-medium"
                              >
                                #{order.id}
                              </Link>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {formatDate(order.created_at)}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {formatPrice(order.total_amount)}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Xem tất cả → trang quản lý đơn hàng */}
                <div className="border-t p-3 text-center">
                  <Button asChild variant="ghost" size="sm" className="text-primary">
                    <Link to="/admin/orders">Xem tất cả đơn hàng</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
