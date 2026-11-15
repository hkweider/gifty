import { useNavigate } from 'react-router-dom';
import { Button, Swatch } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { money } from '../../lib/format';
import type { Person } from '../../data/types';

/** About <person> tab (08f): preferences summary and gift history. */
export function AboutTab({ personId }: { personId: string }) {
  const { person } = useApp();
  const navigate = useNavigate();
  const p = person(personId);
  const sizes = [p.sizes.shirt && `Shirt ${p.sizes.shirt}`, p.sizes.shoe && `Shoe ${p.sizes.shoe}`, p.sizes.phone && `Phone ${p.sizes.phone}`].filter(Boolean).join(' · ');
  return (
    <div className="row gap-20" style={{ alignItems: 'flex-start' }}>
      <section className="col gap-10" style={{ width: 400, flex: 'none' }}>
        <div className="row" style={{ minHeight: 34 }}>
          <h2 className="t-16 w-700">Preferences</h2>
          <span className="spacer" />
          <button type="button" className="link-btn" onClick={() => navigate(`/people/${personId}`)}>Edit</button>
        </div>
        <div className="card" style={{ padding: '2px 16px' }}>
          <PrefRow label="Interests">{chips(p.interests)}</PrefRow>
          <PrefRow label="Avoids">{chips(p.avoids)}</PrefRow>
          <PrefRow label="Already owns"><span className="t-12">{p.owns.join(' · ') || 'Not set yet'}</span></PrefRow>
          <PrefRow label="Sizes"><span className="t-12">{sizes || 'Not set yet'}</span></PrefRow>
          <PrefRow label="Style"><span className="chip chip--on">{p.style}</span></PrefRow>
          <PrefRow label="Usual spend"><span className="t-12">{p.usualSpend ? `${p.usualSpend} per gift` : 'Not set yet'}</span></PrefRow>
          <PrefRow label="Stores"><span className="t-12">{p.stores.join(' · ') || 'Any'}</span></PrefRow>
        </div>
        <p className="t-11">Only you can see this profile. It is used to rank and explain ideas.</p>
      </section>
      <GiftHistory person={p} />
    </div>
  );
}

function chips(list: string[]) {
  return list.length
    ? <span className="row gap-6 wrap">{list.map((i) => <span key={i} className="chip">{i}</span>)}</span>
    : <span className="t-12 muted">Not set yet</span>;
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="pref-row"><span>{label}</span>{children}</div>;
}

export function GiftHistory({ person: p, compactHead }: { person: Person; compactHead?: boolean }) {
  const loved = p.history.filter((h) => h.reaction === 'Loved').map((h) => h.name);
  return (
    <section className="flex1 col gap-10">
      <div className="row" style={{ minHeight: compactHead ? 34 : 44 }}>
        <h2 className="t-16 w-700">Gift history</h2>
        <span className="spacer" />
        <Button>+ Add past gift</Button>
      </div>
      {p.history.length ? (
        <div className="card">
          {p.history.map((h) => (
            <div key={h.id} className="history-row">
              <Swatch tint={h.tint} size={44} />
              <div className="flex1 col gap-2">
                <span className="t-14 w-700">{h.name}</span>
                <span className="t-12">{h.occasion} · {h.store}</span>
                {h.note && <span className="t-12 muted">{h.note}</span>}
              </div>
              <span className="t-13 w-700">{money(h.price, { cents: false })}</span>
              <span className="reaction">{h.reaction}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card card--dashed card--pad t-12 muted">No gifts yet. Add a past gift so ideas avoid repeats.</div>
      )}
      {loved.length > 0 && (
        <div className="notice notice--dashed" style={{ flexDirection: 'row', gap: 30, padding: '12px 14px', borderRadius: 14 }}>
          <span className="t-12 w-700" style={{ width: 50 }}>Avoid repeats</span>
          <span className="t-12">{loved.join(' and ')} {loved.length > 1 ? 'were' : 'was'} loved, so ideas will not suggest the same items.</span>
        </div>
      )}
    </section>
  );
}
