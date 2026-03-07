import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSearch } from "@/contexts/SearchContext";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { addToWishlist } from "@/lib/api";
import { ArrowLeft, Eye, Heart, Loader2, PackageSearch } from "lucide-react";
import type { SearchResult } from "@/lib/api";

const storeColors: Record<string, string> = {
  Amazon: "bg-[hsl(45,100%,51%)] text-[hsl(0,0%,10%)]",
  Flipkart: "bg-[hsl(220,80%,55%)] text-[hsl(0,0%,100%)]",
};

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { results, loading, performSearch, selectProduct } = useSearch();
  const queryParam = searchParams.get("q")?.trim() || "";

  useEffect(() => {
    if (!queryParam) return;
    if (results?.query === queryParam) return;

    performSearch(queryParam).catch((err: any) => {
      toast.error(err.message || "Search failed");
    });
  }, [queryParam, results?.query, performSearch]);

  const handleSearch = async (query: string) => {
    try {
      await performSearch(query);
      navigate(`/results?q=${encodeURIComponent(query)}`, { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Search failed");
    }
  };

  const handleViewDeals = (product: SearchResult) => {
    selectProduct(product);
    navigate(`/compare?q=${encodeURIComponent(results?.query || product.name)}`);
  };

  const handleAddToWishlist = async (product: SearchResult) => {
    try {
      await addToWishlist({
        name: product.name,
        store: product.store,
        price: product.price,
        link: product.link,
      });
      toast.success("Added to wishlist");
    } catch (err: any) {
      toast.error(err.message || "Failed to add to wishlist");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-foreground">Searching across stores...</p>
          <p className="text-sm text-muted-foreground">Scanning Amazon and Flipkart for the best prices</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageSearch className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">No results to show</h2>
            <p className="mb-6 text-muted-foreground">Try searching for a product from the dashboard</p>
            <Button variant="hero" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8 flex flex-col items-center gap-4">
          <SearchBar
            onSearch={handleSearch}
            loading={loading}
            placeholder="Search for another product..."
          />
        </div>

        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Results for "<span className="text-primary">{results.query}</span>"
            </h1>
            <p className="text-sm text-muted-foreground">
              {results.total} listing{results.total !== 1 ? "s" : ""} found across stores - Source: {results.source}
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.results.map((product, i) => (
            <div
              key={`${product.store}-${i}`}
              className="group relative flex flex-col rounded-2xl border-2 border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${storeColors[product.store] || "bg-muted text-muted-foreground"}`}>
                  {product.store}
                </span>
              </div>

              <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-muted/50">
                <PackageSearch className="h-16 w-16 text-muted-foreground/30" />
              </div>

              <h3 className="mb-3 line-clamp-2 flex-1 text-base font-semibold leading-snug text-foreground">
                {product.name}
              </h3>

              <p className="mb-4 text-2xl font-bold text-foreground">
                Rs {product.price.toLocaleString("en-IN")}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="hero"
                  className="w-full gap-2 rounded-xl"
                  onClick={() => handleViewDeals(product)}
                >
                  <Eye className="h-4 w-4" />
                  Compare
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl"
                  onClick={() => handleAddToWishlist(product)}
                >
                  <Heart className="h-4 w-4" />
                  Wishlist
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
