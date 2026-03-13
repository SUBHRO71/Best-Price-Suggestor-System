const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "http://localhost:5000/api";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function getTokens(): AuthTokens | null {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

function setTokens(tokens: AuthTokens) {
  localStorage.setItem("accessToken", tokens.accessToken);
  localStorage.setItem("refreshToken", tokens.refreshToken);
}

function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens?.refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const tokens = getTokens();
  if (!tokens) throw new Error("Not authenticated");

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${tokens.accessToken}`);
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) throw new Error("Session expired");
    headers.set("Authorization", `Bearer ${newToken}`);
    res = await fetch(url, { ...options, headers });
  }

  return res;
}

async function parseApiError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.message || data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function register(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || "Registration failed");
  return data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || "Login failed");
  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export function logout() {
  clearTokens();
}

export function getUser() {
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

export function isAuthenticated() {
  return !!getTokens();
}

export interface SearchResult {
  productId?: string | null;
  store?: string | null;
  name: string;
  price: number;
  link: string | null;
  scrapedAt: string;
}

export interface SearchResponse {
  source: string;
  query: string;
  total: number;
  bestDeal: SearchResult | null;
  results: SearchResult[];
}

export interface WishlistItem {
  _id: string;
  user_id: string;
  product_id:
    | string
    | {
        _id: string;
        name: string;
        normalized_name: string;
        links?: { store: string; url: string }[];
      };
  product_name: string;
  store: string;
  price?: number;
  product_url?: string;
  added_at: string;
}

export interface WishlistResponse {
  total: number;
  results: WishlistItem[];
}

export async function searchProducts(query: string): Promise<SearchResponse> {
  const res = await authFetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(await parseApiError(res, "Search failed"));
  const data = await res.json();
  return data;
}

export async function compareProducts(query: string, contextQuery?: string): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (contextQuery?.trim()) {
    params.set("context", contextQuery.trim());
  }

  const res = await authFetch(`${API_BASE}/compare?${params.toString()}`);
  if (!res.ok) throw new Error(await parseApiError(res, "Comparison failed"));
  const data = await res.json();
  return data;
}

export async function getWishlist(): Promise<WishlistResponse> {
  const res = await authFetch(`${API_BASE}/wishlist`);
  if (!res.ok) throw new Error(await parseApiError(res, "Failed to load wishlist"));
  const data = await res.json();
  return data;
}

export async function addToWishlist(payload: {
  productId?: string;
  name: string;
  store?: string;
  price?: number;
  link?: string | null;
}): Promise<WishlistItem> {
  const res = await authFetch(`${API_BASE}/wishlist`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseApiError(res, "Failed to add product to wishlist"));
  const data = await res.json();
  return data.item;
}

export async function removeWishlistItem(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/wishlist/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseApiError(res, "Failed to remove wishlist item"));
}
