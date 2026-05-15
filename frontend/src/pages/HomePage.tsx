import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-8 shadow-sm">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          TechSphere AI
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight">
          Nền tảng thương mại điện tử thiết bị công nghệ tích hợp AI
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Mua laptop, điện thoại và phụ kiện công nghệ với AI hỗ trợ tư vấn sản phẩm phù hợp nhu cầu.
        </p>
        <div className="mt-6 flex gap-3">
          <Button>Xem sản phẩm</Button>
          <Button variant="outline">Hỏi AI tư vấn</Button>
        </div>
      </section>
    </div>
  )
}