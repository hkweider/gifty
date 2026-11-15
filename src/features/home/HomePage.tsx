import { Link, useNavigate } from 'react-router-dom';
import girlWithGift from '../../assets/illustration-girl-gift.png';
import { Avatar, Button, Meter, Swatch } from '../../components/ui';
import { summarizeCart, useApp } from '../../store/AppStore';
import { getProduct } from '../../lib/api';
import { daysUntil, greeting, money, plain, plural, shortDate } from '../../lib/format';
import { TODAY, USER } from '../../data/sample';
import './home.css';

export function HomePage() {
  const { cart, occasions, purchases, shortlist, isInCart, person } = useApp();
  const navigate = useNavigate();
  const s = summarizeCart(cart);
  const active = occasions.filter((o) => !o.reminderOnly);
  const next = active[0];
  const recipients = new Set(cart.map((c) => c.personId)).size;

  // Budget vs spend. Spend counts only what is marked purchased.
  const budget = active.reduce((t, o) => t + o.budget, 0);
  const inActive = (occId?: string) => !!occId && active.some((o) => o.id === occId);
  const purchased = purchases.filter((p) => inActive(p.occasionId)).reduce((t, p) => t + p.price, 0);
  const inCart = cart.reduce((t, c) => t + getProduct(c.productId).price * c.qty, 0);
  const onLists = shortlist
    .filter((x) => inActive(x.occasionId) && !isInCart(x.productId, x.personId, x.occasionId))
    .reduce((t, x) => t + getProduct(x.productId).price, 0);
  const left = Math.max(0, budget - purchased - inCart - onLists);
  const seg = (n: number) => `${(n / budget) * 100}%`;

  return (
    <div className="page home">
      <header className="home__hero">
        <div className="col gap-8">
          <div className="t-13 w-500 muted">{plural(daysUntil(next.date), 'day')} until {next.shortName}</div>
          <h1 className="display-xl">{greeting()}, {USER.name}</h1>
        </div>
        <img className="home__illustration" src={girlWithGift} alt="" />
      </header>

      <div className="row gap-16 stretch">
        <section className="home__cart" aria-labelledby="home-cart">
          <div className="row" style={{ paddingBottom: 6 }}>
            <h2 id="home-cart" className="serif t-22">Your cart{cart.length ? ` · ${plural(cart.length, 'gift')} for ${plural(recipients, 'person', 'people')}` : ''}</h2>
            <span className="spacer" />
            <Link to="/cart" className="t-12 w-600 underline">View full cart →</Link>
          </div>
          {cart.map((c) => {
            const p = getProduct(c.productId);
            const per = occasions.find((o) => o.id === c.occasionId)!;
            return (
              <div key={c.id} className="home__cart-row">
                <Swatch tint={p.tint} size={44} image={p.live ? p.image : undefined} alt="" />
                <div className="flex1">
                  <div className="t-13 w-600">{p.name}</div>
                  <div className="t-11 muted">from {p.store}</div>
                </div>
                <div className="t-12" style={{ width: 150 }}>{person(c.personId).name} · {per.shortName}</div>
                <div className="t-11 muted" style={{ width: 110 }}>Arrives: {p.arrives}</div>
                <div className="t-13 w-600 nowrap" style={{ width: 72, textAlign: 'right' }}>{money(p.price * c.qty)}</div>
              </div>
            );
          })}
          {cart.length === 0 && (
            <div className="home__cart-row" style={{ justifyContent: 'space-between' }}>
              <span className="t-12 muted">Nothing in your cart yet. Gifts you add appear here.</span>
              <Button variant="primary" size="md" onClick={() => navigate('/explore')}>Start shopping</Button>
            </div>
          )}
        </section>

        <section className="home__total" aria-label="Order total">
          <div className="t-12 w-500 dim">Order total</div>
          <div className="home__total-amount">{plain(s.total, { cents: true })}</div>
          <div className="t-11 dim">incl. shipping and tax</div>
          <Button variant="primary" className="home__checkout" disabled={!s.count} onClick={() => navigate('/cart?checkout=1')}>
            Check out ({plural(s.count, 'gift')})
          </Button>
        </section>
      </div>

      <div className="row gap-16 stretch">
        <section className="card card--pad flex1 col gap-12">
          <div className="row">
            <h2 className="t-15 w-600">Budget vs spend · all occasions</h2>
            <span className="spacer" />
            <Link to="/purchases" className="t-12 w-600 accent">Purchases →</Link>
          </div>
          <div className="col gap-14" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="row-base gap-10">
              <div className="display-lg">{plain(budget)}</div>
              <div className="t-12 muted">across {plural(active.length, 'occasion')}</div>
            </div>
            <div className="stacked-bar" aria-hidden="true">
              <span style={{ width: seg(purchased), background: 'var(--button)' }} />
              <span style={{ width: seg(inCart), background: 'var(--accent)' }} />
              <span style={{ width: seg(onLists), background: 'var(--sky)' }} />
              <span style={{ width: seg(left), background: 'var(--surface-sunk)' }} />
            </div>
            <div className="legend">
              {[['Purchased', purchased, 'var(--button)'], ['In cart', inCart, 'var(--accent)'], ['On lists', onLists, 'var(--sky)'], ['Left', left, 'var(--surface-sunk)']].map(([l, v, c]) => (
                <div key={l as string} className="col gap-2">
                  <div className="row gap-6 t-11 muted"><span className="dot" style={{ background: c as string }} />{l}</div>
                  <div className="t-14 w-600" style={{ paddingLeft: 14 }}>{plain(v as number)}</div>
                </div>
              ))}
            </div>
            <div className="t-11 muted">Spend counts only what you mark purchased. See Purchases.</div>
          </div>
        </section>
        <OrderByTimeline />
      </div>

      <div className="row" style={{ padding: '0 2px' }}><h2 className="section-title">Occasions</h2></div>
      <section className="card occasions" aria-label="Occasions">
        {active.map((o) => <OccasionRow key={o.id} id={o.id} />)}
      </section>
    </div>
  );
}

function OccasionRow({ id }: { id: string }) {
  const { occasion, person, shortlist, cart, purchases } = useApp();
  const navigate = useNavigate();
  const o = occasion(id);
  const onList = (pid: string) => shortlist.filter((x) => x.occasionId === id && x.personId === pid).length;
  const inCart = (pid: string) => cart.filter((x) => x.occasionId === id && x.personId === pid).length;
  const gifts = shortlist.filter((x) => x.occasionId === id).length;
  const spent = purchases.filter((p) => p.occasionId === id).reduce((t, p) => t + p.price, 0);
  const multi = o.people.length > 1;
  const firstPerson = o.people[0]?.personId;
  return (
    <div className="occasion">
      <div className="occasion__main">
        <div style={{ width: 70 }} className="none">
          <div className="t-16 w-600">{shortDate(o.date)}</div>
          <div className="t-11 muted">{plural(daysUntil(o.date), 'day')}</div>
        </div>
        <div className="flex1 col gap-6">
          <div className="t-14 w-600">{o.name}</div>
          <div className="row gap-14">
            <div className="avatar-stack">
              {o.people.map(({ personId }) => <Avatar key={personId} initial={person(personId).initial} />)}
            </div>
            <div className="t-12 muted">
              {multi ? `${plural(o.people.length, 'person', 'people')} · ${plural(gifts, 'gift')}` : gifts ? plural(gifts, 'gift') : 'no gifts yet'}
            </div>
          </div>
        </div>
        <div className="col gap-6 none" style={{ width: 200 }}>
          <Meter value={spent / (o.budget || 1)} />
          <div className="t-11 muted"><span className="w-600" style={{ color: 'var(--ink)' }}>{plain(spent)}</span> of {plain(o.budget)}</div>
        </div>
        <Button size="md" className="btn--soft" onClick={() => navigate(`/lists/${o.id}/${firstPerson}`)}>Open →</Button>
      </div>
      {multi && (
        <div className="occasion__people">
          {o.people.map(({ personId }) => {
            const p = person(personId);
            const n = onList(personId);
            const c = inCart(personId);
            const status = n ? `${n} on list${c ? ` · ${c} in cart` : ''}` : 'not started';
            return (
              <Link key={personId} to={`/lists/${o.id}/${personId}`} className="occasion__person">
                <Avatar initial={p.initial} size="sm" />
                <span className="t-12 w-600">{p.name}</span>
                <span className="t-11 muted">{status}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** "Order by" timeline: today → last occasion, month ticks, order-by marker. */
function OrderByTimeline() {
  const { occasions } = useApp();
  const active = occasions.filter((o) => !o.reminderOnly);
  const first = active[0];
  const last = active[active.length - 1];
  const orderBy = '2026-12-15';
  const span = daysUntil(last.date);
  const x = (iso: string) => 12 + (daysUntil(iso) / span) * 76; // % across the track
  const ticks: string[] = [];
  for (let d = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 1); daysUntil(iso(d)) < span; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) ticks.push(iso(d));
  const todayIso = iso(TODAY);
  type Mark = { at: string; color: string; title: string; sub: string; above: boolean; pill?: boolean };
  const marks: Mark[] = [
    { at: todayIso, color: 'var(--button)', title: `Today · ${shortDate(todayIso)}`, sub: '', above: false, pill: true },
    { at: orderBy, color: 'var(--marker-gold)', title: shortDate(orderBy), sub: 'Order-by', above: true },
    ...active.map<Mark>((o, i) => ({
      at: o.date,
      color: i === 0 ? 'var(--marker-rose)' : 'var(--accent)',
      title: shortDate(o.date),
      sub: o.name.replace(/ \d{4}$/, '').replace('birthday', 'bday'),
      above: i % 2 === 1,
    })),
  ];
  return (
    <section className="card card--pad flex1 col gap-12">
      <div className="row">
        <h2 className="t-15 w-600">Order by {shortDate(orderBy)} for {first.shortName}</h2>
        <span className="spacer" />
        <Link to="/cart" className="t-12 w-600 accent">Checkout →</Link>
      </div>
      <div className="timeline" role="img" aria-label={`Timeline: ${marks.map((m) => `${m.title} ${m.sub}`).join(', ')}`}>
        <span className="timeline__track" />
        <span className="timeline__fill" style={{ left: `${x(todayIso)}%`, width: `${x(orderBy) - x(todayIso)}%` }} />
        {ticks.map((t) => <span key={t} className="timeline__tick" style={{ left: `${x(t)}%` }} />)}
        {marks.map((m) => (
          <div key={m.at + m.sub}>
            <span className={`timeline__stem ${m.above ? 'up' : 'down'}`} style={{ left: `${x(m.at)}%` }} />
            <span className="timeline__dot" style={{ left: `${x(m.at)}%`, background: m.color }} />
            <div className={`timeline__label ${m.above ? 'up' : 'down'}`} style={{ left: `${x(m.at)}%` }}>
              {m.pill ? <span className="pill pill--dark">{m.title}</span> : <>
                <span className="t-13 w-600 nowrap">{m.title}</span>
                <span className="t-11 muted nowrap">{m.sub}</span>
              </>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
