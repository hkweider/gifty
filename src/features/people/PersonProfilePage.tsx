import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar, Button } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { getProduct } from '../../lib/api';
import { daysUntil, plural, shortDate } from '../../lib/format';
import { GiftHistory } from '../lists/AboutTab';
import { FindGiftsMenu } from './PeoplePage';
import '../lists/lists.css';
import './people.css';

/** Person profile (14, 14b). */
export function PersonProfilePage() {
  const { personId = '' } = useParams();
  const { people, occasions, shortlist, isInCart, openModal } = useApp();
  const navigate = useNavigate();
  const p = people.find((x) => x.id === personId);
  if (!p) return <Navigate to="/people" replace />;
  const occ = occasions.filter((o) => o.people.some((x) => x.personId === p.id));
  const xmas = occ.find((o) => o.id === 'christmas-2026');
  const planned = xmas ? shortlist.filter((s) => s.personId === p.id && s.occasionId === xmas.id && (s.status === 'Selected' || isInCart(s.productId, s.personId, s.occasionId))).reduce((t, s) => t + getProduct(s.productId).price, 0) : 0;

  return (
    <div className="page">
      <nav className="breadcrumb"><Link to="/people" className="w-700">People</Link><span>/ {p.name}</span></nav>
      <div className="row gap-16">
        <Avatar initial={p.initial} size="xl" />
        <div className="col gap-2">
          <h1 className="page-title" style={{ fontSize: 26 }}>{p.name}</h1>
          <span className="t-13">{p.relationship} · {plural(occ.length, 'occasion')}{xmas ? ` · $${planned} planned this Christmas` : ''}</span>
        </div>
        <span className="spacer" />
        <FindGiftsMenu person={p} primary />
        <Button style={{ minHeight: 44 }}>Edit</Button>
      </div>
      <div className="row gap-30" style={{ alignItems: 'flex-start', gap: 32 }}>
        <section className="col gap-16" style={{ width: 360, flex: 'none' }}>
          <h2 className="t-16 w-700">Preferences</h2>
          <PrefCard title="Interests">{editableChips(p.interests)}</PrefCard>
          <PrefCard title="Avoids">{editableChips(p.avoids)}</PrefCard>
          <PrefCard title="Already owns">
            <div className="t-13">{p.owns.join(' · ') || 'Nothing added yet'}</div>
            <button type="button" className="link-btn t-12" style={{ alignSelf: 'flex-start' }}>+ add</button>
          </PrefCard>
          <PrefCard title="Sizes and details">
            <div className="row gap-14">
              {(['shirt', 'shoe', 'phone'] as const).map((k) => (
                <label key={k} className="flex1 col gap-4"><span className="t-11 w-700">{k[0].toUpperCase() + k.slice(1)}</span><input className="input" style={{ minHeight: 36 }} defaultValue={p.sizes[k]} /></label>
              ))}
            </div>
            <div className="t-12">Allergies and restrictions: none noted</div>
          </PrefCard>
          <PrefCard title="Style and price comfort">
            <div className="row gap-6">{(['Practical', 'Sentimental', 'Luxe'] as const).map((s) => <span key={s} className={`chip${p.style === s ? ' chip--on' : ''}`}>{s}{p.style === s ? ' ✓' : ''}</span>)}</div>
            <div className="t-13">Usual spend per gift: {p.usualSpend || 'not set'}</div>
            <div className="t-13">Favourite stores: {p.stores.join(' · ') || 'any'}</div>
          </PrefCard>
          <p className="t-11 muted">Only you can see this profile. It is used to rank and explain gift ideas.</p>
        </section>
        <div className="flex1 col gap-24" style={{ gap: 24 }}>
          <GiftHistory person={p} />
          <section className="col gap-10">
            <div className="row">
              <h2 className="t-16 w-700">Occasions for {p.name}</h2>
              <span className="spacer" />
              <button type="button" className="link-btn t-12" onClick={() => openModal({ kind: 'newOccasion', personId: p.id })}>+ Add occasion</button>
            </div>
            <div className="card">
              {occ.map((o, i) => {
                const b = o.people.find((x) => x.personId === p.id)?.budget ?? 0;
                const n = shortlist.filter((s) => s.personId === p.id && s.occasionId === o.id).length;
                return (
                  <div key={o.id} className="row" style={{ padding: '12px 16px', borderTop: i ? '1px solid var(--line)' : 0 }}>
                    <span className="t-14 w-700" style={{ width: 172 }}>{o.name}</span>
                    <span className="t-13" style={{ width: 182 }}>{shortDate(o.date)} · {daysUntil(o.date)} days</span>
                    <span className="t-13 flex1">{o.reminderOnly ? 'Reminder only' : `Budget $${b} · ${n ? `${n} on list` : 'none yet'}`}</span>
                    <button type="button" className="link-btn t-13" onClick={() => navigate(`/lists/${o.id}/${p.id}/shortlist`)}>Open list →</button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PrefCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card col gap-10" style={{ padding: 16, borderRadius: 14 }}><h3 className="t-14 w-700">{title}</h3>{children}</section>;
}

function editableChips(list: string[]) {
  return (
    <div className="row gap-6 wrap">
      {list.map((i) => <span key={i} className="chip">{i} ×</span>)}
      <button type="button" className="chip">+ add</button>
    </div>
  );
}
