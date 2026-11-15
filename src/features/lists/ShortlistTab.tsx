import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, CloseButton, Modal, Swatch, useDismiss } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { getProduct, getType } from '../../lib/api';
import { money, plural, shortDate } from '../../lib/format';
import type { ShortlistItem } from '../../data/types';
import type { ListCtx } from './ListWorkspace';

type GroupBy = 'type' | 'none' | 'status';

/** Shortlist tab (08b): grouped by a "Product type" dropdown, row menu, move, remove with undo. */
export function ShortlistTab({ ctx }: { ctx: ListCtx }) {
  const app = useApp();
  const { shortlist, person, occasions, isInCart, addToCart } = app;
  const navigate = useNavigate();
  const [groupBy, setGroupBy] = useState<GroupBy>('type');
  const [checked, setChecked] = useState<string[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [moving, setMoving] = useState<ShortlistItem | null>(null);
  const who = person(ctx.personId);

  const items = shortlist
    .filter((s) => s.personId === ctx.personId && s.occasionId === ctx.occasionId)
    .sort((a, b) => b.addedAt - a.addedAt);
  const statusOf = (s: ShortlistItem) => (isInCart(s.productId, s.personId, s.occasionId) ? 'In cart' : s.status);
  const groups: [string, ShortlistItem[]][] =
    groupBy === 'none' ? [['', items]]
      : groupBy === 'status' ? (['Selected', 'Considering', 'In cart'] as const).map((st) => [st, items.filter((s) => statusOf(s) === st)] as [string, ShortlistItem[]]).filter(([, l]) => l.length)
      : [...new Set(items.map((s) => getProduct(s.productId).type))].map((t) => [getType(t).name, items.filter((s) => getProduct(s.productId).type === t)]);

  const inCartCount = items.filter((s) => isInCart(s.productId, s.personId, s.occasionId)).length;
  const selectedCount = items.filter((s) => s.status === 'Selected').length;
  const otherOccasions = occasions.filter((o) => o.id !== ctx.occasionId && o.people.some((p) => p.personId === ctx.personId));
  const toggle = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  if (!items.length) {
    return (
      <div className="card card--dashed card--pad col gap-8" style={{ alignItems: 'flex-start' }}>
        <div className="t-14 w-700">Nothing on {who.name}'s list yet</div>
        <div className="t-12 muted">Shortlist ideas from Find gifts and they will collect here.</div>
        <Button variant="primary" onClick={() => navigate(`/lists/${ctx.occasionId}/${ctx.personId}`)}>Find gifts</Button>
      </div>
    );
  }

  return (
    <div className="row gap-16" style={{ alignItems: 'flex-start' }}>
      <div className="flex1 col gap-6">
        <div className="row gap-8">
          <label className="t-12 w-700" htmlFor="group-by">Group by:</label>
          <select id="group-by" className="select" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
            <option value="type">Product type</option>
            <option value="status">Status</option>
            <option value="none">None</option>
          </select>
          <span className="spacer" />
          <button type="button" className="link-btn" style={{ fontWeight: 400 }}>Sort: Date added ▾</button>
        </div>

        {groups.map(([name, list]) => (
          <section key={name || 'all'} aria-label={name || 'All items'}>
            {name && (
              <div className="row gap-8" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                <h3 className="t-14 w-700">{name}</h3>
                <span className="t-11">{list.length}</span>
                <span className="spacer" />
                <button type="button" className="link-btn t-11" onClick={() => setChecked([...new Set([...checked, ...list.map((s) => s.productId)])])}>Select all</button>
              </div>
            )}
            {list.map((s) => {
              const p = getProduct(s.productId);
              const status = statusOf(s);
              const inCart = status === 'In cart';
              return (
                <div key={s.productId} className={`sl-row${menuFor === s.productId ? ' is-active' : ''}`}>
                  <input type="checkbox" aria-label={`Select ${p.name}`} checked={checked.includes(s.productId)} onChange={() => toggle(s.productId)} />
                  <Swatch tint={p.tint} size={46} image={p.live ? p.image : undefined} alt="" />
                  <button type="button" className="flex1 col" style={{ border: 0, background: 'none', padding: 0, textAlign: 'left' }} onClick={() => ctx.openProduct(s.productId, items.map((x) => x.productId))}>
                    <span className="t-13 w-700">{p.name}{s.variant ? ` · ${s.variant}` : ''}</span>
                    <span className="t-11">{p.store} · {getType(p.type).name}</span>
                  </button>
                  <button
                    type="button" className="pill pill--outline"
                    title="Change status"
                    disabled={inCart}
                    onClick={() => app.setShortlistStatus(s.productId, s.personId, s.occasionId, s.status === 'Selected' ? 'Considering' : 'Selected')}
                  >{status}</button>
                  <span className="t-13 w-700 nowrap" style={{ width: 76, textAlign: 'right' }}>{money(p.price)}</span>
                  <span className="t-11" style={{ width: 120 }}>{inCart ? 'In your cart' : `Arrives ${p.arrives}`}</span>
                  <Button size="sm" disabled={inCart} onClick={() => addToCart(s.productId, s.personId, s.occasionId)} style={{ minHeight: 30 }}>
                    {inCart ? 'In cart' : 'Add to cart'}
                  </Button>
                  <RowMenu
                    open={menuFor === s.productId}
                    setOpen={(o) => setMenuFor(o ? s.productId : null)}
                    onCompare={() => ctx.openCompare([s.productId, ...items.filter((x) => x.productId !== s.productId).slice(0, 2).map((x) => x.productId)])}
                    onAdd={() => addToCart(s.productId, s.personId, s.occasionId)}
                    onMove={() => setMoving(s)}
                    onRemove={() => app.removeShortlist(s.productId, s.personId, s.occasionId)}
                    name={p.name}
                  />
                </div>
              );
            })}
          </section>
        ))}

        <div className="card row gap-8" style={{ padding: '12px 12px', borderRadius: 14, marginTop: 10 }}>
          <span className="t-12 w-700">{checked.length} selected · Compare up to 3</span>
          <span className="spacer" />
          <Button disabled={checked.length < 2} onClick={() => ctx.openCompare(checked.slice(0, 3))}>Compare {Math.min(checked.length, 3) || ''} →</Button>
          <Button variant="primary" disabled={!checked.length} onClick={() => { checked.forEach((id) => addToCart(id, ctx.personId, ctx.occasionId)); setChecked([]); }}>Add selected to cart</Button>
        </div>
      </div>

      <aside className="sl-side">
        <section className="card card--pad-sm col gap-4" style={{ borderRadius: 14 }}>
          <h3 className="t-13 w-700">Status</h3>
          <p className="t-12">{plural(items.length, 'item')} · {selectedCount} selected · {inCartCount} in cart · 0 bought</p>
        </section>
        <section className="card card--pad-sm col gap-4" style={{ borderRadius: 14 }}>
          <h3 className="t-13 w-700">Timing</h3>
          <p className="t-12">Order by Dec 12 for delivery by Dec 24 (store-specific).</p>
        </section>
        {otherOccasions.slice(0, 1).map((o) => (
          <section key={o.id} className="card card--dashed card--pad-sm col gap-4" style={{ borderRadius: 14 }}>
            <h3 className="t-13 w-700">Also for {who.name}</h3>
            <p className="t-12">{o.name} · {shortDate(o.date)} · {plural(shortlist.filter((x) => x.occasionId === o.id && x.personId === ctx.personId).length, 'gift')}</p>
            <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(`/lists/${o.id}/${ctx.personId}/shortlist`)}>Open →</button>
          </section>
        ))}
      </aside>

      {moving && <MoveModal item={moving} onClose={() => setMoving(null)} />}
    </div>
  );
}

function RowMenu({ open, setOpen, onCompare, onAdd, onMove, onRemove, name }: {
  open: boolean; setOpen: (o: boolean) => void; onCompare: () => void; onAdd: () => void; onMove: () => void; onRemove: () => void; name: string;
}) {
  const ref = useDismiss(open, () => setOpen(false));
  const run = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="dots" aria-label={`More actions for ${name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>⋯</button>
      {open && (
        <div className="menu" role="menu" style={{ right: 0, top: 34 }}>
          <button role="menuitem" type="button" className="menu__item" onClick={run(onCompare)}>Compare with…</button>
          <button role="menuitem" type="button" className="menu__item" onClick={run(onAdd)}>Add to cart</button>
          <button role="menuitem" type="button" className="menu__item menu__item--strong" onClick={run(onMove)}>Move to another list… →</button>
          <button role="menuitem" type="button" className="menu__item">Add a note</button>
          <button role="menuitem" type="button" className="menu__item menu__item--strong menu__item--divided" onClick={run(onRemove)}>Remove from shortlist</button>
        </div>
      )}
    </div>
  );
}

/** Move an item to another person or occasion (08e). */
function MoveModal({ item, onClose }: { item: ShortlistItem; onClose: () => void }) {
  const { people, occasions, moveShortlist } = useApp();
  const [personId, setPersonId] = useState(item.personId);
  const targets = occasions.flatMap((o) => o.people.filter((p) => p.personId === personId).map(() => o)).filter((o) => !(o.id === item.occasionId && personId === item.personId));
  const [occasionId, setOccasionId] = useState(targets[0]?.id ?? '');
  const [keep, setKeep] = useState(false);
  const p = getProduct(item.productId);
  return (
    <Modal onClose={onClose} size="sm" label={`Move ${p.name}`}>
      <div className="modal__head">
        <h2 className="modal__title modal__title--sans">Move {p.name}</h2>
        <span className="spacer" />
        <CloseButton onClick={onClose} />
      </div>
      <label className="col gap-8">
        <span className="t-12 w-700">To person</span>
        <select className="select" style={{ alignSelf: 'flex-start' }} value={personId} onChange={(e) => { setPersonId(e.target.value); setOccasionId(''); }}>
          {people.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      <label className="col gap-8">
        <span className="t-12 w-700">For occasion</span>
        <select className="select" style={{ alignSelf: 'flex-start' }} value={occasionId} onChange={(e) => setOccasionId(e.target.value)}>
          <option value="" disabled>Choose an occasion</option>
          {targets.map((o) => <option key={o.id} value={o.id}>{o.name} · {shortDate(o.date)}</option>)}
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />Keep a copy on this list</label>
      <div className="modal__foot">
        <span className="spacer" />
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!occasionId} onClick={() => { moveShortlist(item.productId, item, { personId, occasionId }, keep); onClose(); }}>Move</Button>
      </div>
    </Modal>
  );
}
