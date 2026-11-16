import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productTypes, products, searchSuggestions } from '../../data/sample';
import type { Product, ProductTypeId } from '../../data/types';
import { getProduct, getType, ideaCount, LIMITED_REVIEWS, LIVE, productsByType, searchProducts, type LiveQuery } from '../../lib/api';
import { useCatalog } from '../../lib/useCatalog';
import { money, plural } from '../../lib/format';
import { useApp } from '../../store/AppStore';
import { Button, Chip, EmptyState, Meter, Swatch, useDismiss } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { ProductCard, SkeletonCard } from './ProductCard';
import type { ListCtx } from './ListWorkspace';

const MAX_COMPARE = 3;

const isLimited = (p: Product) => (p.live ? !p.customer : LIVE ? false : LIMITED_REVIEWS.has(p.id));

/**
 * Find gifts tab. View is URL-driven so every board state is linkable:
 *   (none)          start (04a) when the list is empty, otherwise ideas grouped (04)
 *   ?type=brewing   one product type (04d)
 *   ?q=pour-over    search results (04g)
 *   ?state=loading|empty|limited|demo  (05a–05d, forced; live mode reaches loading/demo on its own)
 *   ?max=100        budget filter override (set by Ask, 04e)
 * Results come from Shopify's Global Catalog unless the build uses sample data (VITE_DATA=sample).
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
  const intent = `Gift for ${p.name} (${p.relationship.toLowerCase()}): ${p.summary}${p.avoids.length ? `; avoid ${p.avoids.join(', ').toLowerCase()}` : ''}`;
  const liveQuery = (query: string, t: ProductTypeId): LiveQuery => ({ query, type: t, maxPrice: maxBudget, intent });

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next);
  };

  const filters = { maxBudget, noSubscription: noSub, durable };
  const visible = (list: Product[]) => list
    .filter((x) => !excluded.some((e) => x.id === e || x.name.toLowerCase().includes(e)))
    .filter((x) => x.price <= maxBudget)
    .filter((x) => !(hideLimited && isLimited(x)));

  const card = (prod: Product, all: Product[], extra?: { demo?: boolean }) => (
    <ProductCard
      key={prod.id}
      product={prod}
      demo={extra?.demo}
      limited={isLimited(prod)}
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

  const loadingBlock = (cards = 6) => (
    <>
      <div className="notice">
        <div className="t-13 w-700">Searching stores for {p.name}…</div>
        <div className="t-12">Checking the Shopify catalog and gathering expert and customer reviews. Results appear as they arrive.</div>
      </div>
      <Meter value={0.4} dark boxed />
      {filterRow()}
      <div className="grid-3">{products.slice(0, cards).map((x) => <SkeletonCard key={x.id} blurb={LIVE ? '' : x.blurb} />)}</div>
    </>
  );

  const demoBlock = (onRetry: () => void, reason?: string) => {
    const demo = products.filter((x) => x.id !== 'deskmat').slice(0, 6);
    return (
      <>
        <div className="notice">
          <div className="t-13 w-700">Live results are unavailable right now</div>
          <div className="t-12">Showing a labelled demo set so you can still try the flow. Demo items cannot be shortlisted, added to the cart or bought.</div>
          {reason && <div className="t-11 muted">Reason: {reason}</div>}
          <div className="row gap-8" style={{ marginTop: 4 }}>
            <Button variant="primary" onClick={onRetry}>Retry live search</Button>
            <Button>Keep exploring demo set</Button>
          </div>
        </div>
        {filterRow()}
        <div className="grid-3">{demo.map((x) => card(x, demo, { demo: true }))}</div>
      </>
    );
  };

  let body: React.ReactNode;

  if (state === 'loading') {
    body = loadingBlock();
  } else if (state === 'demo') {
    body = demoBlock(() => set({ state: 'loading' }));
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
  } else if (q) {
    body = (
      <Results
        query={liveQuery(q, 'giftsets')}
        sample={searchProducts(q, filters)}
        loading={loadingBlock}
        failed={demoBlock}
        render={(raw) => {
          const results = visible(raw);
          return (
            <>
              <div className="row gap-8">
                <h2 className="t-15 w-700">Results for "{q}"</h2>
                <span className="t-11">{plural(results.length, 'idea')} for {p.name}</span>
                <span className="spacer" />
                <span className="t-11">{LIVE ? 'Searched the Shopify catalog · prices checked just now' : 'Searched 14 stores · prices checked 4 min ago'}</span>
              </div>
              {!LIVE && (
                <div className="row gap-6 wrap">
                  <span className="t-12 w-700">Matches by product type:</span>
                  {([['All', results.length], ['Pour-over coffee sets', results.filter((x) => x.type === 'brewing').length], ['Pour-over kettles', results.filter((x) => x.type === 'accessories').length], ['Other', results.filter((x) => x.type === 'giftsets').length]] as const)
                    .map(([l, n], i) => <Chip key={l} on={i === 0}>{l} · {n}</Chip>)}
                </div>
              )}
              {filterRow()}
              {results.length ? <div className="grid-4">{results.map((x) => card(x, results))}</div> : <EmptyState title="No results" body="Try a different search or relax a filter." />}
            </>
          );
        }}
      />
    );
  } else if (type) {
    const t = getType(type);
    body = (
      <>
        {changed && <ChangedNotice text={changed} onUndo={() => set({ changed: null, max: null, skip: null })} />}
        <Results
          query={liveQuery(t.query, type)}
          sample={productsByType(type, filters)}
          loading={loadingBlock}
          failed={demoBlock}
          render={(raw) => {
            const results = visible(raw);
            return (
              <>
                <div className="row gap-8">
                  <Button size="md" onClick={() => set({ type: null })}><Icon name="arrowRight" size={14} style={{ transform: 'rotate(180deg)' }} /> All types</Button>
                  <h2 className="t-15 w-700">{t.name}</h2>
                  <span className="t-11">{plural(LIVE ? results.length : ideaCount(type), 'idea')} for {p.name}</span>
                  <span className="spacer" />
                  {t.narrow.length > 0 && <span className="t-12 w-700">Narrow by:</span>}
                  {t.narrow.map((n) => <Chip key={n} large onClick={() => LIVE && set({ q: `${n} ${t.name}`.toLowerCase(), type: null })}>{n}</Chip>)}
                </div>
                {filterRow()}
                {results.length ? <div className="grid-3">{results.map((x) => card(x, results))}</div> : <EmptyState title={`No ${t.name.toLowerCase()} ideas within these filters`} body="Relax a filter or ask in words to see more." />}
                {state === 'limited' && <LimitedFilter hide={hideLimited} setHide={setHideLimited} />}
              </>
            );
          }}
        />
      </>
    );
  } else if (listEmpty && !params.get('view') && state !== 'limited') {
    body = LIVE
      ? <LiveStart ctx={ctx} maxPrice={maxBudget} intent={intent} onSearch={(query) => set({ q: query })} />
      : <StartView ctx={ctx} onType={(id) => set({ type: id })} />;
  } else {
    // Grouped ideas: by the person's interests (live) or by sample product type.
    const groups = LIVE
      ? (p.interests.length ? p.interests : ['Thoughtful']).slice(0, 3).map((i) => ({ key: i, name: i, query: `${i} gift`, type: 'giftsets' as ProductTypeId, sample: [] as Product[] }))
      : (['brewing', 'giftsets', 'accessories'] as ProductTypeId[]).map((id) => ({ key: id, name: getType(id).name, query: getType(id).query, type: id, sample: productsByType(id, filters) }));
    body = (
      <>
        {changed && <ChangedNotice text={changed} onUndo={() => set({ changed: null, max: null, skip: null })} />}
        {state === 'limited' && (
          <div className="notice">
            <div className="t-13 w-700">Some results have limited reviews</div>
            <div className="t-12">We could not find expert reviews or independent testing for some of these. They are still shown, marked clearly, and ranked lower.</div>
          </div>
        )}
        {filterRow()}
        {groups.map((g) => (
          <Results
            key={g.key}
            query={liveQuery(g.query, g.type)}
            sample={g.sample}
            loading={() => <GroupSkeleton name={g.name} />}
            failed={(retry) => (
              <div className="notice row gap-8" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <span className="t-12 w-700">{g.name}: live results are unavailable right now.</span>
                <span className="spacer" />
                <Button size="sm" onClick={retry}>Retry</Button>
              </div>
            )}
            render={(raw) => {
              const items = visible(raw);
              if (!items.length) return null;
              return (
                <section className="col gap-6" aria-label={g.name}>
                  <div className="group-head">
                    <h2 className="t-14 w-700">{g.name}</h2>
                    <span className="t-11">{plural(LIVE ? items.length : ideaCount(g.type), 'idea')}</span>
                    <span className="spacer" />
                    <button type="button" className="link-btn t-11" onClick={() => set(LIVE ? { q: g.query } : { type: g.type })}>See all →</button>
                  </div>
                  <div className="grid-3">{items.slice(0, 3).map((x) => card(x, items))}</div>
                </section>
              );
            }}
          />
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

/** Renders live catalog results (or sample data when not live) with loading and failure states. */
function Results({ query, sample, render, loading, failed }: {
  query: LiveQuery; sample: Product[];
  render: (list: Product[]) => React.ReactNode;
  loading: () => React.ReactNode;
  failed: (retry: () => void, reason?: string) => React.ReactNode;
}) {
  const res = useCatalog(LIVE ? query : null);
  if (!LIVE) return <>{render(sample)}</>;
  if (res.status === 'loading') return <>{loading()}</>;
  if (res.status === 'error') return <>{failed(res.retry, res.error)}</>;
  return <>{render(res.products)}</>;
}

function GroupSkeleton({ name }: { name: string }) {
  return (
    <section className="col gap-6" aria-busy="true" aria-label={`${name}, loading`}>
      <div className="group-head"><h2 className="t-14 w-700">{name}</h2><span className="t-11">Searching…</span></div>
      <div className="grid-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} blurb="" />)}</div>
    </section>
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
  const [, setParams] = useSearchParams();
  const p = person(ctx.personId);
  const ideas: { label: string; type: ProductTypeId; tint: 'blush' | 'sage' | 'peach'; query?: string }[] = LIVE && p.interests.length
    ? p.interests.slice(0, 3).map((i, n) => ({ label: `${i} gift`, type: 'giftsets', tint: (['blush', 'sage', 'peach'] as const)[n], query: `${i} gift` }))
    : [
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
              <span className="t-11">{LIVE ? `See ideas for ${p.name}` : `${plural(ideaCount(t.id), 'idea')} for ${p.name}`}</span>
            </span>
          </button>
        ))}
      </div>
      <section className="card card--dashed col gap-6" style={{ padding: 14, borderColor: 'var(--peach)' }}>
        <h2 className="t-14 w-700">Ideas based on what we know about {p.name}</h2>
        <div className="t-11">{p.summary.replace('wants durable, no subscription', 'no subscriptions') || 'Add interests to get ideas'}</div>
        <div className="row gap-10" style={{ marginTop: 4 }}>
          {ideas.map((i) => (
            <button key={i.label} type="button" className="idea" onClick={() => (i.query ? setParams({ q: i.query }) : onType(i.type))}>
              <Swatch tint={i.tint} size={34} radius={99} />
              <span className="col">
                <span className="t-12 w-700">{i.label}</span>
                <span className="t-10">{i.query ? 'Search the catalog' : getType(i.type).name}</span>
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
  const prods = useMemo(() => (LIVE ? [] : searchSuggestions.products.map(getProduct)), []);
  const types = LIVE ? productTypes.filter((t) => `${t.name} ${t.query}`.toLowerCase().includes(text.trim().toLowerCase().split(' ')[0] ?? '')).slice(0, 3) : [];
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
          {(LIVE ? types.length > 0 : true) && <div className="suggest__head">Product types</div>}
          {LIVE
            ? types.map((t) => (
              <button key={t.id} type="button" role="option" className="suggest__row" onClick={() => pick(() => onType(t.id))}>
                <Swatch tint={t.tint} size={28} radius={99} />
                <span className="col flex1"><span className="t-12 w-700">{t.name}</span><span className="t-10">{t.query}</span></span>
                <span className="t-11 w-700">See ideas</span>
              </button>
            ))
            : searchSuggestions.types.map((t) => (
              <button key={t.label} type="button" role="option" className="suggest__row" onClick={() => pick(() => onType(t.type))}>
                <Swatch tint={t.tint} size={28} radius={99} />
                <span className="col flex1"><span className="t-12 w-700">{t.label}</span><span className="t-10">{t.sub}</span></span>
                <span className="t-11 w-700">See ideas</span>
              </button>
            ))}
          {prods.length > 0 && <div className="suggest__head">Products</div>}
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

/** Live start view: categories built from the person's interests, each with a real product photo. */
function LiveStart({ ctx, maxPrice, intent, onSearch }: { ctx: ListCtx; maxPrice: number; intent: string; onSearch: (q: string) => void }) {
  const { person } = useApp();
  const p = person(ctx.personId);
  const who = p.relationship === 'Parent' ? (p.pronoun === 'she' ? 'mom' : p.pronoun === 'he' ? 'dad' : 'parent') : p.relationship.toLowerCase();
  const fromInterests = p.interests.flatMap((i) => [
    { label: `${i} gifts`, query: `${i} gift` },
    { label: `${i} essentials`, query: `${i} tools accessories` },
  ]);
  const general = [
    { label: 'Gift sets', query: `gift set for ${who}` },
    { label: 'Home & kitchen', query: 'home kitchen gift' },
    { label: 'Books', query: `${p.interests[0] ?? 'gift'} book` },
    { label: 'Experiences', query: `${p.interests[0] ?? ''} class experience gift` },
    { label: 'Self-care', query: 'self care gift set' },
  ];
  const tiles = [...fromInterests, ...general].slice(0, 8);
  const ideas = [...p.interests.slice(0, 3).map((i) => ({ label: `${i} gift for ${who}`, query: `${i} gift for ${who}` }))];
  return (
    <>
      <h2 className="t-14 w-700">Start with a product type</h2>
      <div className="grid-4" style={{ gap: 10 }}>
        {tiles.map((t) => <LiveTile key={t.label} label={t.label} query={t.query} maxPrice={maxPrice} intent={intent} who={p.name} onOpen={() => onSearch(t.query)} />)}
      </div>
      {ideas.length > 0 && (
        <section className="card card--dashed col gap-6" style={{ padding: 14, borderColor: 'var(--peach)' }}>
          <h2 className="t-14 w-700">Ideas based on what we know about {p.name}</h2>
          <div className="t-11">{p.summary || 'Add interests to get ideas'}</div>
          <div className="row gap-10" style={{ marginTop: 4 }}>
            {ideas.map((i) => <LiveIdea key={i.label} label={i.label} query={i.query} maxPrice={maxPrice} intent={intent} onOpen={() => onSearch(i.query)} />)}
          </div>
        </section>
      )}
    </>
  );
}

function LiveTile({ label, query, maxPrice, intent, who, onOpen }: { label: string; query: string; maxPrice: number; intent: string; who: string; onOpen: () => void }) {
  const res = useCatalog({ query, type: 'giftsets', maxPrice, intent, limit: 6 });
  const pick = res.products.find((x) => x.image);
  const sub = res.status === 'loading' ? 'Searching…' : res.status === 'error' ? 'Unavailable right now' : res.products.length ? `${plural(res.products.length, 'idea')} for ${who}` : 'No ideas in budget';
  return (
    <button type="button" className="type-tile" onClick={onOpen} title={res.status === 'error' ? res.error : undefined}>
      <span className="type-tile__img" style={{ background: pick ? `url("${pick.image}") center/cover, var(--${pick.tint})` : 'var(--surface-sunk)' }} />
      <span className="type-tile__body">
        <span className="t-13 w-700">{label}</span>
        <span className="t-11">{sub}</span>
      </span>
    </button>
  );
}

function LiveIdea({ label, query, maxPrice, intent, onOpen }: { label: string; query: string; maxPrice: number; intent: string; onOpen: () => void }) {
  const res = useCatalog({ query, type: 'giftsets', maxPrice, intent, limit: 6 });
  const top = res.products[0];
  return (
    <button type="button" className="idea" onClick={onOpen}>
      <Swatch tint={top?.tint ?? 'blush'} size={34} radius={99} image={top?.image} />
      <span className="col min0">
        <span className="t-12 w-700">{label}</span>
        <span className="t-10" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top ? `e.g. ${top.name}` : res.status === 'loading' ? 'Searching…' : 'Search the catalog'}</span>
      </span>
    </button>
  );
}
