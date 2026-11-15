import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, LinkButton, Modal, Swatch } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useApp, type StoreGroup } from '../../store/AppStore';
import { createStoreCart, getProduct } from '../../lib/api';
import { stores } from '../../data/sample';
import { money, plural } from '../../lib/format';

type Phase = { kind: 'confirm' } | { kind: 'open'; step: number } | { kind: 'stepDone'; step: number } | { kind: 'notFinished'; step: number } | { kind: 'done' };

const TINTS = ['blush', 'sage', 'sky'] as const;

/**
 * Shopify UCP handoff (10a–10f): one short step per store. We never place orders or take payment;
 * each store's checkout opens in a new tab and the user tells us whether they finished.
 */
export function CheckoutModal({ groups, onClose }: { groups: StoreGroup[]; onClose: () => void }) {
  const { markStorePurchased } = useApp();
  const navigate = useNavigate();
  const [plan] = useState(groups); // snapshot: groups leave the cart as each step completes
  const [phase, setPhase] = useState<Phase>({ kind: 'confirm' });
  const [handoff, setHandoff] = useState<{ step: number; url?: string; error?: string; busy?: boolean }>({ step: -1 });
  const count = plan.reduce((t, g) => t + g.items.filter((i) => !i.unavailable).length, 0);
  const total = plan.reduce((t, g) => t + g.total, 0);
  const arrives = (g: StoreGroup) => stores[g.store]?.arrives ?? '';
  /**
   * Live stores: create a cart at the merchant (UCP Cart MCP) and open its continue_url, the store's
   * own checkout, in a new tab. Sample stores (no merchant domain) only simulate the step.
   * The tab is opened during the click so popup blockers allow it, then pointed at the checkout.
   */
  const openStore = (step: number) => {
    setPhase({ kind: 'open', step });
    const g = plan[step];
    if (!g.storeDomain) return;
    if (handoff.step === step && handoff.url) { window.open(handoff.url, '_blank', 'noopener'); return; }
    const tab = window.open('', '_blank');
    setHandoff({ step, busy: true });
    const lines = g.items.filter((i) => !i.unavailable).map((i) => ({ variantId: getProduct(i.productId).live!.variantId, quantity: i.qty }));
    createStoreCart(g.storeDomain, lines)
      .then(({ continueUrl }) => {
        setHandoff({ step, url: continueUrl });
        if (tab) { tab.opener = null; tab.location.href = continueUrl; }
      })
      .catch((e: unknown) => {
        tab?.close();
        setHandoff({ step, error: e instanceof Error ? e.message : 'Could not reach the store' });
      });
  };

  let body: React.ReactNode;
  if (phase.kind === 'confirm') {
    body = (
      <>
        <h2 className="modal__title modal__title--sans">Check out {plural(count, 'item')} in {plural(plan.length, 'step')}</h2>
        <p className="t-12">Each store takes payment on its own checkout page. We will open them one at a time.</p>
        {plan.map((g, i) => (
          <div key={g.store} className="row gap-12">
            <Swatch tint={TINTS[i % 3]} size={44} />
            <div className="flex1 col">
              <span className="t-13 w-700">Step {g.step} · {g.store}</span>
              <span className="t-11">{plural(g.items.length, 'item')} · arrives {arrives(g)}</span>
            </div>
            <span className="t-13 w-700">{money(g.total)}</span>
          </div>
        ))}
        <div className="save-pill" style={{ fontWeight: 400 }}><span className="w-700">Prices re-checked just now</span>&nbsp;&nbsp; No changes</div>
        <p className="t-11">We never place orders or take payment.</p>
        <div className="row gap-8">
          <Button variant="primary" grow onClick={() => openStore(0)}>Start step 1</Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </>
    );
  } else if (phase.kind === 'open') {
    const g = plan[phase.step];
    body = (
      <>
        <h2 className="modal__title modal__title--sans">Step {g.step} of {plan.length} · {g.store}</h2>
        {g.storeDomain && handoff.step === phase.step && handoff.busy && <p className="t-12">Creating your cart at {g.store}…</p>}
        {g.storeDomain && handoff.step === phase.step && handoff.error && (
          <div className="notice" role="alert"><span className="t-12 w-700">We could not open {g.store} checkout.</span><span className="t-11">{handoff.error}</span></div>
        )}
        {(!g.storeDomain || (handoff.step === phase.step && handoff.url)) && <p className="t-12">{g.store} checkout opened in a new tab. Finish your payment there, then come back.</p>}
        <div className="row gap-12">
          <Swatch tint={TINTS[phase.step % 3]} size={44} />
          <div className="flex1 col">
            <span className="t-13 w-700">{plural(g.items.length, 'item')}</span>
            <span className="t-11">{g.items.map((i) => getProduct(i.productId).name).join(', ')}</span>
          </div>
          <span className="t-13 w-700">{money(g.total)}</span>
        </div>
        <div className="notice notice--dashed" style={{ padding: '8px 10px' }}><span className="t-12 w-700">We cannot see whether you finished, so please tell us.</span></div>
        <div className="row gap-8">
          <Button variant="primary" grow onClick={() => { markStorePurchased(g.store); setPhase(phase.step + 1 < plan.length ? { kind: 'stepDone', step: phase.step } : { kind: 'done' }); }}>I completed it</Button>
          <Button onClick={() => setPhase({ kind: 'notFinished', step: phase.step })}>Not yet</Button>
        </div>
        {g.storeDomain && handoff.step === phase.step && handoff.url
          ? <a className="link-btn" style={{ alignSelf: 'flex-start' }} href={handoff.url} target="_blank" rel="noreferrer">Reopen {g.store} checkout ↗</a>
          : <LinkButton style={{ alignSelf: 'flex-start' }} onClick={() => openStore(phase.step)}>{handoff.error ? 'Try again' : `Reopen ${g.store} checkout ↗`}</LinkButton>}
        <LinkButton style={{ alignSelf: 'flex-start' }} onClick={onClose}>Back to cart</LinkButton>
      </>
    );
  } else if (phase.kind === 'stepDone') {
    const g = plan[phase.step];
    const n = plan[phase.step + 1];
    body = (
      <>
        <h2 className="modal__title modal__title--sans row gap-10"><Icon name="check" size={18} stroke={2} />Step {g.step} done · {g.store}</h2>
        <p className="t-12">{g.items.map((i) => getProduct(i.productId).name).join(' and ')} {g.items.length > 1 ? 'are' : 'is'} marked Purchased.</p>
        <div className="card col gap-8" style={{ padding: 10, borderRadius: 12 }}>
          <span className="t-11 w-700">Up next</span>
          <div className="row gap-12">
            <Swatch tint="sky" size={44} />
            <div className="flex1 col">
              <span className="t-13 w-700">Step {n.step} · {n.store}</span>
              <span className="t-11">{plural(n.items.length, 'item')} · arrives {arrives(n)}</span>
            </div>
            <span className="t-13 w-700">{money(n.total)}</span>
          </div>
        </div>
        <div className="row gap-8">
          <Button variant="primary" grow onClick={() => openStore(phase.step + 1)}>Start step {n.step}</Button>
          <Button onClick={onClose}>Do this later</Button>
        </div>
      </>
    );
  } else if (phase.kind === 'notFinished') {
    const g = plan[phase.step];
    body = (
      <>
        <h2 className="modal__title modal__title--sans">Checkout not finished</h2>
        <p className="t-12">We did not hear that Step {g.step} was completed. Your items are still in the cart and nothing is marked Purchased.</p>
        <div className="row gap-8">
          <Button variant="primary" grow onClick={() => openStore(phase.step)}>Reopen {g.store} checkout</Button>
          <Button onClick={onClose}>Back to cart</Button>
        </div>
        <p className="t-11">Need help? Check your email for an order confirmation from {g.store}.</p>
      </>
    );
  } else {
    body = (
      <>
        <h2 className="modal__title row gap-10"><Icon name="check" size={20} stroke={2} />All done</h2>
        <p className="t-12">{plural(count, 'item')} are marked Purchased. Tracking and arrival dates are in Purchases once the stores share them.</p>
        {plan.map((g) => <div key={g.store} className="kv"><span>{g.store}</span><span>{money(g.total)}</span></div>)}
        <hr className="divider" />
        <div className="kv w-700"><span>Total spent</span><span>{money(total)}</span></div>
        <div className="row gap-8">
          <Button variant="primary" grow onClick={() => navigate('/purchases')}>View purchases</Button>
          <Button onClick={() => navigate('/')}>Back to home</Button>
        </div>
      </>
    );
  }

  return (
    <Modal onClose={onClose} size="sm" label="Checkout" mainOnly>
      {body}
    </Modal>
  );
}
