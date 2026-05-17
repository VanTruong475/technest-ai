import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-6">Trang không tồn tại</p>
      <Link to="/">
        <Button>Về trang chủ</Button>
      </Link>
    </div>
  );
}
