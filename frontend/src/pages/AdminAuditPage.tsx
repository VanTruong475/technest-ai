import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import Pagination from "@/components/common/Pagination";
import { TableSkeleton } from "@/components/common/Skeleton";
import { formatDate } from "@/utils/format";
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange";
import { ScrollText } from "lucide-react";

interface AuditLogItem {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  target_type: string;
  target_id: number | null;
  details: string | null;
  created_at: string;
}

interface AuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Audit action badges — dark-safe, cùng họ UI_PATTERNS Status Badge */
const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  EXPORT: "bg-muted text-muted-foreground",
};

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  useScrollToTopOnChange(page);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [targetFilter, setTargetFilter] = useState<string>("");
  const limit = 20;

  const { data, isLoading, error } = useQuery<AuditLogsResponse>({
    queryKey: ["admin-audit-logs", page, actionFilter, targetFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (actionFilter) params.action = actionFilter;
      if (targetFilter) params.target_type = targetFilter;
      const res = await axiosClient.get("/api/admin/audit-logs", { params });
      return res.data;
    },
  });

  const logs = data?.items || [];

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h1 className="text-2xl font-bold">Nhật ký hoạt động</h1>
        {data && (
          <p className="text-sm text-muted-foreground">{data.total} bản ghi</p>
        )}
      </div>

      {/* Filters — chip groups với label + visual hierarchy */}
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20 shrink-0">
              Hành động
            </span>
            <Button
              variant={actionFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => { setActionFilter(""); setPage(1); }}
              className="h-7 rounded-full text-xs"
            >
              Tất cả
            </Button>
            {["CREATE", "UPDATE", "DELETE", "EXPORT"].map((action) => (
              <Button
                key={action}
                variant={actionFilter === action ? "default" : "outline"}
                size="sm"
                onClick={() => { setActionFilter(action); setPage(1); }}
                className="h-7 rounded-full text-xs"
              >
                {action}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20 shrink-0">
              Đối tượng
            </span>
            <Button
              variant={targetFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => { setTargetFilter(""); setPage(1); }}
              className="h-7 rounded-full text-xs"
            >
              Tất cả
            </Button>
            {["PRODUCT", "ORDER", "USER", "REVIEW", "INVENTORY"].map((target) => (
              <Button
                key={target}
                variant={targetFilter === target ? "default" : "outline"}
                size="sm"
                onClick={() => { setTargetFilter(target); setPage(1); }}
                className="h-7 rounded-full text-xs"
              >
                {target}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && <TableSkeleton columns={7} rows={8} />}

      {/* Error */}
      {error && (
        <div className="text-center py-12 text-destructive">
          Không thể tải nhật ký hoạt động.
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && logs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-400/20 to-indigo-500/20 blur-2xl rounded-full" />
              <div className="h-16 w-16 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <ScrollText className="h-8 w-8" />
              </div>
            </div>
            <h3 className="font-semibold text-base mb-1.5">Chưa có nhật ký nào</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Mọi thao tác CRUD/EXPORT của admin sẽ được ghi log tự động và
              hiển thị ở đây để truy vết.
            </p>
          </CardContent>
        </Card>
      ) : (
        !isLoading && !error && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Thời gian</th>
                      <th className="text-left p-3 font-medium">Admin</th>
                      <th className="text-center p-3 font-medium">Hành động</th>
                      <th className="text-left p-3 font-medium">Đối tượng</th>
                      <th className="text-left p-3 font-medium">Target ID</th>
                      <th className="text-left p-3 font-medium">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">#{log.id}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="p-3 font-medium">{log.user_name}</td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || "text-muted-foreground bg-muted"}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3">{log.target_type}</td>
                        <td className="p-3 text-muted-foreground">
                          {log.target_id !== null ? `#${log.target_id}` : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground max-w-[250px] truncate" title={log.details || ""}>
                          {log.details || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="mt-6">
          <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
