import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import giftIllustration from '../../assets/illustration-gift.png';
import kettleImg from '../../assets/products/aurora-kettle.jpg';
import { Avatar } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useApp } from '../../store/AppStore';
import { giftGuides } from '../../data/sample';
import { getProduct } from '../../lib/api';
import './explore.css';

const OCCASIONS = ['Birthday', 'Christmas', 'Thank you', 'Anniversary', 'Housewarming', 'Just because', 'Wedding'];

/** Explore (15): search hero, occasion chips, gift guides, ideas for your people. */
export function ExplorePage() {
  const { people, occasions, shortlist, openModal } = useApp();
  const navigate = useNavigate();
  const [occ, setOcc] = useState('Christmas');
  const [q, setQ] = useState('');
  const firstOcc = (pid: string) => occasions.find((o) => o.people.some((x) => x.personId === pid) && !o.reminderOnly);
  return (
    <div className="explore">
      <section className="explore__hero">
        <div className="row gap-12" style={{ justifyContent: 'center' }}>
          <img src={giftIllustration} alt="" className="explore__gift" />
          <h1 className="explore__title">Find the perfect gift</h1>
        </div>
        <form className="explore__search" role="search" onSubmit={(e) => { e.preventDefault(); const p = people[0]; const o = firstOcc(p.id); if (o && q.trim()) navigate(`/lists/${o.id}/${p.id}?q=${encodeURIComponent(q.trim())}`); }}>
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
          {giftGuides.map((g) => (
            <article key={g.id} className="guide">
              <div className="guide__tiles">
                {g.tiles.map((t, i) => (
                  <span key={i} style={t === 'image' ? { background: `url(${kettleImg}) center/cover` } : { background: `var(--${t})` }} />
                ))}
              </div>
              <div className="col gap-4" style={{ padding: '12px 14px 14px', flex: 1 }}>
                <div className="row gap-8"><h3 className="t-14 w-700 flex1">{g.title}</h3><Icon name="chevronRight" size={14} stroke={2} /></div>
                <p className="t-12 muted" style={{ lineHeight: 1.45 }}>{g.body}</p>
              </div>
            </article>
          ))}
        </div>
        <SectionHead title="Ideas for your people" />
        <div className="explore__grid">
          {people.slice(0, 3).map((p) => {
            const o = firstOcc(p.id);
            const items = shortlist.filter((s) => s.personId === p.id).slice(0, 3).map((s) => getProduct(s.productId).tint);
            const tints = [...items, 'butter', 'sage', 'sky'].slice(0, 3);
            return (
              <button key={p.id} type="button" className="person-tile" onClick={() => o && navigate(`/lists/${o.id}/${p.id}`)}>
                <span className="row gap-10">
                  <Avatar initial={p.initial} size="md" />
                  <span className="col flex1" style={{ alignItems: 'flex-start' }}>
                    <span className="t-14 w-700">{p.name}</span>
                    <span className="t-12">{p.interests.slice(0, 2).join(', ').toLowerCase().replace(/^./, (c) => c.toUpperCase())} · {o?.shortName === 'birthday' ? 'Birthday' : o?.shortName}</span>
                  </span>
                  <Icon name="chevronRight" size={14} stroke={2} />
                </span>
                <span className="row gap-6">{tints.map((t, i) => <span key={i} className="person-tile__sw" style={{ background: `var(--${t})` }} />)}</span>
              </button>
            );
          })}
          <button type="button" className="add-tile" style={{ minHeight: 0, borderRadius: 16 }} onClick={() => openModal({ kind: 'addPerson' })}>+ Add person</button>
        </div>
      </div>
    </div>
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
