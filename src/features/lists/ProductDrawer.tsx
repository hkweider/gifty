import { useEffect, useState } from 'react';
import { Button, LinkButton } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useApp } from '../../store/AppStore';
import { getProduct, getProductDetail, type ProductDetail } from '../../lib/api';
import { money, priceOf } from '../../lib/format';
import { reviewsFor } from '../../data/reviews';
import { sampleReviews } from '../../data/mockReviews';
import type { ListCtx } from './ListWorkspace';

const GALLERY_SIZE = 8; // images reported by the store; first 3 shown as thumbs, then "+N"

/** Product view drawer (06a) with image gallery, fit, sourced reviews and buying details. */
export function ProductDrawer({ ctx, productId, siblings, onNavigate, onClose, onCompare }: {
  ctx: ListCtx; productId: string; siblings: string[];
  onNavigate: (id: string) => void; onClose: () => void; onCompare: (id: string) => void;
}) {
  const { person, occasion, isShortlisted, toggleShortlist, addToCart, isInCart } = useApp();
  const p = getProduct(productId);
  const who = person(ctx.personId);
  const occ = occasion(ctx.occasionId);
  const r = p.live ? sampleReviews(p, who.name) : reviewsFor(p, who.name);
  const isSample = 'sample' in r;
  const budget = occ.people.find((x) => x.personId === ctx.personId)?.budget ?? 0;
  const [variant, setVariant] = useState(p.variants?.[0]);
  const [img, setImg] = useState(0);
  useEffect(() => { setVariant(p.variants?.[0]); setImg(0); }, [p]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const idx = siblings.indexOf(productId);
  const prev = idx > 0 ? siblings[idx - 1] : undefined;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : undefined;
  const shortlisted = isShortlisted(p.id, ctx.personId, ctx.occasionId);
  const inCart = isInCart(p.id, ctx.personId, ctx.occasionId);

  // Live products: options, price, stock and delivery eligibility for the selected variant (get_product).
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [detailState, setDetailState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [selected, setSelected] = useState<{ name: string; label: string }[]>([]);
  useEffect(() => { setDetail(null); setSelected([]); }, [p.id]);
  useEffect(() => {
    if (!p.live) return;
    let alive = true;
    setDetailState('loading');
    getProductDetail(p.id, selected)
      .then((d) => { if (alive) { setDetail(d); setDetailState('idle'); } })
      .catch(() => alive && setDetailState('error'));
    return () => { alive = false; };
  }, [p.id, p.live, selected]);
  const v = detail?.variant ?? null;
  const price = v?.price ?? p.price;
  const listPrice = v ? v.listPrice : p.listPrice;
  const salePct = listPrice ? Math.round((1 - price / listPrice) * 100) : 0;
  const canBuy = !p.live || !detail || (!!v && v.available && detail.shipsToCountry && !v.subscriptionOnly);
  const choose = (name: string, label: string) =>
    setSelected((cur) => [...(detail?.selected ?? cur).filter((x) => x.name !== name), { name, label }]);
  const cartVariant = p.live && v ? { id: v.id, title: v.title, price: v.price, listPrice: v.listPrice } : undefined;
  const variantLabel = p.live ? (detail?.selected.map((x) => x.label).join(' / ') || undefined) : variant;
  const thumbPos = ['center/cover', '20% 80%/260%', '80% 30%/260%'];

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={p.name}>
        <div className="drawer__head">
          <LinkButton onClick={onClose}>← Results</LinkButton>
          <span className="spacer" />
          <LinkButton disabled={!prev} onClick={() => prev && onNavigate(prev)}>‹ Prev</LinkButton>
          <LinkButton disabled={!next} onClick={() => next && onNavigate(next)}>Next ›</LinkButton>
          <LinkButton onClick={onClose}>Close ×</LinkButton>
        </div>

        <div className="drawer__body">
          <div className={p.live ? 'col gap-14' : 'row gap-14'}>
            {p.live ? <LiveGallery images={p.live.images} name={p.name} tint={p.tint} /> : (
            <div className="gallery">
              <div className="gallery__main">
                {p.image
                  ? <img src={p.image} alt={p.name} style={{ objectPosition: thumbPos[img]?.split('/')[0] }} />
                  : <span className="gallery__ph" style={{ background: `var(--${p.tint})` }} />}
                <span className="gallery__count">{img + 1} / {p.image ? GALLERY_SIZE : 1}</span>
              </div>
              {p.image && (
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  {thumbPos.map((pos, i) => (
                    <button key={pos} type="button" className="gallery__thumb" aria-current={img === i} aria-label={`Image ${i + 1}`}
                      style={{ background: `url(${p.image}) ${pos}` }} onClick={() => setImg(i)} />
                  ))}
                  <button type="button" className="gallery__thumb gallery__more" aria-label={`${GALLERY_SIZE - 3} more images`}>+{GALLERY_SIZE - 3}</button>
                </div>
              )}
            </div>
            )}
            <div className="col gap-6 min0">
              <h2 className="t-18 w-700">{v && v.title.length > 12 && !/^default title$/i.test(v.title) ? v.title : p.name}</h2>
              {!p.live && <div className="t-12 muted">{p.maker ? `by ${p.maker} · ${p.blurb.replace('Gooseneck spout, ', '').replace(', ', ' · ')}` : p.blurb}</div>}
              <div className="row-base gap-8">
                <span className="t-16 w-700 nowrap" aria-live="polite">{priceOf(p, price)}</span>
                {listPrice && listPrice > price && <span className="t-12 muted strike nowrap">{priceOf(p, listPrice)}</span>}
                {salePct > 0 && <span className="pill">Sale −{salePct}%</span>}
              </div>
              <div className="t-11 muted">{p.live ? `Sold by ${p.store} · price checked just now` : `Sold by ${p.store} · Arrives ${p.arrives} · checked 14 min ago`}</div>
              {p.live && <VariantPicker detail={detail} state={detailState} onChoose={choose} />}
              {!p.live && p.variants && (
                <div className="row gap-6">
                  {p.variants.map((v) => (
                    <button key={v} type="button" className="chip" aria-pressed={variant === v} onClick={() => setVariant(v)}>
                      {v}{variant === v ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              )}
              <div className="t-11 w-700">For: {who.name} · {occ.name}</div>
            </div>
          </div>

          <section className="panel">
            <h3 className="t-14 w-700">Why it fits {who.name}</h3>
            <p className="t-13 lh-15">{!p.live ? r.why : `It came up in a catalog search based on ${who.name}'s profile (${who.summary || 'no preferences yet'}). At ${priceOf(p)} it ${p.price <= budget ? 'fits within' : 'is over'} the ${money(budget, { cents: false })} ${occ.shortName} budget.`}</p>
          </section>

          {r && <>
          <section className="panel" style={{ gap: 14 }}>
            <h3 className="t-14 w-700 row gap-8">Reviews · from {isSample ? `${r.sources.length} sources` : r.sources.length > 2 ? '1,000+ sources' : `${r.sources.length} sources`}{isSample && <span className="pill" title="Consumer Reports, Trustpilot, Reddit and TikTok are not connected yet. These reviews are sample data.">Sample</span>}</h3>
            <div className="row gap-20">
              <div className="col gap-2 none" style={{ width: 150 }}>
                <div className="row-base gap-6"><span className="display-lg">{r.rating.toFixed(1)}</span><span className="t-12 muted">out of 5</span></div>
                <div className="t-14" aria-label={`${r.rating} out of 5 stars`}>
                  <span className="stars">{'★'.repeat(Math.floor(r.rating))}</span>
                  <span className="stars--off">{'★'.repeat(5 - Math.floor(r.rating))}</span>
                </div>
                <div className="t-11 muted">{r.ratings}</div>
              </div>
              <div className="flex1 col gap-4">
                {r.distribution.map((pct, i) => (
                  <div key={i} className="row gap-8 t-11 muted">
                    <span style={{ width: 10 }}>{5 - i}</span>
                    <span className="meter" style={{ height: 5, flex: 1 }}><span style={{ width: `${pct}%`, background: 'var(--button)' }} /></span>
                    <span style={{ width: 28, textAlign: 'right' }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col gap-8" style={{ background: 'var(--canvas)', borderRadius: 12, padding: 12 }}>
              <div className="t-12 w-700">Quick summary</div>
              <p className="t-12 lh-15">{r.summary}</p>
              <div className="row gap-16" style={{ alignItems: 'flex-start' }}>
                <div className="flex1 t-11"><div className="w-700">Agree on</div><div className="muted">{r.agree}</div></div>
                <div className="flex1 t-11"><div className="w-700">Mixed on</div><div className="muted">{r.mixed}</div></div>
              </div>
            </div>
            <div className="col gap-6">
              <div className="t-11 w-600">Where the opinions come from</div>
              <div className="stacked-bar">
                <span style={{ width: `${r.mix.tests}%`, background: 'var(--button)' }} />
                <span style={{ width: `${r.mix.buyers}%`, background: 'var(--accent)' }} />
                <span style={{ width: `${r.mix.social}%`, background: 'var(--peach)' }} />
              </div>
              <div className="row t-11 muted" style={{ gap: 3 }}>
                {([['Tests', r.mix.tests, 'var(--button)'], ['Verified buyers', r.mix.buyers, 'var(--accent)'], ['Social', r.mix.social, 'var(--peach)']] as const).map(([l, v, c]) => (
                  <span key={l} className="row gap-6 nowrap" style={{ width: `${v}%`, gap: 5 }}><span className="dot" style={{ width: 7, height: 7, background: c }} />{l} · {v}%</span>
                ))}
              </div>
            </div>
            <div className="row gap-16">
              <Scale label="Durability" lo="Fragile" hi="Built to last" value={r.durability} />
              <Scale label="Ease of use" lo="Fiddly" hi="Effortless" value={r.ease} />
            </div>
            <div className="col">
              {r.sources.map((s) => (
                <div key={s.kind + (s.name ?? s.logoAlt)} className="source">
                  <div className="row gap-8">
                    <span className="row gap-8 t-13 w-600">
                      {s.logo && <img src={s.logo} alt={s.logoAlt} />}
                      {s.name && <span className={s.logo ? 't-11 muted' : ''} style={s.logo ? { fontWeight: 400 } : undefined}>{s.name}</span>}
                    </span>
                    <span className="pill pill--outline t-10" style={{ padding: '2px 8px', fontSize: 10 }}>{s.kind}</span>
                    <span className="spacer" />
                    <span className="t-13 w-600">{s.score}</span>
                  </div>
                  <p className="t-12" style={{ lineHeight: 1.45 }}>{s.text}</p>
                  <div className="row t-11 muted">
                    <a href="#" className="underline" onClick={(e) => e.preventDefault()}>Read original ↗</a>
                    <span className="spacer" />
                    <span>{s.retrieved}</span>
                  </div>
                </div>
              ))}
            </div>
            <LinkButton underline className="t-12 w-600" style={{ alignSelf: 'flex-start' }}>Showing {r.sources.length} of {isSample ? r.sources.length : r.sources.length > 2 ? '1,000+' : r.sources.length} sources · See all sources</LinkButton>
            <div className="t-11 muted">The summary is drawn from these sources. Open any source to read the original.</div>
          </section>

          <div className="row gap-10 stretch">
            <BulletPanel title="Likes" items={r.likes} />
            <BulletPanel title="Watch for" items={r.watch} />
          </div>
          {p.live ? <LiveDetails p={p} /> : (
          <section className="panel panel--sm" style={{ gap: 0 }}>
            <h3 className="t-13 w-700" style={{ marginBottom: 8 }}>Buying considerations</h3>
            <p className="t-12" style={{ lineHeight: 1.45 }}>{r.buying}</p>
            <div className="t-11" style={{ marginTop: 6 }}>{r.buyingMeta}</div>
          </section>
          )}
          {r.gaps && (
            <section className="panel panel--sm" style={{ borderStyle: 'dashed', borderColor: 'var(--line-dashed)', gap: 0 }}>
              <h3 className="t-13 w-700">Gaps</h3>
              <p className="t-12">{r.gaps}</p>
            </section>
          )}
          </>}
          <form className="row gap-6" onSubmit={(e) => e.preventDefault()}>
            <input className="input" placeholder="Ask about this product…" aria-label="Ask about this product" />
            <Button type="submit">Ask</Button>
          </form>
        </div>

        <div className="drawer__foot">
          <Button aria-pressed={shortlisted} onClick={() => toggleShortlist(p.id, ctx.personId, ctx.occasionId, variantLabel)}>
            {shortlisted ? '✓ Shortlisted' : '+ Shortlist'}
          </Button>
          <Button onClick={() => onCompare(p.id)}>Compare</Button>
          <Button variant="primary" grow size="lg" disabled={inCart || !canBuy} onClick={() => addToCart(p.id, ctx.personId, ctx.occasionId, cartVariant)}>
            <Icon name="cart" size={16} stroke={2} />{inCart ? 'In your cart' : !canBuy ? (v && !v.available ? 'Sold out' : 'Unavailable') : 'Add to cart'}
          </Button>
        </div>
      </aside>
    </>
  );
}

function Scale({ label, lo, hi, value }: { label: string; lo: string; hi: string; value: number }) {
  return (
    <div className="flex1 col gap-4">
      <div className="t-11 w-600">{label}</div>
      <div className="slider" role="meter" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ left: `${value * 100}%` }} />
      </div>
      <div className="row t-10 muted"><span>{lo}</span><span className="spacer" /><span>{hi}</span></div>
    </div>
  );
}

function BulletPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="panel panel--sm flex1" style={{ gap: 0 }}>
      <h3 className="t-13 w-700" style={{ marginBottom: 8 }}>{title}</h3>
      <ul className="col gap-4">
        {items.map((i) => <li key={i} className="t-12 row gap-6" style={{ lineHeight: 1.4, alignItems: 'flex-start' }}><span className="muted">•</span><span>{i}</span></li>)}
      </ul>
    </section>
  );
}

function LiveGallery({ images, name, tint }: { images: string[]; name: string; tint: string }) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [images]);
  return (
    <div className="gallery gallery--wide">
      <div className="gallery__main">
        {images.length ? <img src={images[i]} alt={name} /> : <span className="gallery__ph" style={{ background: `var(--${tint})` }} />}
        {images.length > 0 && <span className="gallery__count">{i + 1} / {images.length}</span>}
      </div>
      {images.length > 1 && (
        <div className="row gap-6">
          {images.slice(0, images.length > 6 ? 5 : 6).map((src, n) => (
            <button key={src} type="button" className="gallery__thumb" aria-current={i === n} aria-label={`Image ${n + 1}`}
              style={{ background: `url(${src}) center/cover` }} onClick={() => setI(n)} />
          ))}
          {images.length > 6 && <button type="button" className="gallery__thumb gallery__more" onClick={() => setI(5)} aria-label={`${images.length - 5} more images`}>+{images.length - 5}</button>}
        </div>
      )}
    </div>
  );
}

/** Live catalog product: store ratings, description and buying details. No made-up review text. */
function LiveDetails({ p }: { p: import('../../data/types').Product }) {
  const live = p.live!;
  return (
    <>
      {(live.description || live.features.length > 0) && (
        <section className="panel panel--sm" style={{ gap: 8 }}>
          <h3 className="t-13 w-700">About this product</h3>
          {live.description && <p className="t-12" style={{ lineHeight: 1.5 }}>{live.description.length > 700 ? `${live.description.slice(0, 700).trimEnd()}…` : live.description}</p>}
          {live.features.length > 0 && (
            <ul className="col gap-4">
              {live.features.map((f) => <li key={f} className="t-12 row gap-6" style={{ alignItems: 'flex-start' }}><span className="muted">•</span><span>{f}</span></li>)}
            </ul>
          )}
        </section>
      )}
      <section className="panel panel--sm" style={{ gap: 6 }}>
        <h3 className="t-13 w-700">Buying considerations</h3>
        <p className="t-12" style={{ lineHeight: 1.45 }}>Sold and shipped by {p.store}. Shipping, tax and delivery dates are confirmed at the store's checkout.</p>
        <div className="row gap-14 t-11">
          {live.url && <a className="underline" href={live.url} target="_blank" rel="noreferrer">View on store ↗</a>}
          {live.refundPolicyUrl && <a className="underline" href={live.refundPolicyUrl} target="_blank" rel="noreferrer">Refund policy ↗</a>}
        </div>
      </section>
    </>
  );
}

/** Colour/size choices with availability, plus stock and delivery eligibility for the chosen variant. */
function VariantPicker({ detail, state, onChoose }: {
  detail: ProductDetail | null; state: 'idle' | 'loading' | 'error';
  onChoose: (name: string, label: string) => void;
}) {
  if (!detail) {
    return <div className="t-11 muted">{state === 'error' ? 'Live stock and options are unavailable right now.' : 'Checking options and stock…'}</div>;
  }
  const v = detail.variant;
  const isSel = (name: string, label: string) => detail.selected.some((x) => x.name === name && x.label === label);
  const stock = !v ? { text: 'No variant matches this selection', tone: 'bad' }
    : !v.available ? { text: 'Sold out', tone: 'bad' }
      : v.runningLow ? { text: 'In stock · running low', tone: 'warn' }
        : { text: 'In stock', tone: 'ok' };
  const checks: { ok: boolean; text: string }[] = v ? [
    { ok: detail.shipsToCountry, text: detail.shipsToCountry ? `Ships to ${detail.country === 'CA' ? 'Canada' : detail.country}` : `Doesn't ship to ${detail.country === 'CA' ? 'Canada' : detail.country}` },
    { ok: !v.subscriptionOnly, text: v.subscriptionOnly ? 'Subscription only' : 'One-time purchase' },
    { ok: v.nativeCheckout, text: v.nativeCheckout ? 'Shopify checkout' : 'Finishes on the store\'s own site' },
  ] : [];
  return (
    <div className="col gap-8" aria-busy={state === 'loading'}>
      {detail.options.map((o) => (
        <div key={o.name} className="col gap-4">
          <span className="t-11 w-700">{o.name}{detail.selected.find((x) => x.name === o.name) ? `: ${detail.selected.find((x) => x.name === o.name)!.label}` : ''}</span>
          <div className="row gap-6 wrap" role="radiogroup" aria-label={o.name}>
            {o.values.filter((x) => x.exists).map((x) => (
              <button
                key={x.label} type="button" role="radio" aria-checked={isSel(o.name, x.label)}
                className={`chip opt-chip${isSel(o.name, x.label) ? ' chip--on' : ''}`}
                style={x.available ? undefined : { textDecoration: 'line-through', color: 'var(--faint)' }}
                title={x.available ? undefined : 'Sold out'}
                onClick={() => onChoose(o.name, x.label)}
              >{x.label}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="row gap-6 wrap t-11">
        <span className={`stock stock--${stock.tone}`}>{stock.text}</span>
        {checks.map((c) => <span key={c.text} className={`check-pill${c.ok ? '' : ' is-no'}`}>{c.ok ? '✓' : '✕'} {c.text}</span>)}
        {state === 'loading' && <span className="muted">Updating…</span>}
      </div>
      <div className="t-10 muted">Delivery dates are confirmed at checkout.</div>
    </div>
  );
}
