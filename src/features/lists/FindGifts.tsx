import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productTypes, products, searchSuggestions } from '../../data/sample';
import type { Product, ProductTypeId } from '../../data/types';
import { getProduct, getType, ideaCount, LIMITED_REVIEWS, productsByType, searchProducts } from '../../lib/api';
import { money, plural } from '../../lib/format';
import { useApp } from '../../store/AppStore';
import { Button, Chip, EmptyState, Meter, Swatch, useDismiss } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { ProductCard, SkeletonCard } from './ProductCard';
import type { ListCtx } from './ListWorkspace';

const MAX_COMPARE = 3;

/**
 * Find gifts tab. View is URL-driven so every board state is linkable:
 *   (none)          start (04a) when the list is empty, otherwise all types grouped (04)
 *   ?type=brewing   one product type (04d)
 *   ?q=pour-over    search results (04g)
 *   ?state=loading|empty|limited|demo  (05a–05d)
 *   ?max=100        budget filter override (set by Ask, 04e)
 */
export function FindGifts({ ctx }: { ctx: ListCtx }) {
  const { person, shortlist, isShortlisted, toggleShortlist } = useApp();
  const [params, setParams] = useSearchParams();
  const [compare, setCompare] = useState<string[]>([]);
  const [hideLimited, setHideLimited] = useState(false);
  const p = person(ctx.personId);

  const type = params.get('type') as ProductTypeId | null;
  const q = params.get('q');
  const state = params.get('state');
  const maxParam = params.get('max');
  const maxBudget = maxParam === 'none' ? Infinity : maxParam ? Number(maxParam) : ctx.budget;
  const noSub = params.get('nosub') !== '0';
  const durable = params.get('durable') !== '0';
  const changed = params.get('changed');
  const excluded = (params.get('skip') ?? '').split(',').filter(Boolean);
  const listEmpty = !shortlist.some((s) => s.personId === ctx.personId && s.occasionId === ctx.occasionId);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next);
  };

  const filters = { maxBudget, noSubscription: noSub, durable };
  const visible = (list: Product[]) => list.filter((x) => !excluded.includes(x.id)).filter((x) => !(hideLimited && LIMITED_REVIEWS.has(x.id)));

  const card = (prod: Product, all: Product[], extra?: { demo?: boolean }) => (
    <ProductCard
      key={prod.id}
      product={prod}
      demo={extra?.demo}
      shortlisted={isShortlisted(prod.id, ctx.personId, ctx.occasionId)}
      compared={compare.includes(prod.id)}
      compareDisabled={compare.length >= MAX_COMPARE}
      onOpen={() => ctx.openProduct(prod.id, all.map((x) => x.id))}
      onToggleShortlist={() => toggleShortlist(prod.id, ctx.personId, ctx.occasionId, prod.variants?.[0])}
      onToggleCompare={() => setCompare((c) => (c.includes(prod.id) ? c.filter((x) => x !== prod.id) : [...c, prod.id].slice(0, MAX_COMPARE)))}
    />
  );

  const filterRow = (opts: { soft?: boolean; note?: string } = {}) => (
    <div className="row gap-6 wrap">
      {Number.isFinite(maxBudget) && <Chip on={!opts.soft} soft={opts.soft} onRemove={() => set({ max: 'none', changed: null })}>Budget ≤ ${maxBudget}</Chip>}
      {noSub && <Chip on={!opts.soft} soft={opts.soft} onRemove={() => set({ nosub: '0' })}>No subscription</Chip>}
      {durable && <Chip on={!opts.soft} soft={opts.soft} onRemove={() => set({ durable: '0' })}>Durable</Chip>}
      {opts.soft && <Chip soft onRemove={() => undefined}>Not from Amazon</Chip>}
      <Chip>+ Filter ▾</Chip>
      {opts.note ? <span className="t-11">{opts.note}</span> : (
        <button type="button" className="link-btn" onClick={() => set({ max: 'none', nosub: '0', durable: '0', changed: null })}>Clear all</button>
      )}
      <span className="spacer" />
      <button type="button" className="link-btn" style={{ fontWeight: 400 }}>Sort: Best fit ▾</button>
    </div>
  );

  let body: React.ReactNode;

  if (state === 'loading') {
    const blurbs = products.slice(0, 6).map((x) => x.blurb);
    body = (
      <>
        <div className="notice">
          <div className="t-13 w-700">Searching stores for {p.name}…</div>
          <div className="t-12">Checking the Shopify catalog and gathering expert and customer reviews. Results appear as they arrive.</div>
        </div>
        <Meter value={0.4} dark boxed />
        {filterRow()}
        <div className="grid-3">{blurbs.map((b) => <SkeletonCard key={b} blurb={b} />)}</div>
      </>
    );
  } else if (state === 'empty') {
    const closest = products.slice(0, 3);
    body = (
      <>
        {filterRow({ soft: true, note: 'Darker filters are the ones removing results' })}
        <section className="card card--pad col gap-12" style={{ padding: 16 }}>
          <h2 className="t-18 w-700">Nothing matches all of your filters</h2>
          <div className="t-12">Under $50 + Durable + Not from Amazon is too narrow right now.</div>
          <div className="t-12 w-700">Try relaxing one:</div>
          <div className="row gap-8 wrap">
            <Button variant="primary" onClick={() => set({ state: null })}>Remove "Not from Amazon" (12 results)</Button>
            <Button onClick={() => set({ state: null, max: '75' })}>Raise budget to $75 (7 results)</Button>
            <Button onClick={() => set({ state: null, durable: '0' })}>Drop "Durable" (9 results)</Button>
          </div>
          <div className="t-12 w-700">Or tell us what is flexible:</div>
          <form className="row gap-8" onSubmit={(e) => { e.preventDefault(); set({ state: null, max: 'none' }); }}>
            <input className="input" placeholder="e.g. budget can stretch for something really good" aria-label="What is flexible" />
            <Button type="submit">Ask</Button>
          </form>
          <div className="t-12 w-700">Closest matches (do not meet every filter):</div>
          <div className="grid-3">{closest.map((x) => card(x, closest))}</div>
        </section>
      </>
    );
  } else if (state === 'demo') {
    const demo = products.filter((x) => x.id !== 'deskmat').slice(0, 6);
    body = (
      <>
        <div className="notice">
          <div className="t-13 w-700">Live results are unavailable right now</div>
          <div className="t-12">Showing a labelled demo set so you can still try the flow. Demo items cannot be shortlisted, added to the cart or bought.</div>
          <div className="row gap-8" style={{ marginTop: 4 }}>
            <Button variant="primary" onClick={() => set({ state: 'loading' })}>Retry live search</Button>
            <Button>Keep exploring demo set</Button>
          </div>
        </div>
        {filterRow()}
        <div className="grid-3">{demo.map((x) => card(x, demo, { demo: true }))}</div>
      </>
    );
  } else if (q) {
    const results = visible(searchProducts(q, filters));
    const counts: [string, number][] = [['All', results.length], ['Pour-over coffee sets', results.filter((x) => x.type === 'brewing').length], ['Pour-over kettles', results.filter((x) => x.type === 'accessories').length], ['Other', results.filter((x) => x.type === 'giftsets').length]];
    body = (
      <>
        <div className="row gap-8">
          <h2 className="t-15 w-700">Results for "{q}"</h2>
          <span className="t-11">{plural(results.length, 'idea')} for {p.name}</span>
          <span className="spacer" />
          <span className="t-11">Searched 14 stores · prices checked 4 min ago</span>
        </div>
        <div className="row gap-6 wrap">
          <span className="t-12 w-700">Matches by product type:</span>
          {counts.map(([l, n], i) => <Chip key={l} on={i === 0}>{l} · {n}</Chip>)}
        </div>
        {filterRow()}
        {results.length ? <div className="grid-4">{results.map((x) => card(x, results))}</div> : <EmptyState title="No results" body="Try a different search or relax a filter." />}
      </>
    );
  } else if (type) {
    const t = getType(type);
    const results = visible(productsByType(type, filters));
    body = (
      <>
        {changed && <ChangedNotice text={changed} onUndo={() => set({ changed: null, max: null, skip: null })} />}
        <div className="row gap-8">
          <Button size="md" onClick={() => set({ type: null })}><Icon name="arrowRight" size={14} style={{ transform: 'rotate(180deg)' }} /> All types</Button>
          <h2 className="t-15 w-700">{t.name}</h2>
          <span className="t-11">{plural(ideaCount(type), 'idea')} for {p.name}</span>
          <span className="spacer" />
          {t.narrow.length > 0 && <span className="t-12 w-700">Narrow by:</span>}
          {t.narrow.map((n) => <Chip key={n} large>{n}</Chip>)}
        </div>
        {filterRow()}
        {results.length ? <div className="grid-3">{results.map((x) => card(x, results))}</div> : <EmptyState title={`No ${t.name.toLowerCase()} ideas within these filters`} body="Relax a filter or ask in words to see more." />}
        {state === 'limited' && <LimitedFilter hide={hideLimited} setHide={setHideLimited} />}
      </>
    );
  } else if (listEmpty && !params.get('view') && state !== 'limited') {
    body = <StartView ctx={ctx} onType={(id) => set({ type: id })} />;
  } else {
    const groups = (['brewing', 'giftsets', 'accessories'] as ProductTypeId[]).map((id) => ({ t: getType(id), items: visible(productsByType(id, filters)) }));
    const all = groups.flatMap((g) => g.items);
    body = (
      <>
        {changed && <ChangedNotice text={changed} onUndo={() => set({ changed: null, max: null, skip: null })} />}
        {state === 'limited' && (
          <div className="notice">
            <div className="t-13 w-700">Some results have limited reviews</div>
            <div className="t-12">We could not find expert reviews or independent testing for {all.filter((x) => LIMITED_REVIEWS.has(x.id)).length} of these. They are still shown, marked clearly, and ranked lower.</div>
          </div>
        )}
        {filterRow()}
        {groups.filter((g) => g.items.length).map((g) => (
          <section key={g.t.id} className="col gap-6" aria-label={g.t.name}>
            <div className="group-head">
              <h2 className="t-14 w-700">{g.t.name}</h2>
              <span className="t-11">{plural(ideaCount(g.t.id), 'idea')}</span>
              <span className="spacer" />
              <button type="button" className="link-btn t-11" onClick={() => set({ type: g.t.id })}>See all →</button>
            </div>
            <div className="grid-3">{g.items.slice(0, 3).map((x) => card(x, all))}</div>
          </section>
        ))}
        {state === 'limited' && <LimitedFilter hide={hideLimited} setHide={setHideLimited} />}
      </>
    );
  }

  const showBar = !!(q || type || (!listEmpty && !state) || state === 'limited') && state !== 'demo';

  return (
    <>
      <SearchBox personName={p.name} initial={q ?? ''} onSearch={(text) => set({ q: text || null, type: null, state: null })} onType={(id) => set({ type: id, q: null })} onProduct={(id) => ctx.openProduct(id, searchSuggestions.products)} />
      {body}
      {showBar && (
        <div className="compare-bar">
          <span className="t-12 w-700">Compare: tick up to {MAX_COMPARE} cards</span>
          {compare.map((id) => <span key={id} className="compare-bar__slot" style={{ background: `var(--${getProduct(id).tint})` }} />)}
          <span className="t-11">{compare.length} of {MAX_COMPARE}</span>
          <Button variant="primary" disabled={compare.length < 2} onClick={() => ctx.openCompare(compare)}>Compare {compare.length || ''} →</Button>
        </div>
      )}
    </>
  );
}

function ChangedNotice({ text, onUndo }: { text: string; onUndo: () => void }) {
  return (
    <div className="notice notice--dashed" style={{ flexDirection: 'row', alignItems: 'center', padding: '8px 12px' }}>
      <span className="t-12 w-700">Changed:</span>
      <span className="t-12">&nbsp;{text}</span>
      <span className="spacer" />
      <button type="button" className="link-btn" onClick={onUndo}>Undo</button>
    </div>
  );
}

function LimitedFilter({ hide, setHide }: { hide: boolean; setHide: (v: boolean) => void }) {
  return (
    <div className="row gap-8">
      <span className="t-12 w-700">Reviews filter:</span>
      <Chip on={!hide} check onClick={() => setHide(false)}>Show all</Chip>
      <Chip on={hide} check onClick={() => setHide(true)}>Hide limited reviews</Chip>
    </div>
  );
}

/** Board 04a: start with a product type, plus ideas from the profile. */
function StartView({ ctx, onType }: { ctx: ListCtx; onType: (id: ProductTypeId) => void }) {
  const { person } = useApp();
  const p = person(ctx.personId);
  const ideas: { label: string; type: ProductTypeId; tint: 'blush' | 'sage' | 'peach' }[] = [
    { label: 'Pour-over kit', type: 'brewing', tint: 'blush' },
    { label: 'Coffee tasting set', type: 'giftsets', tint: 'sage' },
    { label: 'Travel mug', type: 'accessories', tint: 'peach' },
  ];
  return (
    <>
      <h2 className="t-14 w-700">Start with a product type</h2>
      <div className="grid-4" style={{ gap: 10 }}>
        {productTypes.map((t) => (
          <button key={t.id} type="button" className="type-tile" onClick={() => onType(t.id)}>
            <span className="type-tile__img" style={{ background: `var(--${t.tint})` }} />
            <span className="type-tile__body">
              <span className="t-13 w-700">{t.name}</span>
              <span className="t-11">{plural(ideaCount(t.id), 'idea')} for {p.name}</span>
            </span>
          </button>
        ))}
      </div>
      <section className="card card--dashed col gap-6" style={{ padding: 14, borderColor: 'var(--peach)' }}>
        <h2 className="t-14 w-700">Ideas based on what we know about {p.name}</h2>
        <div className="t-11">{p.summary.replace('wants durable, no subscription', 'no subscriptions')}</div>
        <div className="row gap-10" style={{ marginTop: 4 }}>
          {ideas.map((i) => (
            <button key={i.label} type="button" className="idea" onClick={() => onType(i.type)}>
              <Swatch tint={i.tint} size={34} radius={99} />
              <span className="col">
                <span className="t-12 w-700">{i.label}</span>
                <span className="t-10">{getType(i.type).name}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

/** Search with live suggestions (04b): product types, products, search all stores, ask in words. */
function SearchBox({ personName, initial, onSearch, onType, onProduct }: {
  personName: string; initial: string; onSearch: (q: string) => void; onType: (t: ProductTypeId) => void; onProduct: (id: string) => void;
}) {
  const [text, setText] = useState(initial);
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const input = useRef<HTMLInputElement>(null);
  const prods = useMemo(() => searchSuggestions.products.map(getProduct), []);
  const pick = (fn: () => void) => { fn(); setOpen(false); };
  return (
    <div className="search-wrap" ref={ref}>
      <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); pick(() => onSearch(text.trim())); }}>
        <Icon name="search" size={14} stroke={2.2} />
        <input
          ref={input}
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(e.target.value.trim().length > 1); }}
          onFocus={() => setOpen(text.trim().length > 1)}
          placeholder="Search a product type, ask in words, or paste a link"
          aria-label={`Search gifts for ${personName}`}
          aria-expanded={open}
          aria-controls="find-suggest"
        />
      </form>
      {open && (
        <div className="suggest" id="find-suggest" role="listbox">
          <div className="suggest__head">Product types</div>
          {searchSuggestions.types.map((t) => (
            <button key={t.label} type="button" role="option" className="suggest__row" onClick={() => pick(() => onType(t.type))}>
              <Swatch tint={t.tint} size={28} radius={99} />
              <span className="col flex1"><span className="t-12 w-700">{t.label}</span><span className="t-10">{t.sub}</span></span>
              <span className="t-11 w-700">See ideas</span>
            </button>
          ))}
          <div className="suggest__head">Products</div>
          {prods.map((x) => (
            <button key={x.id} type="button" role="option" className="suggest__row" onClick={() => pick(() => onProduct(x.id))}>
              <Swatch tint={x.tint} size={28} radius={99} />
              <span className="col flex1"><span className="t-12 w-700">{x.name}</span><span className="t-10">{x.store} · {money(x.price)}</span></span>
              <span className="t-11 w-700">View</span>
            </button>
          ))}
          <button type="button" className="suggest__row t-12 w-700" onClick={() => pick(() => onSearch(text.trim()))}>⌕ Search all stores for "{text.trim()}"</button>
          <button type="button" className="suggest__row t-12 w-700" onClick={() => pick(() => onSearch(text.trim()))}>✎ Ask in words: "{text.trim()}"</button>
        </div>
      )}
    </div>
  );
}
