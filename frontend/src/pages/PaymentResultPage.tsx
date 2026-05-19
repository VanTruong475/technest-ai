import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, ArrowLeft, Package } from "lucide-react";

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const orderId = searchParams.get("order_id");

  const isSuccess = status === "success";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md border-border/60 shadow-sm">
        <CardContent className="pt-8 pb-6 space-y-4 text-center">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            isSuccess ? "bg-green-100" : "bg-destructive/10"
          }`}>
            {isSuccess ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive" />
            )}
          </div>

          <h2 className="text-xl font-semibold">
            {isSuccess ? "Thanh toán thành công!" : "Thanh toán thất bại"}
          </h2>

          <p className="text-sm text-muted-foreground">
            {isSuccess
              ? "Đơn hàng của bạn đã được thanh toán. Cảm ơn bạn đã mua sắm tại TechSphere AI!"
              : "Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại."}
          </p>

          {orderId && (
            <p className="text-sm text-muted-foreground">
              Mã đơn hàng: <span className="font-semibold">#{orderId}</span>
            </p>
          )}

          <div className="flex gap-2 justify-center pt-2">
            {isSuccess && orderId ? (
              <Link to={`/orders/${orderId}`}>
                <Button className="rounded-xl">
                  <Package className="h-4 w-4 mr-1" />
                  Xem đơn hàng
                </Button>
              </Link>
            ) : (
              <Link to="/cart">
                <Button className="rounded-xl">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Quay lại giỏ hàng
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
