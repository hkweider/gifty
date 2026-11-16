import { Link, useNavigate } from 'react-router-dom';
import { Button, LinkButton, Swatch } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { getProduct } from '../../lib/api';
import { money } from '../../lib/format';
import './cart.css';

const WAYS = [
  { title: 'A code was applied automatically', body: 'WELCOME10 takes 10% off your Hartwell Home order. Saves CA$ 13.40.', tags: ['Store-published'], action: 'See breakdown' },
  { title: 'Aurora Gooseneck Kettle is on sale', body: 'Listed at CA$ 109.00, now CA$ 89.00. Store 1 has not told us when the sale ends.', tags: ['Store-published', 'End date unknown'], action: 'Buy now' },
  { title: 'Free shipping is CA$ 29.40 away at Hartwell Home', body: "Ceramic Pour-over Dripper on Dad's list is CA$ 34.00 here. It would save CA$ 9.99 shipping but only makes sense if Dad would like it.", tags: ['Store-published'], action: 'Preview Ceramic Pour-over Dripper' },
  { title: "Order Mom's gift later", body: "Mom's birthday is Jan 12 and Northfield Goods can deliver in 3 to 6 days. Waiting for a better price is low risk.", tags: ['Calendar'], action: 'Move to later' },
  { title: "Wide Desk Mat is over Sam's budget by CA$ 5.00", body: "Cheaper alternatives from Sam's list or a swap suggestion.", tags: ['Your budget'], action: 'See alternatives' },
];

/** Savings and timing (09b). Based only on store-published info, our own price checks and the calendar. */
export function SavingsPage() {
  const { cart } = useApp();
  const navigate = useNavigate();
  return (
    <div className="page">
      <div className="col gap-10">
        <nav className="breadcrumb"><Link to="/cart" className="w-700">Cart</Link><span>/ Savings and timing</span></nav>
        <h1 className="page-title">Make the most of your cart</h1>
        <p className="t-12">Based only on what stores publish, our own price checks, and the calendar. We never guess at future sales.</p>
      </div>
      <div className="row gap-20" style={{ alignItems: 'flex-start' }}>
        <section className="flex1 col gap-10">
          <h2 className="t-14 w-700">Ways to save</h2>
          {WAYS.map((w, i) => (
            <div key={w.title} className="card save-card">
              <span className="save-card__n">{i + 1}</span>
              <div className="flex1 col gap-4">
                <div className="row gap-6">
                  <span className="t-13 w-700">{w.title}</span>
                  <span className="spacer" />
                  {w.tags.map((t) => <span key={t} className="pill" style={{ fontSize: 10 }}>{t}</span>)}
                </div>
                <p className="t-12">{w.body}</p>
                <div className="row gap-10" style={{ marginTop: 4 }}>
                  <Button size="md" onClick={() => w.action.startsWith('Preview') && navigate('/lists/christmas-2026/mom?product=dripper')}>{w.action}</Button>
                  <LinkButton className="t-11">Dismiss</LinkButton>
                </div>
              </div>
            </div>
          ))}
        </section>
        <section className="col gap-10" style={{ width: 400, flex: 'none' }}>
          <h2 className="t-14 w-700">Price watch</h2>
          <div className="card col gap-14" style={{ padding: 16 }}>
            {cart.map((c) => {
              const p = getProduct(c.productId);
              const added = p.id === 'kettle' ? 95 : p.price;
              return (
                <div key={c.id} className="row gap-12" style={{ alignItems: 'flex-start' }}>
                  <Swatch tint={p.tint} size={44} />
                  <div className="flex1 col gap-4">
                    <div className="row gap-8" style={{ alignItems: 'flex-start' }}>
                      <span className="t-13 w-700" style={{ width: 110 }}>{p.name}</span>
                      <span className="t-11 muted flex1">{p.store} · {p.listPrice ? 'Sale' : 'No sale'}</span>
                      <span className="t-13 w-700">Now {money(p.price)}</span>
                    </div>
                    <span className="t-11">Was {money(added)} when added · lowest seen {money(p.price)}</span>
                    <label className="check"><input type="checkbox" />Alert me if it drops</label>
                  </div>
                </div>
              );
            })}
            <p className="t-11">History is from our own price checks since you added each item. It is not a forecast.</p>
          </div>
          <h2 className="t-14 w-700">Buy-by timing</h2>
          <div className="card col gap-8" style={{ padding: 12 }}>
            <div className="row gap-8"><span className="t-12">Gifts must arrive by</span><input className="input" style={{ width: 130 }} defaultValue="Dec 24, 2026" aria-label="Gifts must arrive by" /><span className="t-10">(from the Christmas date)</span></div>
            <div className="kv"><span>Hartwell Home order by</span><span>Dec 12 (standard) · Dec 19 (express +CA$ 14)</span></div>
            <div className="kv"><span>Northfield Goods order by</span><span>Dec 18 (standard)</span></div>
            <p className="t-11">If you order everything today you get the widest choice of delivery options and the lowest stock risk.</p>
            <p className="t-10 muted">Key shopping dates (calendar): Black Friday Nov 27 · Cyber Monday Nov 30 · Last order dates mid-December. Stores may or may not run sales.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
