import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import { ShieldCheck, TrendingDown, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const features = [
  { icon: TrendingDown, title: "Best Prices", desc: "Compare prices across Amazon & Flipkart instantly" },
  { icon: Zap, title: "AI-Powered", desc: "Smart scraping finds the latest deals in real-time" },
  { icon: ShieldCheck, title: "Trusted Results", desc: "Direct links to verified product listings" },
];

const Landing = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    if (!isLoggedIn) {
      toast.error("Please login to search and compare products.");
      return;
    }
    navigate(`/dashboard?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="container relative mx-auto flex flex-col items-center px-4 py-24 text-center md:py-32">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="h-4 w-4" /> Smart Price Comparison
          </div>
          <h1 className="mb-6 max-w-3xl text-4xl font-bold tracking-tight text-secondary-foreground md:text-6xl">
            Find the <span className="text-primary">Best Deals</span> Across Marketplaces
          </h1>
          <p className="mb-10 max-w-xl text-lg text-secondary-foreground/70">
            Sanchay AI compares prices across Amazon and Flipkart so you never overpay. Search, compare, and save.
          </p>
          <SearchBar onSearch={handleSearch} placeholder="Try 'iPhone 15' or 'Samsung Galaxy S24'..." />
          {!isLoggedIn && (
            <p className="mt-4 text-sm text-secondary-foreground/50">
              <button onClick={() => navigate("/login")} className="text-primary underline underline-offset-2 hover:opacity-80">
                Login
              </button>{" "}
              to unlock search & comparison features
            </p>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground">Why Sanchay AI?</h2>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-border bg-card p-8 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="mx-auto max-w-2xl rounded-3xl gradient-hero p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-secondary-foreground">Ready to Save?</h2>
          <p className="mb-8 text-secondary-foreground/70">Create a free account and start comparing prices today.</p>
          <Button variant="hero" size="lg" className="gap-2 rounded-xl" onClick={() => navigate("/register")}>
            Get Started <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 Sanchay AI. Built for smart shoppers.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
