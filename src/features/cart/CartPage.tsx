import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Chip, LinkButton, Meter, Swatch, useDismiss } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { summarizeCart, useApp, type CartIssue, type StoreGroup } from '../../store/AppStore';
import { getProduct, LIVE, priceBreakdown } from '../../lib/api';
import { useCatalog } from '../../lib/useCatalog';
import { money, plain, plural } from '../../lib/format';
import { products, stores } from '../../data/sample';
import { DealsModal } from './DealsModal';
import { GiftMessageModal } from './GiftMessageModal';
import { CheckoutModal } from '../checkout/CheckoutModal';
import './cart.css';

const ISSUES: CartIssue[] = ['price-changed', 'code-expired', 'out-of-stock', 'delivery-miss'];

/**
 * Cart (09). Problem states (09c1–09c4) come from the store re-check; in sample mode
 * they are simulated with ?issue=price-changed|code-expired|out-of-stock|delivery-miss.
 */
export function CartPage({ saved: savedView }: { saved?: boolean }) {
  const { cart, saved, occasion, person } = useApp();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const issue = (ISSUES.includes(params.get('issue') as CartIssue) ? params.get('issue') : null) as CartIssue;
  const s = summarizeCart(cart, issue);
  const listSavings = s.discounts;
  const [deals, setDeals] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const checkout = params.get('checkout') === '1';
  const setParam = (k: string, v: string | null) => { const n = new URLSearchParams(params); if (v === null) n.delete(k); else n.set(k, v); setParams(n); };

  // Budget per person · occasion
  const whoFor = [...new Map(cart.map((c) => [`${c.personId}|${c.occasionId}`, c])).values()].map((c) => {
    const occ = occasion(c.occasionId);
    const budget = occ.people.find((p) => p.personId === c.personId)?.budget ?? 0;
    const spent = s.groups.flatMap((g) => g.items).filter((i) => i.personId === c.personId && i.occasionId === c.occasionId && !i.unavailable).reduce((t, i) => t + i.price * i.qty, 0);
    return { key: c.id, label: `${person(c.personId).name} · ${occ.shortName === 'birthday' ? 'Birthday' : occ.shortName}`, spent, budget };
  });

  return (
    <div className="cart-page">
      <div className="cart-main">
        <h1 className="page-title" style={{ fontSize: 22 }}>Cart</h1>
        <div className="row gap-8">
          <Chip on={!savedView} onClick={() => navigate('/cart')}>In cart · {cart.length}{!savedView ? ' ✓' : ''}</Chip>
          <Chip on={savedView} onClick={() => navigate('/cart/saved')}>Saved for later · {saved.length}{savedView ? ' ✓' : ''}</Chip>
          <span className="spacer" />
          {savedView ? <span className="t-11 w-700">Not part of your total or checkout</span> : (
            <span className="t-11 w-700">Last checked 14 min ago · <button type="button" className="link-btn t-11">Refresh prices</button></span>
          )}
        </div>

        {savedView ? <SavedList /> : (
          <>
            <div className="save-banner">
              <span className="t-12 w-700">5 ways to save on this cart</span>
              <span className="t-12 muted">Codes, sales, price watch and buy-by timing</span>
              <span className="spacer" />
              <Link to="/cart/savings" className="t-12 w-700 underline">Savings &amp; timing →</Link>
            </div>
            {issue && <IssueNotice issue={issue} onResolve={() => setParam('issue', null)} />}
            {s.groups.map((g) => (
              <StoreCard key={g.store} g={g} total={s.groups.length} issue={issue} onDeals={() => setDeals(g.store)} onMessage={setMessage} />
            ))}
            {!cart.length && (
              <div className="card card--dashed card--pad col gap-8" style={{ alignItems: 'flex-start' }}>
                <div className="t-14 w-700">Your cart is empty</div>
                <div className="t-12 muted">Add gifts from a list. They are grouped by store here, one checkout step per store.</div>
                <Button variant="primary" onClick={() => navigate('/lists')}>Go to gift lists</Button>
              </div>
            )}
          </>
        )}
      </div>

      <aside className="cart-side">
        <section className="card" style={{ padding: 14 }}>
          <h2 className="t-14 w-700" style={{ marginBottom: 10 }}>Order summary</h2>
          {savedView ? (
            <div className="col gap-10">
              <p className="t-12">{plural(cart.length, 'item')} in cart. Saved items are not included.</p>
              <Button variant="primary" block onClick={() => navigate('/cart?checkout=1')}>Check out ({plural(s.count, 'item')})</Button>
            </div>
          ) : (
            <div className="col gap-6">
              <div className="kv"><span>Items</span><span>{money(s.items)}</span></div>
              <div className="kv"><span>Discounts</span><span>{money(-s.discounts)}</span></div>
              <div className="kv"><span>Shipping &amp; tax</span><span>{money(s.shippingTax)}{s.atCheckout ? ' + at checkout' : ''}</span></div>
              <hr className="divider" style={{ margin: '4px 0' }} />
              <div className="kv w-700"><span>Total</span><span>{money(s.total)}</span></div>
              {listSavings > 0 && <div className="save-pill">You save {money(listSavings)} vs list price</div>}
            </div>
          )}
        </section>
        {!savedView && whoFor.length > 0 && (
          <section className="card col gap-6" style={{ padding: 12 }}>
            <h2 className="t-13 w-700">Who it is for</h2>
            {whoFor.map((w) => (
              <div key={w.key} className="col gap-6">
                <div className="kv"><span className="w-700">{w.label}</span><span>{money(w.spent)} of {plain(w.budget)}</span></div>
                <Meter value={w.spent / (w.budget || 1)} dark boxed />
                {w.spent > w.budget && <div className="over-pill">Over budget by {money(w.spent - w.budget)}</div>}
              </div>
            ))}
          </section>
        )}
      </aside>

      {!savedView && cart.length > 0 && (
        <div className="checkout-bar">
          <span className="t-11">{plural(s.count, 'item')} · Order total</span>
          <span className="t-16 w-700">{money(s.total)}</span>
          {listSavings > 0 && <span className="pill">You save {money(listSavings)}</span>}
          <Button variant="primary" size="lg" onClick={() => setParam('checkout', '1')}>Check out ({plural(s.count, 'item')})</Button>
        </div>
      )}

      {deals && <DealsModal store={deals} groups={s.groups} onStore={setDeals} onClose={() => setDeals(null)} />}
      {message && <GiftMessageModal cartId={message} onClose={() => setMessage(null)} />}
      {checkout && <CheckoutModal groups={s.groups.filter((g) => g.items.some((i) => !i.unavailable))} onClose={() => setParam('checkout', null)} />}
    </div>
  );
}

function IssueNotice({ issue, onResolve }: { issue: Exclude<CartIssue, null>; onResolve: () => void }) {
  const navigate = useNavigate();
  const copy = {
    'price-changed': { title: 'Price changed since you added it', body: "Wide Desk Mat went from CA$ 45.00 to CA$ 52.00 at Hartwell Home. Sam's budget is now over by CA$ 12.00.", actions: ['Keep in cart', 'See alternatives', 'Remove'], primary: -1 },
    'code-expired': { title: 'A code is no longer valid', body: 'WELCOME10 expired on Nov 14 (message from the store). Your Hartwell Home total went up by CA$ 13.40.', actions: ['Remove code', 'Try another code'], primary: -1 },
    'out-of-stock': { title: 'Botanical Tea & Honey Set is unavailable at Northfield Goods', body: 'We can look for the same item at another store or suggest similar ideas for Mom. It is not included in your total or checkout.', actions: ['Find same item elsewhere', 'Ideas for Mom', 'Remove'], primary: 0 },
    'delivery-miss': { title: 'Delivery will miss your date', body: 'Hartwell Home standard shipping now arrives Dec 26, after Christmas. Express arrives Dec 22 for CA$ 14.00 more.', actions: ['Choose express', 'Keep standard', 'Move to a later occasion'], primary: 0 },
  }[issue];
  return (
    <div className="issue" role="alert">
      <Icon name="alert" size={16} stroke={2.2} />
      <div className="col gap-4 flex1">
        <div className="t-13 w-700">{copy.title}</div>
        <div className="t-12">{copy.body}</div>
        <div className="row gap-10 wrap" style={{ marginTop: 6 }}>
          {copy.actions.map((a, i) => (
            <Button key={a} variant={i === copy.primary ? 'primary' : 'outline'} onClick={() => (a.startsWith('Ideas') ? navigate('/lists/moms-birthday/mom') : onResolve())}>{a}</Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StoreCard({ g, total, issue, onDeals, onMessage }: { g: StoreGroup; total: number; issue: CartIssue; onDeals: () => void; onMessage: (id: string) => void }) {
  const { occasion, person, removeFromCart, saveForLater } = useApp();
  const navigate = useNavigate();
  const [breakdown, setBreakdown] = useState<string | null>(issue === null ? null : null);
  const st = stores[g.store];
  const allOut = g.items.every((i) => i.unavailable);
  const late = issue === 'delivery-miss' && g.store === 'Hartwell Home';
  const shipLine = allOut ? 'Nothing to ship from this store right now' : g.atCheckout ? `Shipping options and delivery dates are confirmed at ${g.store} checkout` : late ? 'Arrives Dec 26 (standard) · Express arrives Dec 22 for +CA$ 14.00' : `${st?.shippingNote ?? ''} · ${st?.orderBy ?? ''}`;
  return (
    <section className="card store-card" aria-label={g.store}>
      <div className="row gap-10">
        <h2 className="t-16 w-600" style={{ fontFamily: 'var(--font-sans)' }}>{g.store}</h2>
        <span className="t-11">Checkout step {g.step} of {total}</span>
      </div>
      <div className="t-11">{shipLine}</div>
      {g.items.map((i) => {
        const p = getProduct(i.productId);
        const occ = occasion(i.occasionId);
        const changed = issue === 'price-changed' && i.productId === 'deskmat';
        const why = changed ? 'Price up from CA$ 45.00 since you added it' : i.why;
        return (
          <div key={i.id} className={`cart-item${changed ? ' is-flagged' : ''}`}>
            <Swatch tint={p.tint} size={56} image={p.live ? p.image : undefined} alt="" />
            <div className="flex1 col gap-4" style={{ position: 'relative' }}>
              <div className="row gap-10">
                <span className="t-15 w-600">{p.name}</span>
                {!i.unavailable && <span className="t-11">Qty {i.qty} ▾</span>}
              </div>
              <div className="row gap-6">
                <span className="pill pill--dark">for {person(i.personId).name} · {occ.name}</span>
                {!i.unavailable && <button type="button" className="link-btn t-11">Change ▾</button>}
              </div>
              {i.unavailable ? (
                <>
                  <div className="pill" style={{ borderRadius: 8, width: '100%', fontSize: 10, border: '1px solid var(--line-chip)' }}>Unavailable at this store</div>
                  <div className="row gap-8" style={{ marginTop: 4 }}>
                    <Button variant="primary">Find same item elsewhere</Button>
                    <Button onClick={() => navigate(`/lists/${i.occasionId}/${i.personId}`)}>Ideas for {person(i.personId).name}</Button>
                    <LinkButton className="t-11" onClick={() => removeFromCart(i.id)}>Remove</LinkButton>
                  </div>
                </>
              ) : (
                <>
                  <div className="row-base gap-8">
                    {i.listPrice > i.price && <span className="t-12 muted strike">{money(i.listPrice, { currency: p.currency })}</span>}
                    <span className="t-15 w-700">{money(i.price, { currency: p.currency })}</span>
                    {i.listPrice > i.price && <span className="pill pill--outline" style={{ padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>Sale −{Math.round((1 - i.price / i.listPrice) * 100)}%</span>}
                  </div>
                  <button type="button" className="link-btn t-11" style={{ alignSelf: 'flex-start' }} onClick={() => onMessage(i.id)}>
                    {i.giftMessage ? 'Gift options · message added' : 'Gift options'}
                  </button>
                  {why && <div className="t-10 muted">Why: {why}</div>}
                </>
              )}
              {breakdown === i.id && <Breakdown cartId={i.id} store={g} onClose={() => setBreakdown(null)} />}
            </div>
            {!i.unavailable && (
              <ItemMenu
                onBreakdown={() => setBreakdown(i.id)}
                onMessage={() => onMessage(i.id)}
                onSave={() => saveForLater(i.id)}
                onRemove={() => removeFromCart(i.id)}
              />
            )}
          </div>
        );
      })}
      <div className="row gap-8 store-card__codes">
        <span className="t-11 w-700">Codes &amp; deals</span>
        {g.code ? (g.codeExpired ? (
          <><span className="pill" style={{ fontSize: 10 }}>{g.code} expired</span><span className="t-11 w-600">Not applied. Expired Nov 14.</span></>
        ) : (
          <><span className="pill pill--outline" style={{ padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>{g.code} applied</span><span className="pill" style={{ fontSize: 10 }}>Auto-applied by store</span><LinkButton className="t-11">Remove</LinkButton></>
        )) : <span className="t-11">No codes or sales found for this store</span>}
        <span className="spacer" />
        <Button onClick={onDeals}>Add code or deal</Button>
      </div>
      {g.freeShippingAway !== undefined && !allOut && <div className="t-11">{money(g.freeShippingAway)} from free shipping at this store</div>}
      <hr className="divider" />
      <div className="col gap-4">
        {g.discounts > 0 && <div className="kv"><span>Discounts</span><span>{money(-g.discounts)}</span></div>}
        <div className="kv"><span>Shipping &amp; tax</span><span>{g.atCheckout ? 'At checkout' : money(g.shippingTax)}</span></div>
      </div>
      <hr className="divider" />
      <div className="col gap-2">
        <div className="kv w-700"><span>Store total</span><span>{money(g.total)}</span></div>
        <button type="button" className="link-btn t-11" style={{ alignSelf: 'flex-start' }} onClick={() => setBreakdown(g.items[0]?.id ?? null)}>See breakdown</button>
      </div>
    </section>
  );
}

function ItemMenu({ onBreakdown, onMessage, onSave, onRemove }: { onBreakdown: () => void; onMessage: () => void; onSave: () => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const run = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <div ref={ref} style={{ position: 'relative', alignSelf: 'flex-start' }}>
      <button type="button" className="dots" aria-label="Item actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>⋯</button>
      {open && (
        <div className="menu" role="menu" style={{ right: 0, top: 32 }}>
          <button role="menuitem" type="button" className="menu__item" onClick={run(onBreakdown)}>Price breakdown</button>
          <button role="menuitem" type="button" className="menu__item" onClick={run(onMessage)}>Gift message</button>
          <button role="menuitem" type="button" className="menu__item" onClick={run(onSave)}>Save for later</button>
          <button role="menuitem" type="button" className="menu__item menu__item--strong menu__item--divided" onClick={run(onRemove)}>Remove from cart</button>
        </div>
      )}
    </div>
  );
}

/** Per-item price breakdown popover (09c5). */
function Breakdown({ cartId, store, onClose }: { cartId: string; store: StoreGroup; onClose: () => void }) {
  const item = store.items.find((i) => i.id === cartId)!;
  const p = getProduct(item.productId);
  const storeItems = store.items.reduce((t, i) => t + i.price * i.qty, 0);
  const share = store.code && !store.codeExpired ? Math.round(((item.price / storeItems) * 13.4 + Number.EPSILON) * 100) / 100 : 0;
  const b = priceBreakdown({ ...p, price: item.price }, share);
  const ref = useDismiss(true, onClose);
  return (
    <div ref={ref} className="popover" role="dialog" aria-label={`${p.name} price breakdown`}>
      <div className="row"><span className="t-13 w-700">{p.name} · price breakdown</span><span className="spacer" /><LinkButton className="t-11" onClick={onClose}>Close ×</LinkButton></div>
      <div className="kv"><span>List price (store compare-at)</span><span>{money(b.list)}</span></div>
      {b.sale > 0 && <div className="kv"><span>Store sale</span><span>{money(-b.sale)}</span></div>}
      <hr className="divider" />
      <div className="kv w-700"><span>Price shown in catalog</span><span>{money(b.catalog)}</span></div>
      {b.code > 0 && <div className="kv"><span>Code {store.code} (10% of the order, this item's share)</span><span>{money(-b.code)}</span></div>}
      <hr className="divider" />
      <div className="kv w-700"><span>Item after code</span><span>{money(b.afterCode)}</span></div>
      <div className="t-10 muted">Source: store catalog (price and compare-at price) and store checkout (codes, shipping). Checked 14 min ago. The store confirms the final amount.</div>
    </div>
  );
}

function SavedList() {
  const { saved, moveSavedToCart, removeSaved, occasion, person, addToCart, isInCart } = useApp();
  const navigate = useNavigate();
  const first = saved[0];
  const who = first ? person(first.personId) : null;
  const live = useCatalog(LIVE && who ? { query: `${who.interests[0] ?? 'thoughtful'} gift`, type: 'giftsets', limit: 8 } : null);
  const ideas = (LIVE ? live.products : products)
    .filter((p) => !saved.some((s) => s.productId === p.id) && !(first && isInCart(p.id, first.personId, first.occasionId)))
    .slice(LIVE ? 0 : 4, LIVE ? 3 : 7);
  return (
    <>
      <section className="card store-card" aria-label="Saved for later">
        <h2 className="t-15 w-700" style={{ paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>Saved for later</h2>
        {saved.map((s) => {
          const p = getProduct(s.productId);
          return (
            <div key={s.id} className="row gap-12" style={{ alignItems: 'flex-start' }}>
              <Swatch tint={p.tint} size={56} image={p.live ? p.image : undefined} alt="" />
              <div className="flex1 col gap-4">
                <span className="t-15 w-600">{p.name}</span>
                <span className="pill pill--dark">for {person(s.personId).name} · {occasion(s.occasionId).name}</span>
                <span className="t-14 w-600">{money(p.price)}</span>
                <span className="t-10">{p.store} · {s.savedAgo}</span>
              </div>
              <div className="col gap-6">
                <Button variant="primary" size="md" onClick={() => moveSavedToCart(s.id)}>Move to cart</Button>
                <LinkButton className="t-11" style={{ alignSelf: 'flex-start' }} onClick={() => removeSaved(s.id)}>Remove</LinkButton>
              </div>
            </div>
          );
        })}
        {!saved.length && <p className="t-12 muted">Nothing saved. Use "Save for later" on a cart item to park it here.</p>}
        {saved.length > 0 && <p className="t-11">Price watch is on. We will tell you if it drops.</p>}
      </section>
      {first && (
        <section className="card card--dashed store-card" aria-label={`More ideas for ${person(first.personId).name}`}>
          <div className="row">
            <h2 className="t-14 w-700">More ideas for {person(first.personId).name}</h2>
            <span className="spacer" />
            <button type="button" className="link-btn" onClick={() => navigate(`/lists/${first.occasionId}/${first.personId}`)}>Open workspace →</button>
          </div>
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {ideas.map((p) => (
              <div key={p.id} className="pcard" style={{ borderRadius: 12 }}>
                <span style={{ height: 70, background: p.image ? `url("${p.image}") center/cover, var(--${p.tint})` : `var(--${p.tint})` }} />
                <div className="col gap-2" style={{ padding: 8, flex: 1 }}>
                  <span className="t-11 w-700" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</span>
                  <span className="t-11">{money(p.price, { currency: p.currency })}</span>
                  <Button variant="primary" size="sm" block style={{ marginTop: 'auto', minHeight: 28 }}
                    onClick={() => (p.live ? addToCart(p.id, first.personId, first.occasionId) : navigate(`/lists/${first.occasionId}/${first.personId}?product=${p.id}`))}>Add</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
