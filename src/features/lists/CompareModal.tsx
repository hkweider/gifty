import { useState } from 'react';
import { Button, CloseButton, LinkButton, Modal } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { getProduct } from '../../lib/api';
import { compareRows } from '../../data/reviews';
import { priceOf } from '../../lib/format';
import type { ListCtx } from './ListWorkspace';

const ROWS: { key: string; label: (name: string) => string }[] = [
  { key: 'why', label: (n) => `Why it fits ${n}` },
  { key: 'durability', label: () => 'Durability' },
  { key: 'reviews', label: () => 'Review quality' },
  { key: 'procon', label: () => 'Top pro / top con' },
  { key: 'price', label: () => 'Price (all-in to Toronto)' },
  { key: 'store', label: () => 'Store · returns · delivery' },
];

/** Compare modal (07): up to 3 products, with a "Matters most" row from the person's criteria. */
export function CompareModal({ ctx, ids, onClose }: { ctx: ListCtx; ids: string[]; onClose: () => void }) {
  const { person, occasion, addToCart, isInCart, toggleShortlist, isShortlisted } = useApp();
  const who = person(ctx.personId);
  const occ = occasion(ctx.occasionId);
  const items = ids.slice(0, 3).map(getProduct);
  const [mattersMost] = useState('durability');
  const cell = (id: string, key: string) => {
    const p = getProduct(id);
    const row = compareRows[id];
    if (row?.[key]) return row[key];
    switch (key) {
      case 'why': return p.blurb;
      case 'durability': return 'No durability testing found';
      case 'reviews': return p.customer ? `${p.customer.rating.toFixed(1)} from ${p.customer.count} ratings${p.expert ? ` and ${p.expert.sources} sources` : ''}` : 'No ratings found';
      case 'procon': return '—';
      case 'price': return `${priceOf(p)} before tax and shipping`;
      default: return p.live ? `${p.store} · returns per store policy · delivery at checkout` : `${p.store} · 30-day returns · ${p.arrives}`;
    }
  };
  const biggest = items.length === 3 && ids.includes('kettle') && ids.includes('dripper') && ids.includes('tea')
    ? 'The kettle has the best build and reviews, the dripper is the cheapest, and the tea set arrives last.'
    : `${items.slice().sort((a, b) => a.price - b.price)[0].name} is the cheapest; ${items.slice().sort((a, b) => (b.expert?.score ?? 0) - (a.expert?.score ?? 0))[0].name} has the strongest reviews.`;

  return (
    <Modal onClose={onClose} size="wide" label={`Compare ${items.length} products`}>
      <div className="modal__head">
        <h2 className="modal__title">Compare {items.length} products</h2>
        <span className="t-13" style={{ marginLeft: 6 }}>{who.name} · {occ.name}</span>
        <span className="spacer" />
        <CloseButton onClick={onClose} />
      </div>
      <form className="row gap-8" onSubmit={(e) => e.preventDefault()}>
        <span className="t-13 w-700">Criteria for {who.name}: {mattersMost} first</span>
        <LinkButton className="t-13" style={{ marginLeft: 6 }}>Edit</LinkButton>
        <span className="spacer" />
        <input className="input" style={{ width: 300 }} placeholder='Ask: "compare on price only"' aria-label="Ask about this comparison" />
        <Button type="submit">Ask</Button>
      </form>
      <div className="notice notice--dashed" style={{ flexDirection: 'row', gap: 8, padding: 14 }}>
        <span className="t-13 w-700 nowrap">Biggest difference:</span>
        <span className="t-13">{biggest}</span>
      </div>
      <div className="cmp">
        <div />
        {items.map((p) => (
          <div key={p.id} className="col gap-10">
            <div className="cmp__img" style={{ background: `var(--${p.tint})` }} />
            <div className="t-15 w-700">{p.name}</div>
            <div className="row gap-8">
              <Button variant="primary" grow disabled={isInCart(p.id, ctx.personId, ctx.occasionId)} onClick={() => addToCart(p.id, ctx.personId, ctx.occasionId)}>
                {isInCart(p.id, ctx.personId, ctx.occasionId) ? 'In cart' : 'Add to cart'}
              </Button>
              <Button onClick={() => !isShortlisted(p.id, ctx.personId, ctx.occasionId) && toggleShortlist(p.id, ctx.personId, ctx.occasionId)}>
                {isShortlisted(p.id, ctx.personId, ctx.occasionId) ? 'Saved' : 'Save'}
              </Button>
            </div>
          </div>
        ))}
        {ROWS.map((r) => (
          <Row key={r.key} label={r.label(who.name)} hi={r.key === mattersMost}>
            {items.map((p) => <div key={p.id} className={`cmp__cell${r.key === mattersMost ? ' cmp__cell--hi' : ''}`}>{cell(p.id, r.key)}</div>)}
          </Row>
        ))}
      </div>
    </Modal>
  );
}

function Row({ label, hi, children }: { label: string; hi: boolean; children: React.ReactNode }) {
  return (
    <>
      <div className="col gap-4" style={{ paddingTop: 2 }}>
        <span className="t-13 w-700">{label}</span>
        {hi && <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--accent-tint)', fontWeight: 500, fontSize: 10 }}>Matters most</span>}
      </div>
      {children}
    </>
  );
}
