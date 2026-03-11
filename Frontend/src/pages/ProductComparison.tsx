import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSearch } from "@/contexts/SearchContext";
import { addToWishlist, compareProducts, type SearchResponse } from "@/lib/api";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, ExternalLink, Heart, Loader2, PackageSearch } from "lucide-react";
import { toast } from "sonner";

const ProductComparison = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { results, selectedProduct } = useSearch();
  const [comparison, setComparison] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const query = useMemo(
    () => searchParams.get("q")?.trim() || selectedProduct?.name || results?.query || "",
    [searchParams, selectedProduct?.name, results?.query]
  );

  useEffect(() => {
    if (!query) return;

    setLoading(true);
    compareProducts(query)
      .then((data) => setComparison(data))
      .catch((err: any) => {
        setComparison(null);
        toast.error(err.message || "Comparison failed");
      })
      .finally(() => setLoading(false));
  }, [query]);

  if (!query) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageSearch className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">No product selected</h2>
            <p className="mb-6 text-muted-foreground">Search for a product and open comparison from results</p>
            <Button variant="hero" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-foreground">Refreshing live comparison...</p>
          <p className="text-sm text-muted-foreground">Fetching latest prices from stores</p>
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageSearch className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">Comparison unavailable</h2>
            <p className="mb-6 text-muted-foreground">Could not fetch fresh comparison results right now</p>
            <Button variant="hero" onClick={() => navigate(`/results?q=${encodeURIComponent(query)}`)}>Back to Results</Button>
          </div>
        </div>
      </div>
    );
  }

  const bestDeal = comparison.bestDeal;
  const otherListings = bestDeal
    ? comparison.results.filter((r) => !(r.store === bestDeal.store && r.price === bestDeal.price))
    : comparison.results;
  const highestPrice = comparison.results.length ? Math.max(...comparison.results.map((r) => r.price)) : 0;
  const savings = bestDeal ? highestPrice - bestDeal.price : 0;

  const handleAddToWishlist = async () => {
    if (!bestDeal) return;
    try {
      await addToWishlist({
        name: bestDeal.name,
        store: bestDeal.store,
        price: bestDeal.price,
        link: bestDeal.link,
      });
      toast.success("Added to wishlist");
    } catch (err: any) {
      toast.error(err.message || "Failed to add to wishlist");
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
            <h1 className="text-2xl font-bold text-foreground">Price Comparison</h1>
            <p className="text-sm text-muted-foreground">
              Live comparison for "{comparison.query}" across {comparison.total} store{comparison.total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {bestDeal && (
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-primary">Best Deal Found</h3>
            </div>
            <div className="relative overflow-hidden rounded-3xl border-2 border-primary bg-primary/5 p-8 shadow-card-hover">
              <div className="absolute right-0 top-0 rounded-bl-2xl gradient-primary px-4 py-2">
                <span className="text-sm font-bold text-primary-foreground">LOWEST PRICE</span>
              </div>

              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-5">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-card shadow-card">
                    <PackageSearch className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <span className={`mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      bestDeal.store === "Amazon"
                        ? "bg-[hsl(45,100%,51%)] text-[hsl(0,0%,10%)]"
                        : "bg-[hsl(220,80%,55%)] text-[hsl(0,0%,100%)]"
                    }`}>
                      {bestDeal.store}
                    </span>
                    <h4 className="mb-1 text-lg font-bold text-foreground">{bestDeal.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(bestDeal.scrapedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <p className="text-4xl font-bold text-primary">
                    Rs {bestDeal.price.toLocaleString("en-IN")}
                  </p>
                  <div className="flex gap-2">
                    {bestDeal.link ? (
                      <a href={bestDeal.link} target="_blank" rel="noopener noreferrer">
                        <Button variant="hero" size="lg" className="gap-2 rounded-xl shadow-primary">
                          <ExternalLink className="h-5 w-5" />
                          Buy on {bestDeal.store}
                        </Button>
                      </a>
                    ) : (
                      <Button variant="outline" size="lg" className="rounded-xl" disabled>
                        Link unavailable
                      </Button>
                    )}
                    <Button variant="outline" size="lg" className="gap-2 rounded-xl" onClick={handleAddToWishlist}>
                      <Heart className="h-5 w-5" />
                      Wishlist
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {otherListings.length > 0 && (
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Other Store Listings
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {otherListings.map((r, i) => (
                <ProductCard key={`${r.store}-${i}`} result={r} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-4 text-lg font-bold text-foreground">Price Summary</h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Store</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Product</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {comparison.results.map((r, i) => {
                  const isBest = bestDeal && r.store === bestDeal.store && r.price === bestDeal.price;
                  return (
                    <tr key={`table-${r.store}-${i}`} className={`border-t ${isBest ? "bg-primary/5" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            r.store === "Amazon"
                              ? "bg-[hsl(45,100%,51%)] text-[hsl(0,0%,10%)]"
                              : "bg-[hsl(220,80%,55%)] text-[hsl(0,0%,100%)]"
                          }`}>
                            {r.store}
                          </span>
                          {isBest && <Crown className="h-4 w-4 text-primary" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{r.name}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isBest ? "text-primary" : "text-foreground"}`}>
                        Rs {r.price.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.link ? (
                          <a href={r.link} target="_blank" rel="noopener noreferrer">
                            <Button variant={isBest ? "hero" : "outline"} size="sm" className="gap-1 rounded-lg text-xs">
                              <ExternalLink className="h-3 w-3" />
                              Visit
                            </Button>
                          </a>
                        ) : (
                          <Button variant="outline" size="sm" className="rounded-lg text-xs" disabled>
                            No link
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {bestDeal && savings > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              You save <span className="font-bold text-primary">Rs {savings.toLocaleString("en-IN")}</span> by buying from {bestDeal.store}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductComparison;
