import { Button, CloseButton, LinkButton, Modal } from '../../components/ui';
import type { StoreGroup } from '../../store/AppStore';
import { money } from '../../lib/format';

/** Codes & deals (09e). Only store-published codes and deals are shown. */
export function DealsModal({ store, groups, onStore, onClose }: { store: string; groups: StoreGroup[]; onStore: (s: string) => void; onClose: () => void }) {
  const g = groups.find((x) => x.store === store);
  const deals = store === 'Hartwell Home'
    ? [
      { title: 'WELCOME10 · 10% off your order', body: 'Applied automatically. Saves CA$ 13.40.', tags: ['Store-published'], action: 'Remove' },
      { title: 'Free shipping over CA$ 150', body: `You are ${money(g?.freeShippingAway ?? 0)} away.`, tags: ['Store-published'], action: 'See items' },
      { title: 'Aurora Gooseneck Kettle sale', body: 'Listed at CA$ 109.00, now CA$ 89.00. End date not provided.', tags: ['Store-published', 'End date unknown'] },
    ]
    : [];
  return (
    <Modal onClose={onClose} size="md" label="Codes and deals">
      <div className="modal__head">
        <h2 className="modal__title modal__title--sans">Codes &amp; deals</h2>
        <span className="spacer" />
        <CloseButton onClick={onClose} />
      </div>
      <div className="row gap-8">
        <label className="t-12 w-700" htmlFor="deal-store">For</label>
        <select id="deal-store" className="select" value={store} onChange={(e) => onStore(e.target.value)}>
          {groups.map((x) => <option key={x.store}>{x.store}</option>)}
        </select>
        <span className="t-10">Codes apply per store, at that store's checkout.</span>
      </div>
      <form className="col gap-8" onSubmit={(e) => e.preventDefault()}>
        <label className="field-label" htmlFor="promo">Promo code</label>
        <div className="row gap-6"><input id="promo" className="input" placeholder="Enter a code" /><Button type="submit">Apply</Button></div>
      </form>
      <form className="col gap-8" onSubmit={(e) => e.preventDefault()}>
        <label className="field-label" htmlFor="giftcard">Gift card</label>
        <div className="row gap-6"><input id="giftcard" className="input" placeholder="Gift card number or PIN" /><Button type="submit">Redeem</Button></div>
      </form>
      <div className="field-label" style={{ paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>Deals we found for this store</div>
      {deals.length ? deals.map((d) => (
        <div key={d.title} className="row gap-8" style={{ paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
          <div className="flex1 col gap-2">
            <span className="t-13 w-600">{d.title}</span>
            <span className="t-11">{d.body}</span>
          </div>
          {d.tags.map((t) => <span key={t} className="pill" style={{ fontSize: 10 }}>{t}</span>)}
          {d.action && <LinkButton className="t-11">{d.action}</LinkButton>}
        </div>
      )) : <p className="t-12 muted">No codes or sales found for this store.</p>}
      <p className="t-10">We only show codes and deals that stores publish. We do not search for coupon codes elsewhere.</p>
    </Modal>
  );
}
