import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { searchProducts, type SearchResponse, type SearchResult } from "@/lib/api";

interface SearchContextType {
  results: SearchResponse | null;
  loading: boolean;
  searched: boolean;
  selectedProduct: SearchResult | null;
  performSearch: (query: string) => Promise<SearchResponse | null>;
  selectProduct: (product: SearchResult) => void;
  clearResults: () => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SearchResult | null>(null);

  const performSearch = useCallback(async (query: string) => {
    setLoading(true);
    setSearched(true);
    setSelectedProduct(null);
    try {
      const data = await searchProducts(query);
      setResults(data);
      return data;
    } catch (err) {
      setResults(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectProduct = useCallback((product: SearchResult) => {
    setSelectedProduct(product);
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setSearched(false);
    setSelectedProduct(null);
  }, []);

  return (
    <SearchContext.Provider value={{ results, loading, searched, selectedProduct, performSearch, selectProduct, clearResults }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
