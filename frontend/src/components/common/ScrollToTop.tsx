import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-6 right-6 z-50 shadow-md rounded-full h-10 w-10"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Cuộn lên đầu trang"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );
}
