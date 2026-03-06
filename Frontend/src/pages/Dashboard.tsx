import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSearch } from "@/contexts/SearchContext";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { BarChart3, Search, Loader2, TrendingDown, Clock, ShoppingBag } from "lucide-react";

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { performSearch, loading, searched } = useSearch();

  const handleSearch = async (query: string) => {
    try {
      await performSearch(query);
      navigate(`/results?q=${encodeURIComponent(query)}`);
    } catch (err: any) {
      toast.error(err.message || "Search failed");
    }
  };

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !searched) handleSearch(q);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Search & compare prices across stores</p>
            </div>
          </div>
          <SearchBar onSearch={handleSearch} loading={loading} placeholder="Search for any product — e.g. 'iPhone 15', 'Nike Air Max'..." />
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium text-foreground">Searching across stores...</p>
            <p className="text-sm text-muted-foreground">This may take a moment while we scan Amazon & Flipkart</p>
          </div>
        )}

        {!loading && !searched && (
          <div className="mx-auto max-w-3xl">
            {/* Quick tips */}
            <div className="mb-10 flex flex-col items-center justify-center py-10 text-center">
              <Search className="mb-4 h-20 w-20 text-muted-foreground/20" />
              <h2 className="mb-2 text-2xl font-bold text-foreground">What are you looking for?</h2>
              <p className="mb-8 max-w-md text-muted-foreground">
                Enter a product name above to compare prices across Amazon & Flipkart instantly
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                { icon: Search, title: "Search", desc: "Type any product name to start comparing" },
                { icon: TrendingDown, title: "Compare", desc: "See prices from Amazon & Flipkart side by side" },
                { icon: ShoppingBag, title: "Save", desc: "Click the best deal to buy at the lowest price" },
              ].map((step, i) => (
                <div key={step.title} className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-card">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {i + 1}
                  </div>
                  <step.icon className="mb-2 h-6 w-6 text-primary" />
                  <h3 className="mb-1 font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
