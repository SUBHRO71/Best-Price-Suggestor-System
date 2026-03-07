import type { SearchResult } from "@/lib/api";
import { ExternalLink, Crown, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToWishlist } from "@/lib/api";
import { toast } from "sonner";

interface ProductCardProps {
  result: SearchResult;
  isBestDeal?: boolean;
}

const storeColors: Record<string, string> = {
  Amazon: "bg-[hsl(45,100%,51%)] text-[hsl(0,0%,10%)]",
  Flipkart: "bg-[hsl(220,80%,55%)] text-[hsl(0,0%,100%)]",
};

const ProductCard = ({ result, isBestDeal }: ProductCardProps) => {
  const handleAddToWishlist = async () => {
    try {
      await addToWishlist({
        name: result.name,
        store: result.store,
        price: result.price,
        link: result.link,
      });
      toast.success("Added to wishlist");
    } catch (err: any) {
      toast.error(err.message || "Failed to add to wishlist");
    }
  };

  return (
    <div
      className={`relative rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-card-hover ${
        isBestDeal
          ? "border-primary bg-primary/5 shadow-card-hover"
          : "border-border bg-card shadow-card"
      }`}
    >
      {isBestDeal && (
        <div className="absolute -top-3 left-4 flex items-center gap-1.5 rounded-full gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground">
          <Crown className="h-3 w-3" />
          Best Deal
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${storeColors[result.store] || "bg-muted text-muted-foreground"}`}>
          {result.store}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(result.scrapedAt).toLocaleDateString()}
        </span>
      </div>

      <h3 className="mb-4 line-clamp-2 text-lg font-semibold leading-snug text-foreground">
        {result.name}
      </h3>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Price</p>
          <p className={`text-2xl font-bold ${isBestDeal ? "text-primary" : "text-foreground"}`}>
            Rs {result.price.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {result.link ? (
            <a href={result.link} target="_blank" rel="noopener noreferrer">
              <Button variant={isBestDeal ? "hero" : "outline"} size="sm" className="gap-2 rounded-xl">
                <ExternalLink className="h-4 w-4" />
                Buy Now
              </Button>
            </a>
          ) : (
            <Button variant="outline" size="sm" className="rounded-xl" disabled>
              No Link
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleAddToWishlist}>
            <Heart className="h-4 w-4" />
            Wishlist
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
