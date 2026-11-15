import { useState } from 'react';
import { Button, Meter, Swatch } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { plain, plural } from '../../lib/format';
import './purchases.css';

/** Purchases (12): spent vs budget, expected arrivals, history with expandable tracking. */
export function PurchasesPage() {
  const { purchases, occasions, person, people } = useApp();
  const [open, setOpen] = useState<string | null>(purchases[0]?.id ?? null);
  const [occFilter, setOccFilter] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const active = occasions.filter((o) => !o.reminderOnly);
  const counted = purchases.filter((p) => active.some((o) => o.id === p.occasionId));
  const spent = counted.reduce((t, p) => t + p.price, 0);
  const budget = active.reduce((t, o) => t + o.budget, 0);
  const orders = new Set(counted.map((p) => `${p.store}|${p.date}`)).size;
  const byPerson = people.map((pp) => ({ name: pp.name, v: counted.filter((x) => x.personId === pp.id).reduce((t, x) => t + x.price, 0) }));
  const pending = purchases.filter((p) => p.status !== 'Delivered');
  const rows = purchases.filter((p) => (!occFilter || p.occasionId === occFilter) && (!personFilter || p.personId === personFilter) && (!statusFilter || p.status === statusFilter));

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Purchases</h1>
        <span className="spacer" />
        <Button>+ Add an order</Button>
      </div>
      <div className="row gap-16 stretch">
        <section className="card flex1 col gap-10" style={{ padding: 14 }}>
          <h2 className="t-14 w-700">Spent vs budget</h2>
          <div className="row-base gap-10"><span className="serif" style={{ fontSize: 26 }}>{plain(spent)}</span><span className="t-12">spent of {plain(budget)} budget · {plural(orders, 'order')}</span></div>
          <Meter value={spent / budget} dark boxed />
          {active.map((o) => {
            const s = counted.filter((p) => p.occasionId === o.id).reduce((t, p) => t + p.price, 0);
            return (
              <div key={o.id} className="row gap-10">
                <span className="t-12 w-700" style={{ width: 120 }}>{o.name}</span>
                <span className="flex1"><Meter value={s / (o.budget || 1)} dark boxed /></span>
                <span className="t-11" style={{ width: 80, textAlign: 'right' }}>{plain(s)} / {plain(o.budget)}</span>
              </div>
            );
          })}
          <div className="t-11 muted">By person: {byPerson.map((b) => `${b.name} ${plain(b.v)}`).join(' · ')}</div>
        </section>
        <section className="card flex1 col" style={{ padding: 14 }}>
          <h2 className="t-14 w-700" style={{ paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>Expected arrivals</h2>
          {pending.map((p) => (
            <div key={p.id} className="row gap-10" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <Swatch tint={p.tint} size={34} radius={99} />
              <div className="flex1 col">
                <span className="t-12 w-700">{p.item} · for {person(p.personId).name}</span>
                <span className="t-11">{p.store} · expected {p.arrives}</span>
              </div>
              <span className="pill pill--outline t-10" style={{ fontSize: 10 }}>{p.status}</span>
            </div>
          ))}
          <div className="notice notice--dashed" style={{ marginTop: 8, padding: '6px 10px', borderRadius: 10 }}>
            <span className="t-12 w-700">Christmas check: all expected before Dec 24 ✓</span>
          </div>
        </section>
      </div>
      <div className="notice notice--dashed">
        <span className="t-11 w-700">How this page stays accurate</span>
        <span className="t-10">Purchases are self-reported ("I completed it") and arrival dates come from the store. Add a tracking link or order number to keep an item current.</span>
      </div>
      <div className="row gap-8">
        <h2 className="t-14 w-700">Purchase history</h2>
        <span className="spacer" />
        <select className="select" aria-label="Occasion" value={occFilter} onChange={(e) => setOccFilter(e.target.value)}>
          <option value="">All occasions</option>
          {active.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select className="select" aria-label="Person" value={personFilter} onChange={(e) => setPersonFilter(e.target.value)}>
          <option value="">All people</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="select" aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['Processing', 'Shipped', 'Delivered'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <Button size="sm" style={{ minHeight: 30, borderRadius: 99 }}>Export</Button>
      </div>
      <div className="card ptable" role="table" aria-label="Purchase history">
        <div className="ptable__row ptable__head" role="row">
          {['Item', 'For', 'Store', 'Date', 'Price', 'Status', 'Arrives', ''].map((h) => <span key={h} role="columnheader">{h}</span>)}
        </div>
        {rows.map((p) => (
          <div key={p.id}>
            <div className="ptable__row" role="row">
              <span className="row gap-8 t-12 w-700"><Swatch tint={p.tint} size={36} radius={10} />{p.item}</span>
              <span className="t-11">{person(p.personId).name} · {p.occasionLabel}</span>
              <span className="t-11">{p.store}</span>
              <span className="t-11">{p.date}</span>
              <span className="t-12 w-700">CA$ {p.price}</span>
              <span><span className="pill pill--outline" style={{ fontSize: 10, minWidth: 88 }}>{p.status}</span></span>
              <span className="t-11 w-700">{p.arrives}</span>
              <span className="t-11 w-700">
                Track ↗ · <button type="button" className="link-btn t-11" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>Receipt · {open === p.id ? '▾' : '▸'}</button>
              </span>
            </div>
            {open === p.id && (
              <div className="ptable__detail">
                <div className="col gap-2 t-11">
                  <span className="w-700">Shipping details</span>
                  {p.details ? <><span>Ship to: {p.details.shipTo}</span><span>Carrier: {p.details.carrier}</span><span className="muted">{p.details.lastUpdate}</span></> : <span className="muted">The store has not shared tracking yet.</span>}
                </div>
                <div className="col gap-2 t-11">
                  <span className="w-700">Order details</span>
                  {p.details ? <><span>{p.details.order}</span><span>{p.details.returns}</span><span>{p.details.gift}</span></> : <span className="muted">Paid on {p.store}</span>}
                </div>
                <div className="col gap-6" style={{ alignItems: 'stretch' }}>
                  <Button size="md">Add tracking link</Button>
                  <Button size="md">Mark delivered</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
