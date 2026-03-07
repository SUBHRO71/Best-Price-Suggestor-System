import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { getWishlist, removeWishlistItem, type WishlistItem } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Heart, Loader2, Trash2 } from "lucide-react";

const Wishlist = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWishlist();
      setItems(data.results);
    } catch (err: any) {
      toast.error(err.message || "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await removeWishlistItem(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
      toast.success("Removed from wishlist");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove item");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Wishlist</h1>
            <p className="text-sm text-muted-foreground">Saved products for quick access and price tracking</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading wishlist...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-center">
            <Heart className="mb-4 h-14 w-14 text-muted-foreground/30" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">No wishlist items yet</h2>
            <p className="mb-6 text-muted-foreground">Add products from search results or comparison page</p>
            <Button variant="hero" onClick={() => navigate("/dashboard")}>
              Search Products
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <div key={item._id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                    {item.store || "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Added {new Date(item.added_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-foreground">{item.product_name}</h3>
                <p className="mb-5 text-2xl font-bold text-primary">
                  {typeof item.price === "number" ? `Rs ${item.price.toLocaleString("en-IN")}` : "Price not available"}
                </p>

                <div className="flex flex-wrap gap-2">
                  {item.product_url ? (
                    <a href={item.product_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                        <ExternalLink className="h-4 w-4" />
                        Visit
                      </Button>
                    </a>
                  ) : (
                    <Button variant="outline" size="sm" className="rounded-xl" disabled>
                      No Link
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2 rounded-xl"
                    onClick={() => handleRemove(item._id)}
                    disabled={removingId === item._id}
                  >
                    <Trash2 className="h-4 w-4" />
                    {removingId === item._id ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
