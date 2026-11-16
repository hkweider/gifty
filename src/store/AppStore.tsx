import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  initialCart, initialSaved, initialShortlist, occasions as seedOccasions, people as seedPeople,
  purchases as seedPurchases, storeQuotes,
} from '../data/sample';
import type { CartItem, Occasion, Person, Purchase, SavedItem, ShortlistItem, ShortlistStatus } from '../data/types';
import { getProduct, LIVE, rememberProducts } from '../lib/api';
import type { Product } from '../data/types';

export type ModalKind =
  | { kind: 'addPerson'; personName?: string }
  | { kind: 'newOccasion'; personId?: string }
  | null;

export interface Toast { message: string; actions?: { label: string; onClick: () => void }[]; compact?: boolean }

interface Ctx {
  people: Person[];
  occasions: Occasion[];
  shortlist: ShortlistItem[];
  cart: CartItem[];
  saved: SavedItem[];
  purchases: Purchase[];
  modal: ModalKind;
  toast: Toast | null;
  openModal: (m: ModalKind) => void;
  showToast: (t: Toast | null) => void;
  person: (id: string) => Person;
  occasion: (id: string) => Occasion;
  isShortlisted: (productId: string, personId: string, occasionId: string) => boolean;
  toggleShortlist: (productId: string, personId: string, occasionId: string, variant?: string) => void;
  removeShortlist: (productId: string, personId: string, occasionId: string) => void;
  moveShortlist: (productId: string, from: { personId: string; occasionId: string }, to: { personId: string; occasionId: string }, keepCopy: boolean) => void;
  setShortlistStatus: (productId: string, personId: string, occasionId: string, status: ShortlistStatus) => void;
  isInCart: (productId: string, personId: string, occasionId: string) => boolean;
  addToCart: (productId: string, personId: string, occasionId: string, variant?: CartItem['variant']) => void;
  removeFromCart: (cartId: string) => void;
  saveForLater: (cartId: string) => void;
  moveSavedToCart: (savedId: string) => void;
  removeSaved: (savedId: string) => void;
  setGiftMessage: (cartId: string, msg: string) => void;
  markStorePurchased: (store: string) => void;
  addPerson: (p: Partial<Person> & { name: string }, occasionId?: string, budget?: number) => Person;
  removePerson: (personId: string) => void;
  addOccasion: (o: Omit<Occasion, 'id'>) => Occasion;
}

const AppContext = createContext<Ctx | null>(null);

const STORE_KEY = 'gifty:v2'; // bump when the seed data changes, so saved demos start fresh
interface Stored { people: Person[]; occasions: Occasion[]; shortlist: ShortlistItem[]; cart: CartItem[]; saved: SavedItem[]; purchases: Purchase[]; products: Product[] }
function loadStored(): Stored | null {
  if (!LIVE) return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Stored;
    rememberProducts(d.products ?? []);
    return d;
  } catch { return null; }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const same = (a: { productId: string; personId: string; occasionId: string }, productId: string, personId: string, occasionId: string) =>
  a.productId === productId && a.personId === personId && a.occasionId === occasionId;

export function AppProvider({ children }: { children: ReactNode }) {
  const [stored] = useState(loadStored);
  const [people, setPeople] = useState(stored?.people ?? seedPeople);
  const [occasions, setOccasions] = useState(stored?.occasions ?? seedOccasions);
  // Live mode starts with empty lists and cart: only real products you add appear.
  const [shortlist, setShortlist] = useState(stored?.shortlist ?? (LIVE ? [] : initialShortlist));
  const [cart, setCart] = useState(stored?.cart ?? (LIVE ? [] : initialCart));
  const [saved, setSaved] = useState(stored?.saved ?? (LIVE ? [] : initialSaved));
  const [purchases, setPurchases] = useState(stored?.purchases ?? seedPurchases);

  // Persist this browser's lists and cart (and the live products they reference).
  useEffect(() => {
    if (!LIVE) return;
    const ids = new Set([...shortlist, ...cart, ...saved].map((x) => x.productId));
    const products = [...ids].map((id) => { try { return getProduct(id); } catch { return null; } }).filter((x): x is Product => !!x?.live);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ people, occasions, shortlist, cart, saved, purchases, products }));
    } catch { /* storage full or blocked: state still works in memory */ }
  }, [people, occasions, shortlist, cart, saved, purchases]);
  const [modal, openModal] = useState<ModalKind>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number>();

  const showToast = useCallback((t: Toast | null) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    if (t) toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  const person = useCallback((id: string) => people.find((p) => p.id === id)!, [people]);
  const occasion = useCallback((id: string) => occasions.find((o) => o.id === id)!, [occasions]);

  const label = useCallback(
    (personId: string, occasionId: string) => `${person(personId).name} · ${occasion(occasionId).shortName}`,
    [person, occasion],
  );

  const value = useMemo<Ctx>(() => {
    const isShortlisted: Ctx['isShortlisted'] = (pid, per, occ) => shortlist.some((s) => same(s, pid, per, occ));
    const isInCart: Ctx['isInCart'] = (pid, per, occ) => cart.some((c) => same(c, pid, per, occ));

    const removeShortlist: Ctx['removeShortlist'] = (pid, per, occ) => {
      const prev = shortlist;
      const item = shortlist.find((s) => same(s, pid, per, occ));
      setShortlist(prev.filter((s) => !same(s, pid, per, occ)));
      if (item) {
        showToast({
          message: `Removed ${getProduct(pid).name} from ${label(per, occ)}`,
          compact: true,
          actions: [{ label: 'Undo', onClick: () => { setShortlist(prev); showToast(null); } }],
        });
      }
    };

    return {
      people, occasions, shortlist, cart, saved, purchases, modal, toast, openModal, showToast, person, occasion,
      isShortlisted, isInCart,
      toggleShortlist: (pid, per, occ, variant) => {
        if (isShortlisted(pid, per, occ)) {
          removeShortlist(pid, per, occ);
          return;
        }
        const prev = shortlist;
        setShortlist([...prev, { productId: pid, personId: per, occasionId: occ, status: 'Considering', variant, addedAt: Date.now() }]);
        const name = getProduct(pid).name + (variant ? ` · ${variant}` : '');
        showToast({
          message: `Added ${name} to ${label(per, occ)}`,
          actions: [{ label: 'Undo', onClick: () => { setShortlist(prev); showToast(null); } }],
        });
      },
      removeShortlist,
      moveShortlist: (pid, from, to, keepCopy) => {
        setShortlist((list) => {
          const item = list.find((s) => same(s, pid, from.personId, from.occasionId));
          if (!item) return list;
          const rest = keepCopy ? list : list.filter((s) => s !== item);
          if (rest.some((s) => same(s, pid, to.personId, to.occasionId))) return rest;
          return [...rest, { ...item, ...to, addedAt: Date.now() }];
        });
        showToast({ message: `Moved ${getProduct(pid).name} to ${label(to.personId, to.occasionId)}` });
      },
      setShortlistStatus: (pid, per, occ, status) =>
        setShortlist((list) => list.map((s) => (same(s, pid, per, occ) ? { ...s, status } : s))),
      addToCart: (pid, per, occ, variant) => {
        if (isInCart(pid, per, occ)) return;
        setCart((c) => [...c, { id: `c${Date.now()}`, productId: pid, personId: per, occasionId: occ, qty: 1, variant }]);
        showToast({ message: `Added ${getProduct(pid).name}${variant?.title && variant.title !== 'Default Title' ? ` · ${variant.title}` : ''} to your cart for ${label(per, occ)}` });
      },
      removeFromCart: (id) => setCart((c) => c.filter((x) => x.id !== id)),
      saveForLater: (id) => {
        const item = cart.find((c) => c.id === id);
        if (!item) return;
        setCart((c) => c.filter((x) => x.id !== id));
        setSaved((s) => [...s, { id: `s${Date.now()}`, productId: item.productId, personId: item.personId, occasionId: item.occasionId, savedAgo: 'Saved just now' }]);
      },
      moveSavedToCart: (id) => {
        const item = saved.find((s) => s.id === id);
        if (!item) return;
        setSaved((s) => s.filter((x) => x.id !== id));
        setCart((c) => [...c, { id: `c${Date.now()}`, productId: item.productId, personId: item.personId, occasionId: item.occasionId, qty: 1 }]);
      },
      removeSaved: (id) => setSaved((s) => s.filter((x) => x.id !== id)),
      setGiftMessage: (id, msg) => setCart((c) => c.map((x) => (x.id === id ? { ...x, giftMessage: msg } : x))),
      markStorePurchased: (store) => {
        const bought = cart.filter((c) => getProduct(c.productId).store === store);
        setCart((c) => c.filter((x) => !bought.includes(x)));
        setPurchases((p) => [
          ...bought.map<Purchase>((c) => {
            const prod = getProduct(c.productId);
            return {
              id: `p${c.id}`, item: prod.name, personId: c.personId, occasionLabel: occasion(c.occasionId).shortName,
              occasionId: c.occasionId, store, date: 'Nov 15', price: prod.price, status: 'Processing', arrives: prod.arrives, tint: prod.tint,
            };
          }),
          ...p,
        ]);
      },
      removePerson: (personId) => {
        // Snapshot for undo, then drop the person and everything that only belonged to them.
        const before = { people, occasions, shortlist, cart, saved, purchases };
        const name = people.find((x) => x.id === personId)?.name ?? 'Person';
        setPeople((x) => x.filter((p) => p.id !== personId));
        setOccasions((os) => os
          .map((o) => ({ ...o, people: o.people.filter((x) => x.personId !== personId) }))
          .filter((o) => o.people.length > 0));
        setShortlist((x) => x.filter((s) => s.personId !== personId));
        setCart((x) => x.filter((c) => c.personId !== personId));
        setSaved((x) => x.filter((s) => s.personId !== personId));
        setPurchases((x) => x.filter((p) => p.personId !== personId));
        showToast({
          message: `Removed ${name}`,
          actions: [{ label: 'Undo', onClick: () => {
            setPeople(before.people); setOccasions(before.occasions); setShortlist(before.shortlist);
            setCart(before.cart); setSaved(before.saved); setPurchases(before.purchases); showToast(null);
          } }],
        });
      },
      addPerson: (p, occasionId, budget) => {
        let id = slug(p.name) || 'person';
        while (people.some((x) => x.id === id)) id += '-2';
        const created: Person = {
          id, name: p.name, initial: p.name.trim()[0]?.toUpperCase() ?? '?', relationship: p.relationship ?? 'Other',
          pronoun: p.pronoun ?? 'they', summary: p.summary ?? '', interests: p.interests ?? [], avoids: p.avoids ?? [],
          owns: p.owns ?? [], sizes: {}, style: 'Practical', usualSpend: '', stores: [], history: [],
        };
        setPeople((x) => [...x, created]);
        if (occasionId) {
          setOccasions((os) => os.map((o) => (o.id === occasionId ? { ...o, people: [...o.people, { personId: id, budget: budget ?? 0 }] } : o)));
        }
        return created;
      },
      addOccasion: (o) => {
        let id = slug(o.name) || 'occasion';
        while (occasions.some((x) => x.id === id)) id += '-2';
        const created = { ...o, id };
        setOccasions((x) => [...x, created].sort((a, b) => a.date.localeCompare(b.date)));
        return created;
      },
    };
  }, [people, occasions, shortlist, cart, saved, purchases, modal, toast, showToast, person, occasion, label]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}

/* ---------- Cart summary (derived) ---------- */

export type CartIssue = 'price-changed' | 'code-expired' | 'out-of-stock' | 'delivery-miss' | null;

export interface StoreGroup {
  store: string;
  step: number;
  items: (CartItem & { price: number; listPrice: number; unavailable?: boolean })[];
  listTotal: number;
  discounts: number;
  shippingTax: number;
  total: number;
  code?: string;
  codeExpired?: boolean;
  freeShippingAway?: number;
  /** Store has no quote (live merchants): shipping and tax are confirmed at its checkout. */
  atCheckout?: boolean;
  /** Merchant domain for live stores (one Shopify cart and checkout step per store). */
  storeDomain?: string;
}

/** Groups the cart by store and applies store quotes. `issue` simulates the 09c problem states. */
export function summarizeCart(cart: CartItem[], issue: CartIssue = null) {
  const byStore = new Map<string, StoreGroup>();
  for (const c of cart) {
    const p = getProduct(c.productId);
    let price = c.variant?.price ?? p.price;
    if (issue === 'price-changed' && c.productId === 'deskmat') price = 52;
    const unavailable = issue === 'out-of-stock' && c.productId === 'tea';
    const g = byStore.get(p.store) ?? {
      store: p.store, step: 0, items: [], listTotal: 0, discounts: 0, shippingTax: 0, total: 0,
    };
    g.items.push({ ...c, price, listPrice: (c.variant ? c.variant.listPrice : p.listPrice) ?? price, unavailable });
    byStore.set(p.store, g);
  }
  const groups = [...byStore.values()];
  groups.forEach((g, i) => {
    g.step = i + 1;
    const q = storeQuotes[g.store] ?? { codeSavings: 0, shippingTax: 0 };
    g.atCheckout = !storeQuotes[g.store];
    g.storeDomain = getProduct(g.items[0].productId).live?.storeDomain;
    const live = g.items.filter((x) => !x.unavailable);
    g.listTotal = live.reduce((s, x) => s + x.listPrice * x.qty, 0);
    const sale = live.reduce((s, x) => s + (x.listPrice - x.price) * x.qty, 0);
    g.code = q.code;
    g.codeExpired = issue === 'code-expired' && !!q.code;
    let codeSavings = q.code && !g.codeExpired ? q.codeSavings : 0;
    let ship = live.length ? q.shippingTax : 0;
    if (issue === 'price-changed' && q.code) { codeSavings = 14.1; ship = 27.79; }
    if (issue === 'code-expired' && q.code) ship = 28.71;
    g.discounts = sale + codeSavings;
    g.shippingTax = ship;
    g.freeShippingAway = q.freeShippingAway !== undefined
      ? Math.max(0, q.freeShippingAway - (issue === 'price-changed' ? 6.3 : issue === 'code-expired' ? 13.4 : 0))
      : undefined;
    g.total = g.listTotal - g.discounts + g.shippingTax;
  });
  const live = groups.flatMap((g) => g.items.filter((x) => !x.unavailable));
  const items = groups.reduce((s, g) => s + g.listTotal, 0);
  const discounts = groups.reduce((s, g) => s + g.discounts, 0);
  const shippingTax = groups.reduce((s, g) => s + g.shippingTax, 0);
  return {
    groups,
    atCheckout: groups.some((g) => g.atCheckout),
    count: live.length,
    items, discounts, shippingTax,
    total: items - discounts + shippingTax,
  };
}
