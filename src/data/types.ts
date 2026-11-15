export type Tint = 'peach' | 'butter' | 'blush' | 'sky' | 'sage';

export type Relationship = 'Parent' | 'Partner' | 'Child' | 'Friend' | 'Colleague' | 'Sibling' | 'Other';

export interface PastGift {
  id: string;
  name: string;
  occasion: string;
  store: string;
  price: number;
  note: string;
  reaction: 'Loved' | 'Liked' | 'Meh';
  tint: Tint;
}

export interface Person {
  id: string;
  name: string;
  initial: string;
  relationship: Relationship;
  pronoun: 'he' | 'she' | 'they';
  summary: string; // one-line profile under the list header
  interests: string[];
  avoids: string[];
  owns: string[];
  sizes: { shirt?: string; shoe?: string; phone?: string };
  style: 'Practical' | 'Sentimental' | 'Luxe';
  usualSpend: string;
  stores: string[];
  history: PastGift[];
}

export interface Occasion {
  id: string;
  name: string;
  shortName: string; // "Christmas", "birthday"
  date: string; // ISO
  budget: number;
  /** per-person budget for this occasion */
  people: { personId: string; budget: number }[];
  reminderOnly?: boolean;
}

export type ProductTypeId = 'brewing' | 'giftsets' | 'accessories' | 'beans' | 'books' | 'experiences';

export interface ProductType {
  id: ProductTypeId;
  name: string;
  tint: Tint;
  narrow: string[];
}

export interface Product {
  id: string;
  name: string;
  store: string;
  maker?: string;
  price: number;
  listPrice?: number;
  blurb: string;
  type: ProductTypeId;
  tint: Tint;
  expert?: { score: number; sources: number };
  customer?: { rating: number; count: string };
  arrives: string;
  variants?: string[];
  image?: string;
}

export type ShortlistStatus = 'Selected' | 'Considering';

export interface ShortlistItem {
  productId: string;
  personId: string;
  occasionId: string;
  status: ShortlistStatus;
  variant?: string;
  addedAt: number;
}

export interface CartItem {
  id: string;
  productId: string;
  personId: string;
  occasionId: string;
  qty: number;
  why?: string;
  giftMessage?: string;
}

export interface SavedItem {
  id: string;
  productId: string;
  personId: string;
  occasionId: string;
  savedAgo: string;
}

export interface Store {
  name: string;
  shippingNote: string;
  orderBy: string;
  arrives: string;
}

export type PurchaseStatus = 'Processing' | 'Shipped' | 'Delivered';

export interface Purchase {
  id: string;
  item: string;
  personId: string;
  occasionLabel: string;
  occasionId?: string;
  store: string;
  date: string;
  price: number;
  status: PurchaseStatus;
  arrives: string;
  tint: Tint;
  details?: {
    shipTo: string;
    carrier: string;
    lastUpdate: string;
    order: string;
    returns: string;
    gift: string;
  };
}
