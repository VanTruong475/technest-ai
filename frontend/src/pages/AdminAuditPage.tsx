import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AdminNav from "@/components/common/AdminNav";
import Pagination from "@/components/common/Pagination";
import { TableSkeleton } from "@/components/common/Skeleton";
import { formatDate } from "@/utils/format";
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange";

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

const ACTION_COLORS: Record<string, string> = {
  CREATE: "text-green-600 bg-green-50",
  UPDATE: "text-blue-600 bg-blue-50",
  DELETE: "text-red-600 bg-red-50",
  EXPORT: "text-purple-600 bg-purple-50",
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
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminNav />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h1 className="text-2xl font-bold">Nhật ký hoạt động</h1>
        {data && (
          <p className="text-sm text-muted-foreground">{data.total} bản ghi</p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={actionFilter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => { setActionFilter(""); setPage(1); }}
        >
          Tất cả
        </Button>
        {["CREATE", "UPDATE", "DELETE", "EXPORT"].map((action) => (
          <Button
            key={action}
            variant={actionFilter === action ? "default" : "outline"}
            size="sm"
            onClick={() => { setActionFilter(action); setPage(1); }}
          >
            {action}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={targetFilter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => { setTargetFilter(""); setPage(1); }}
        >
          Mọi đối tượng
        </Button>
        {["PRODUCT", "ORDER", "USER", "REVIEW", "INVENTORY"].map((target) => (
          <Button
            key={target}
            variant={targetFilter === target ? "default" : "outline"}
            size="sm"
            onClick={() => { setTargetFilter(target); setPage(1); }}
          >
            {target}
          </Button>
        ))}
      </div>

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
        <div className="text-center py-12 text-muted-foreground">
          Chưa có nhật ký nào.
        </div>
      ) : (
        !isLoading && !error && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
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
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || "text-gray-600 bg-gray-50"}`}>
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
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
