import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LINKS = [
  { to: "/admin/products", label: "Sản phẩm" },
  { to: "/admin/orders", label: "Đơn hàng" },
  { to: "/admin/users", label: "Người dùng" },
];

export default function AdminNav() {
  const location = useLocation();

  return (
    <nav className="flex gap-2 border-b pb-4">
      {LINKS.map((link) => (
        <Link key={link.to} to={link.to}>
          <Button
            variant={location.pathname === link.to ? "default" : "outline"}
            size="sm"
          >
            {link.label}
          </Button>
        </Link>
      ))}
    </nav>
  );
}
