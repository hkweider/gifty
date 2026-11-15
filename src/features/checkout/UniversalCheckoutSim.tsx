import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, LinkButton, Swatch } from '../../components/ui';
import { useApp, type StoreGroup } from '../../store/AppStore';
import { getProduct } from '../../lib/api';
import { money, plural } from '../../lib/format';
import { USER } from '../../data/sample';
import './universal.css';

/**
 * SIMULATION of Shopify Universal Checkout (early access), following
 * https://shopify.dev/docs/agents/carts-and-checkout/universal-checkout :
 *   1. One cart per merchant (Cart MCP create_cart).
 *   2. create_checkout on the global endpoint with all cart_ids → one combined continue_url.
 *   3. Checkout Kit opens it in a popup; a signed-out buyer signs in with Shop Pay first.
 *   4. The element emits batched events per shop: start → update → complete (or error / ejected),
 *      then close. Gifty keeps the latest state per shop and renders the outcome.
 * Nothing here calls Shopify or takes payment. Replace with the real Checkout Kit element
 * (<shopify-universal-checkout>) once the API key has early access.
 */

type ShopStatus = 'waiting' | 'active' | 'processing' | 'completed';
type Stage = 'creating' | 'signin' | 'checkout' | 'paying' | 'closed';
interface LogEntry { t: string; event: string; detail: string }

const TAX_RATE = 0.13; // Ontario HST, for the simulated estimate only
const SHIPPING = [
  { id: 'standard', label: 'Standard', price: 9.99, eta: '3–6 business days' },
  { id: 'express', label: 'Express', price: 19.99, eta: '1–2 business days' },
];

export function UniversalCheckoutSim({ groups, onClose }: { groups: StoreGroup[]; onClose: () => void }) {
  const { markStorePurchased } = useApp();
  const navigate = useNavigate();
  const [plan] = useState(groups);
  const [stage, setStage] = useState<Stage>('creating');
  const [shops, setShops] = useState<Record<string, ShopStatus>>(() => Object.fromEntries(groups.map((g) => [g.store, 'waiting'])));
  const [shipping, setShipping] = useState<Record<string, string>>(() => Object.fromEntries(groups.map((g) => [g.store, 'standard'])));
  // Event trail kept for debugging the real Checkout Kit wiring later.
  const [, setLog] = useState<LogEntry[]>([]);
  const t0 = useRef(Date.now());
  const emit = (event: string, detail: string) => setLog((l) => [...l, { t: `${((Date.now() - t0.current) / 1000).toFixed(1)}s`, event, detail }]);

  // Step 1–2: carts per merchant, then one combined checkout session.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // run once, even under React StrictMode
    started.current = true;
    emit('create_cart', `${plural(plan.length, 'merchant cart')} created`);
    const id = setTimeout(() => {
      emit('create_checkout', `ucp.status: success · combined continue_url for ${plural(plan.length, 'cart')}`);
      setStage('signin');
    }, 900);
    return () => { if (!started.current) clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shopTotals = (g: StoreGroup) => {
    const items = g.items.filter((i) => !i.unavailable).reduce((t, i) => t + i.price * i.qty, 0);
    const ship = SHIPPING.find((s) => s.id === shipping[g.store])!.price;
    const tax = Math.round((items + ship) * TAX_RATE * 100) / 100;
    return { items, ship, tax, total: items + ship + tax };
  };
  const grand = plan.reduce((t, g) => t + shopTotals(g).total, 0);

  const signIn = () => {
    setStage('checkout');
    setShops(Object.fromEntries(plan.map((g) => [g.store, 'active'])));
    emit('start', plan.map((g) => `${g.store}: active`).join(' · '));
  };

  const pay = () => {
    setStage('paying');
    setShops((s) => Object.fromEntries(Object.keys(s).map((k) => [k, 'processing'])));
    emit('update', plan.map((g) => `${g.store}: processing`).join(' · '));
    // Shops complete independently; one `complete` batch per shop.
    plan.forEach((g, i) => {
      setTimeout(() => {
        setShops((s) => ({ ...s, [g.store]: 'completed' }));
        emit('complete', `${g.store}: completed · order placed`);
        markStorePurchased(g.store);
        if (i === plan.length - 1) setTimeout(() => { setStage('closed'); emit('close', 'presentation closed'); }, 700);
      }, 1200 + i * 900);
    });
  };

  const closeWindow = () => {
    if (stage === 'closed') return;
    emit('close', stage === 'signin' ? 'closed before sign-in · no outcome' : 'closed · nothing paid');
    setStage('closed');
  };

  const completed = plan.filter((g) => shops[g.store] === 'completed');

  return (
    <div className="scrim scrim--main" role="presentation">
      {/* Gifty's own status panel, behind the checkout window (what the app renders from events). */}
      {stage === 'closed' && <section className="uc-status" aria-label="Checkout status" aria-live="polite">
        <div className="row gap-8">
          <h2 className="t-15 w-700">{stage === 'closed' ? (completed.length ? 'All done' : 'Checkout not finished') : `Checking out ${plural(plan.length, 'store')} in one go`}</h2>
          <span className="spacer" />
          <span className="pill">Simulated</span>
        </div>
        <ul className="col gap-6">
          {plan.map((g) => (
            <li key={g.store} className="row gap-8 t-12">
              <span className={`uc-dot uc-dot--${shops[g.store]}`} aria-hidden="true" />
              <span className="w-700 flex1">{g.store}</span>
              <span className="muted">{({ waiting: 'Waiting', active: 'In checkout', processing: 'Paying…', completed: 'Order placed' } as const)[shops[g.store]]}</span>
              <span className="w-600">{money(shopTotals(g).total)}</span>
            </li>
          ))}
        </ul>
        {stage === 'closed' && (
          <div className="col gap-8">
            <p className="t-12">{completed.length ? `${plural(completed.reduce((t, g) => t + g.items.length, 0), 'item')} are marked Purchased. Each store sends its own confirmation and tracking.` : 'Nothing was paid. Your items are still in the cart.'}</p>
            <div className="row gap-8">
              {completed.length
                ? <><Button variant="primary" grow onClick={() => navigate('/purchases')}>View purchases</Button><Button onClick={() => navigate('/')}>Back to home</Button></>
                : <><Button variant="primary" grow onClick={() => { t0.current = Date.now(); setLog([]); setStage('signin'); }}>Reopen checkout</Button><Button onClick={onClose}>Back to cart</Button></>}
            </div>
          </div>
        )}
</section>}

      {stage !== 'closed' && (
        <div className="uc-window" role="dialog" aria-modal="true" aria-label="Combined checkout (simulated)">
          <div className="uc-chrome">
            <span className="uc-lock" aria-hidden="true">🔒</span>
            <span className="t-11 muted flex1">Secure checkout · simulated</span>
            <button type="button" className="link-btn t-12" onClick={closeWindow} aria-label="Close checkout">×</button>
          </div>

          {stage === 'creating' && <div className="uc-body uc-center"><p className="t-13">Creating your checkout…</p></div>}

          {stage === 'signin' && (
            <div className="uc-body uc-center col gap-12">
              <div className="uc-brand">Shop Pay</div>
              <p className="t-13">Sign in to check out with {plural(plan.length, 'store')} at once.</p>
              <div className="card col gap-4" style={{ padding: 12, width: '100%', borderRadius: 12 }}>
                <span className="t-11 muted">Signed in on this device as</span>
                <span className="t-13 w-700">{USER.name}</span>
              </div>
              <Button variant="primary" block onClick={signIn}>Continue as {USER.name}</Button>
              <LinkButton className="t-11" onClick={closeWindow}>Not you? Close</LinkButton>
            </div>
          )}

          {(stage === 'checkout' || stage === 'paying') && (
            <div className="uc-body col gap-14">
              <section className="col gap-4">
                <h3 className="t-13 w-700">Contact</h3>
                <p className="t-12">{USER.name} · signed in with Shop Pay</p>
              </section>
              <section className="col gap-4">
                <h3 className="t-13 w-700">Ship to</h3>
                <p className="t-12">142 Maple Ave, Toronto, ON</p>
                <LinkButton className="t-11" style={{ alignSelf: 'flex-start' }}>Ship gifts to different addresses</LinkButton>
              </section>
              {plan.map((g) => {
                const tt = shopTotals(g);
                return (
                  <section key={g.store} className="uc-shop">
                    <div className="row gap-8">
                      <h3 className="t-13 w-700 flex1">{g.store}</h3>
                      <span className="t-11 muted">{shops[g.store] === 'completed' ? 'Order placed ✓' : shops[g.store] === 'processing' ? 'Processing…' : `${plural(g.items.length, 'item')}`}</span>
                    </div>
                    {g.items.map((i) => {
                      const p = getProduct(i.productId);
                      return (
                        <div key={i.id} className="row gap-10">
                          <Swatch tint={p.tint} size={40} image={p.live ? p.image : undefined} alt="" />
                          <span className="t-12 flex1">{p.name}{i.qty > 1 ? ` × ${i.qty}` : ''}</span>
                          <span className="t-12 w-600">{money(i.price * i.qty)}</span>
                        </div>
                      );
                    })}
                    <fieldset className="uc-ship" disabled={stage === 'paying'}>
                      <legend className="t-11 w-700">Shipping</legend>
                      {SHIPPING.map((s) => (
                        <label key={s.id} className="row gap-8 t-12">
                          <input type="radio" name={`ship-${g.store}`} checked={shipping[g.store] === s.id} onChange={() => { setShipping({ ...shipping, [g.store]: s.id }); emit('update', `${g.store}: shipping → ${s.label}`); }} />
                          <span className="flex1">{s.label} · {s.eta}</span>
                          <span>{money(s.price)}</span>
                        </label>
                      ))}
                    </fieldset>
                    <div className="kv t-11 muted"><span>Items · shipping · tax</span><span>{money(tt.items)} · {money(tt.ship)} · {money(tt.tax)}</span></div>
                  </section>
                );
              })}
              <section className="col gap-6">
                <h3 className="t-13 w-700">Payment</h3>
                <div className="card row gap-8" style={{ padding: 10, borderRadius: 10 }}><span className="t-12 flex1">Visa ending 4242 (sample)</span><span className="t-11 muted">via Shop Pay</span></div>
              </section>
              <div className="kv t-15 w-700"><span>Total · {plural(plan.length, 'store')}</span><span>{money(grand)}</span></div>
              <Button variant="primary" size="lg" block disabled={stage === 'paying'} onClick={pay}>
                {stage === 'paying' ? 'Paying…' : `Pay ${money(grand)}`}
              </Button>
              <p className="t-10 muted">Each store fulfils its own order. You'll get a confirmation from each.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
