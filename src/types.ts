export type WishItem = {
  id: string;
  person_slug: string;
  title: string | null;
  details: string | null;
  url: string | null;
  price: string | null;
  source: "manual" | "amazon";
  created_at: string;
  updated_at: string;
};

export type AmazonSource = {
  url: string;
  last_synced_at: string | null;
  last_error: string | null;
};

export type ListResponse = { items: WishItem[]; amazonSource: AmazonSource | null };
