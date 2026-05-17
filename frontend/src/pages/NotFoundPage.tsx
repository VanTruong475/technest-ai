import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Search className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-5xl font-bold mb-3">404</h1>
      <p className="text-lg text-muted-foreground mb-2">Trang không tồn tại</p>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển. Vui lòng kiểm tra lại đường dẫn.
      </p>
      <div className="flex gap-3">
        <Link to="/">
          <Button>
            <Home className="h-4 w-4 mr-1.5" />
            Về trang chủ
          </Button>
        </Link>
        <Link to="/products">
          <Button variant="outline">Xem sản phẩm</Button>
        </Link>
      </div>
    </div>
  );
}
