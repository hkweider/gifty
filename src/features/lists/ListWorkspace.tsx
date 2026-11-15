import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { Avatar, LinkButton, Meter } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { getProduct } from '../../lib/api';
import { money } from '../../lib/format';
import { FindGifts } from './FindGifts';
import { ShortlistTab } from './ShortlistTab';
import { AboutTab } from './AboutTab';
import { ProductDrawer } from './ProductDrawer';
import { CompareModal } from './CompareModal';
import { AskRail } from './AskRail';
import { ChatIcon } from '../../components/Icon';
import './lists.css';

export type Tab = 'shortlist' | 'find' | 'about';

export interface ListCtx {
  personId: string;
  occasionId: string;
  budget: number;
  openProduct: (id: string, ids?: string[]) => void;
  openCompare: (ids: string[]) => void;
}

/** One person's list for one occasion: Shortlist · Find gifts · About <person>. */
export function ListWorkspace() {
  const { occasionId = '', personId = '', tab } = useParams();
  const { occasions, person, occasion, shortlist, isInCart } = useApp();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [compareIds, setCompareIds] = useState<string[] | null>(null);
  const [productSet, setProductSet] = useState<string[]>([]);
  const [askOpen, setAskOpen] = useState(false);

  const occ = occasions.find((o) => o.id === occasionId);
  const entry = occ?.people.find((p) => p.personId === personId);
  if (!occ || !entry) return <Navigate to="/lists" replace />;

  const p = person(personId);
  const o = occasion(occasionId);
  const items = shortlist.filter((s) => s.personId === personId && s.occasionId === occasionId);
  const planned = items
    .filter((s) => s.status === 'Selected' || isInCart(s.productId, personId, occasionId))
    .reduce((t, s) => t + getProduct(s.productId).price, 0);
  const active: Tab = tab === 'shortlist' || tab === 'about' ? tab : 'find';
  const base = `/lists/${occasionId}/${personId}`;
  const productId = params.get('product');

  const ctx: ListCtx = {
    personId, occasionId, budget: entry.budget,
    openProduct: (id, ids) => {
      if (ids) setProductSet(ids);
      const next = new URLSearchParams(params);
      next.set('product', id);
      setParams(next);
    },
    openCompare: (ids) => setCompareIds(ids),
  };
  const closeProduct = () => {
    const next = new URLSearchParams(params);
    next.delete('product');
    setParams(next);
  };

  return (
    <div className={`ws${askOpen && active === 'find' ? ' ws--with-rail' : ''}`}>
      <div className="ws__main">
        <header className="ws__head">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/lists" className="w-700">Gift lists</Link>
            <span>/ {o.name} / {p.name}</span>
          </nav>
          <div className="row gap-12">
            <Avatar initial={p.initial} size="lg" />
            <div className="col gap-2">
              <h1 className="ws__title">{p.name} · {o.name}</h1>
              <div className="t-11">
                {p.summary || 'No preferences yet'} · <button type="button" className="link-btn t-11" style={{ fontWeight: 400 }} onClick={() => navigate(`${base}/about`)}>Edit</button>
              </div>
            </div>
            <span className="spacer" />
            <div className="ws__budget">
              <div className="row gap-6">
                <span className="t-11 w-700">{money(planned, { cents: false })} of {money(entry.budget, { cents: false })} planned</span>
                <span className="spacer" />
                <LinkButton underline className="t-11" onClick={() => navigate(`/people/${personId}`)}>Edit budget</LinkButton>
              </div>
              <Meter value={planned / (entry.budget || 1)} dark boxed />
            </div>
          </div>
          <div className="tabs" role="tablist">
            <TabLink to={`${base}/shortlist`} on={active === 'shortlist'}>Shortlist{items.length ? ` · ${items.length}` : ''}</TabLink>
            <TabLink to={base} on={active === 'find'}>Find gifts</TabLink>
            <TabLink to={`${base}/about`} on={active === 'about'}>About {p.name}</TabLink>
          </div>
        </header>

        {active === 'find' && <FindGifts ctx={ctx} />}
        {active === 'shortlist' && <ShortlistTab ctx={ctx} />}
        {active === 'about' && <AboutTab personId={personId} />}
      </div>

      {active === 'find' && askOpen && <AskRail ctx={ctx} onClose={() => setAskOpen(false)} />}
      {active === 'find' && !askOpen && (
        <button type="button" className="fab fab--raised" aria-label={`Ask about ${p.name}`} onClick={() => setAskOpen(true)}>
          <ChatIcon />
        </button>
      )}

      {productId && (
        <ProductDrawer
          ctx={ctx}
          productId={productId}
          siblings={productSet}
          onNavigate={(id) => ctx.openProduct(id)}
          onClose={closeProduct}
          onCompare={(id) => setCompareIds([id, ...productSet.filter((x) => x !== id).slice(0, 2)])}
        />
      )}
      {compareIds && <CompareModal ctx={ctx} ids={compareIds} onClose={() => setCompareIds(null)} />}
    </div>
  );
}

function TabLink({ to, on, children }: { to: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link to={to} role="tab" aria-selected={on} className="tab">{children}</Link>
  );
}
