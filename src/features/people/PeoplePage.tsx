import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, useDismiss } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { plural, shortDate } from '../../lib/format';
import type { Person } from '../../data/types';
import './people.css';

/** People (13): everyone you give gifts to. */
export function PeoplePage() {
  const { people, openModal } = useApp();
  const [q, setQ] = useState('');
  const list = people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">People</h1>
        <span className="t-12">Everyone you give gifts to</span>
        <span className="spacer" />
        <input className="input" style={{ width: 220, minHeight: 36 }} placeholder="Search people…" aria-label="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="primary" size="md" style={{ minHeight: 40 }} onClick={() => openModal({ kind: 'addPerson' })}>+ Add person</Button>
      </div>
      <div className="people-grid">
        {list.map((p) => <PersonCard key={p.id} p={p} />)}
        <button type="button" className="add-tile" onClick={() => openModal({ kind: 'addPerson' })}>+ Add person</button>
      </div>
    </div>
  );
}

function PersonCard({ p }: { p: Person }) {
  const { occasions } = useApp();
  const navigate = useNavigate();
  const occ = occasions.filter((o) => o.people.some((x) => x.personId === p.id));
  const loved = p.history.filter((h) => h.reaction === 'Loved').length;
  const liked = p.history.filter((h) => h.reaction === 'Liked').length;
  const last = p.history[0];
  return (
    <article className="card person-card">
      <div className="row gap-10">
        <Avatar initial={p.initial} size="lg" />
        <div className="col">
          <h2 className="t-18 w-700">{p.name}</h2>
          <span className="t-11">{p.relationship}</span>
        </div>
        <span className="spacer" />
        <button type="button" className="link-btn t-11" onClick={() => navigate(`/people/${p.id}`)}>Edit</button>
      </div>
      <div className="col gap-4">
        <div className="t-11 w-700 muted">Preferences</div>
        <div className="row gap-6 wrap">{p.interests.map((i) => <span key={i} className="chip">{i}</span>)}</div>
        <div className="t-11">Avoids: {p.avoids.length ? p.avoids.join(', ').toLowerCase() : 'not set yet'}</div>
      </div>
      <div className="col gap-2">
        <div className="t-11 w-700 muted">Gift history</div>
        {p.history.length ? (
          <>
            <div className="t-12">{plural(p.history.length, 'gift')} given · {loved} loved, {liked} liked</div>
            <div className="t-10 muted">Last: {last.name} · {last.occasion} · {last.reaction}</div>
          </>
        ) : (
          <><div className="t-12">No gifts yet</div><div className="t-10 muted">Start with a few preferences</div></>
        )}
      </div>
      <div className="col gap-4">
        <div className="t-11 w-700 muted">Occasions</div>
        <div className="row gap-6 wrap">{occ.map((o) => <span key={o.id} className="chip">{o.shortName === 'birthday' ? 'Birthday' : o.name.replace(/ \d{4}$/, '')}</span>)}</div>
      </div>
      <div className="row gap-8" style={{ marginTop: 'auto' }}>
        <Button variant="primary" grow onClick={() => navigate(`/people/${p.id}`)}>Open profile →</Button>
        <FindGiftsMenu person={p} />
      </div>
    </article>
  );
}

/** "Find gifts ▾": choose which occasion to shop for (14b). */
export function FindGiftsMenu({ person: p, primary }: { person: Person; primary?: boolean }) {
  const { occasions, shortlist, openModal } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const occ = occasions.filter((o) => o.people.some((x) => x.personId === p.id));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Button variant={primary ? 'primary' : 'outline'} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} style={primary ? { minHeight: 44 } : undefined}>
        {primary ? `Find gifts for ${p.name}` : 'Find gifts'} ▾
      </Button>
      {open && (
        <div className="menu occ-menu" role="menu">
          <div className="t-11 w-700" style={{ padding: '10px 16px' }}>Find gifts for {p.name} · choose an occasion</div>
          {occ.map((o) => {
            const b = o.people.find((x) => x.personId === p.id)?.budget ?? 0;
            const n = shortlist.filter((s) => s.personId === p.id && s.occasionId === o.id).length;
            return (
              <button key={o.id} role="menuitem" type="button" className="menu__item occ-menu__item" onClick={() => navigate(`/lists/${o.id}/${p.id}`)}>
                <span className="flex1 col">
                  <span className="t-14 w-600">{o.name}</span>
                  <span className="t-11">{shortDate(o.date)} · {o.reminderOnly ? 'reminder only' : `budget $${b} · ${n ? `${n} on list` : 'none yet'}`}</span>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            );
          })}
          <button role="menuitem" type="button" className="menu__item occ-menu__item t-12 w-700" onClick={() => openModal({ kind: 'newOccasion', personId: p.id })}>+ New occasion for {p.name}</button>
        </div>
      )}
    </div>
  );
}
