import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const hitMap = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  return (
    <div
      className="flex items-center gap-0.5"
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? "Chọn đánh giá sao" : `${rating} trên ${maxRating} sao`}
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= rating;

        return (
          <Button
            key={i}
            type="button"
            variant="ghost"
            size="icon"
            disabled={!interactive}
            aria-label={`${starValue} sao`}
            aria-checked={interactive ? isFilled && starValue === Math.round(rating) : undefined}
            role={interactive ? "radio" : undefined}
            onClick={() => interactive && onRatingChange?.(starValue)}
            className={cn(
              hitMap[size],
              "shrink-0 rounded-full p-0",
              interactive && "hover:bg-muted/60",
              !interactive && "pointer-events-none opacity-100 disabled:opacity-100"
            )}
          >
            <Star
              className={cn(
                sizeMap[size],
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-muted-foreground/40"
              )}
            />
          </Button>
        );
      })}
    </div>
  );
}
