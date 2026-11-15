import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import giftIllustration from '../../assets/illustration-gift.png';
import kettleImg from '../../assets/products/aurora-kettle.jpg';
import { Avatar } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useApp } from '../../store/AppStore';
import { giftGuides } from '../../data/sample';
import type { Person, Product, Tint } from '../../data/types';
import { getProduct, LIVE } from '../../lib/api';
import { useCatalog } from '../../lib/useCatalog';
import './explore.css';

const OCCASIONS = ['Birthday', 'Christmas', 'Thank you', 'Anniversary', 'Housewarming', 'Just because', 'Wedding'];

/** Explore (15): search hero, occasion chips, gift guides, ideas for your people. Guides and people tiles use live catalog results. */
export function ExplorePage() {
  const { people, occasions, shortlist, openModal } = useApp();
  const navigate = useNavigate();
  const [occ, setOcc] = useState('Christmas');
  const [q, setQ] = useState('');
  const firstOcc = (pid: string) => occasions.find((o) => o.people.some((x) => x.personId === pid) && !o.reminderOnly);
  // Explore searches open in the first person's list, so results can be shortlisted for someone.
  const openSearch = (query: string, max?: number) => {
    const p = people[0];
    const o = p && firstOcc(p.id);
    if (o && query.trim()) navigate(`/lists/${o.id}/${p.id}?q=${encodeURIComponent(query.trim())}${max ? `&max=${max}` : ''}`);
  };
  const occasionWord = occ.toLowerCase();

  return (
    <div className="explore">
      <section className="explore__hero">
        <div className="row gap-12" style={{ justifyContent: 'center' }}>
          <img src={giftIllustration} alt="" className="explore__gift" />
          <h1 className="explore__title">Find the perfect gift</h1>
        </div>
        <form className="explore__search" role="search" onSubmit={(e) => { e.preventDefault(); openSearch(q); }}>
          <Icon name="search" size={18} stroke={1.8} style={{ color: 'var(--muted)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for a gift, or describe who it's for…" aria-label="Search for a gift" />
          <button type="submit" className="explore__go" aria-label="Search"><Icon name="arrowUp" size={16} stroke={2} style={{ color: '#fff' }} /></button>
        </form>
      </section>
      <div className="explore__body">
        <div className="row gap-8 wrap" role="radiogroup" aria-label="Occasion">
          {OCCASIONS.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={occ === o} className={`occ-chip${occ === o ? ' is-on' : ''}`} onClick={() => setOcc(o)}>{o}</button>
          ))}
        </div>
        <SectionHead title="Popular gift guides" />
        <div className="explore__grid">
          {giftGuides.map((g) => {
            const max = 'max' in g ? (g.max as number) : undefined;
            const query = `${occasionWord} ${g.query}`;
            const title = g.id === 'g1' ? `${occ} gifts for the coffee lover` : g.title;
            return <GuideCard key={g.id} title={title} body={g.body} tiles={g.tiles} query={query} max={max} onOpen={() => openSearch(query, max)} />;
          })}
        </div>
        <SectionHead title="Ideas for your people" />
        <div className="explore__grid">
          {people.slice(0, 3).map((p) => {
            const o = firstOcc(p.id);
            const listed = shortlist.filter((s) => s.personId === p.id).slice(0, 3).map((s) => getProduct(s.productId));
            return (
              <PersonTile key={p.id} person={p} occasionLabel={o?.shortName === 'birthday' ? 'Birthday' : o?.shortName ?? ''} listed={listed}
                onOpen={() => o && navigate(`/lists/${o.id}/${p.id}`)} />
            );
          })}
          <button type="button" className="add-tile" style={{ minHeight: 0, borderRadius: 16 }} onClick={() => openModal({ kind: 'addPerson' })}>+ Add person</button>
        </div>
      </div>
    </div>
  );
}

const tileBg = (t: string, p?: Product) => (p?.image ? `url("${p.image}") center/cover, var(--${p.tint})` : t === 'image' ? `url(${kettleImg}) center/cover` : `var(--${t})`);

function GuideCard({ title, body, tiles, query, max, onOpen }: { title: string; body: string; tiles: readonly string[]; query: string; max?: number; onOpen: () => void }) {
  const res = useCatalog(LIVE ? { query, type: 'giftsets', maxPrice: max, limit: 6 } : null);
  const picks = res.products.filter((x) => x.image).slice(0, 3);
  const count = LIVE && res.status === 'ready' ? `${res.products.length} ideas from the Shopify catalog.` : null;
  return (
    <button type="button" className="guide" onClick={onOpen} style={{ textAlign: 'left', padding: 0 }}>
      <div className="guide__tiles" aria-hidden="true">
        {tiles.map((t, i) => <span key={i} style={{ background: LIVE ? (picks[i] ? tileBg(t, picks[i]) : `var(--${t === 'image' ? 'surface-sunk' : t})`) : tileBg(t) }} />)}
      </div>
      <div className="col gap-4" style={{ padding: '12px 14px 14px', flex: 1 }}>
        <div className="row gap-8"><h3 className="t-14 w-700 flex1">{title}</h3><Icon name="chevronRight" size={14} stroke={2} /></div>
        <p className="t-12 muted" style={{ lineHeight: 1.45 }}>{count ?? body}</p>
      </div>
    </button>
  );
}

function PersonTile({ person: p, occasionLabel, listed, onOpen }: { person: Person; occasionLabel: string; listed: Product[]; onOpen: () => void }) {
  const query = p.interests[0] ? `${p.interests[0]} gift` : 'thoughtful gift';
  const res = useCatalog(LIVE && listed.length < 3 ? { query, type: 'giftsets', limit: 6 } : null);
  const picks = [...listed, ...res.products.filter((x) => x.image)].slice(0, 3);
  const fallback: Tint[] = ['butter', 'sage', 'sky'];
  return (
    <button type="button" className="person-tile" onClick={onOpen}>
      <span className="row gap-10">
        <Avatar initial={p.initial} size="md" />
        <span className="col flex1" style={{ alignItems: 'flex-start' }}>
          <span className="t-14 w-700">{p.name}</span>
          <span className="t-12">{p.interests.slice(0, 2).join(', ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) || 'No interests yet'}{occasionLabel ? ` · ${occasionLabel}` : ''}</span>
        </span>
        <Icon name="chevronRight" size={14} stroke={2} />
      </span>
      <span className="row gap-6">
        {[0, 1, 2].map((i) => (
          <span key={i} className="person-tile__sw" title={picks[i]?.name} style={{ background: picks[i] ? tileBg('', picks[i]) : `var(--${fallback[i]})` }} />
        ))}
      </span>
    </button>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="row gap-8">
      <h2 className="serif" style={{ fontSize: 17, fontWeight: 600 }}>{title}</h2>
      <span className="spacer" />
      <button type="button" className="link-btn link-btn--accent t-13" style={{ fontWeight: 600 }}>View all</button>
      <button type="button" className="round-btn" aria-label="Previous"><Icon name="chevronLeft" size={12} stroke={2} /></button>
      <button type="button" className="round-btn" aria-label="Next"><Icon name="chevronRight" size={12} stroke={2} /></button>
    </div>
  );
}
