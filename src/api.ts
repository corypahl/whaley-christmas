import type { ListResponse, WishItem } from "./types";

const API_ROOT = "/whaley-christmas/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong");
  return data as T;
}

export const api = {
  getList: (slug: string) => request<ListResponse>(`/lists/${slug}`),
  addItem: (slug: string, item: Partial<WishItem>) =>
    request<{ item: WishItem }>(`/lists/${slug}/items`, { method: "POST", body: JSON.stringify(item) }),
  updateItem: (slug: string, id: string, item: Partial<WishItem>) =>
    request<{ item: WishItem }>(`/lists/${slug}/items/${id}`, { method: "PATCH", body: JSON.stringify(item) }),
  deleteItem: (slug: string, id: string) =>
    request<{ ok: true }>(`/lists/${slug}/items/${id}`, { method: "DELETE" }),
  importAmazon: (slug: string, url: string) =>
    request<{ imported: number; updated: number; message: string }>(`/lists/${slug}/amazon`, {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  removeAmazon: (slug: string) =>
    request<{ ok: true }>(`/lists/${slug}/amazon`, { method: "DELETE" }),
};
