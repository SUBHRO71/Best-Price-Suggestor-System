import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
}

const SearchBar = ({ onSearch, disabled, placeholder = "Search for products...", loading }: SearchBarProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-12 pl-11 text-base rounded-xl border-2 border-border focus:border-primary bg-card"
        />
      </div>
      <Button type="submit" variant="hero" size="lg" disabled={disabled || !query.trim() || loading} className="h-12 rounded-xl px-6">
        {loading ? "Searching..." : "Search"}
      </Button>
    </form>
  );
};

export default SearchBar;
