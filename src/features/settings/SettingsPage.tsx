import { useApp } from '../../store/AppStore';
import { daysUntil, shortDate } from '../../lib/format';
import './settings.css';

const SECTIONS = ['Budgets & people', 'Occasions', 'Preferences', 'Shipping & location', 'Sources & data', 'Account'];

/** Settings (11). Reached from the account row; not in the side nav. */
export function SettingsPage() {
  const { people, occasions, openModal } = useApp();
  const xmas = occasions.find((o) => o.id === 'christmas-2026');
  const bday = (pid: string) => occasions.find((o) => o.shortName === 'birthday' && o.people.some((x) => x.personId === pid));
  return (
    <div className="settings">
      <nav className="settings__nav" aria-label="Settings sections">
        {SECTIONS.map((s, i) => <a key={s} href={`#s${i}`} className={i === 0 ? 'is-active' : ''}>{s}</a>)}
      </nav>
      <div className="settings__body">
        <h1 className="t-18 w-700" id="s0">Budgets &amp; people</h1>
        <section className="card set-card">
          <div className="set-grid set-grid--head"><span /><span>Christmas</span><span>Birthday</span><span>Interests</span><span /></div>
          {people.map((p) => (
            <div key={p.id} className="set-grid">
              <span className="t-13 w-700">{p.name}</span>
              <input className="input" aria-label={`${p.name} Christmas budget`} placeholder="$" defaultValue={xmas?.people.find((x) => x.personId === p.id)?.budget ? `$${xmas?.people.find((x) => x.personId === p.id)?.budget}` : ''} />
              <input className="input" aria-label={`${p.name} birthday budget`} placeholder="$" defaultValue={bday(p.id) ? `$${bday(p.id)!.budget}` : ''} />
              <input className="input" aria-label={`${p.name} interests`} placeholder="Interests…" defaultValue={p.interests.join(', ')} />
              <button type="button" className="link-btn t-11" style={{ fontWeight: 400 }}>Edit</button>
            </div>
          ))}
          <button type="button" className="link-btn link-btn--accent t-11" style={{ alignSelf: 'flex-start' }} onClick={() => openModal({ kind: 'addPerson' })}>+ Add person</button>
        </section>
        <section className="card set-card" id="s1">
          <h2 className="t-13 w-700">Occasions</h2>
          {occasions.filter((o) => !o.reminderOnly).map((o) => (
            <div key={o.id} className="row gap-8">
              <span className="t-13 w-700" style={{ width: 162 }}>{o.name}</span>
              <span className="t-12" style={{ width: 146 }}>{shortDate(o.date)} · {daysUntil(o.date)} days</span>
              <label className="check"><input type="checkbox" />Repeats yearly</label>
              <button type="button" className="link-btn t-11" style={{ fontWeight: 400, marginLeft: 12 }}>Edit</button>
            </div>
          ))}
          <button type="button" className="link-btn link-btn--accent t-11" style={{ alignSelf: 'flex-start' }} onClick={() => openModal({ kind: 'newOccasion' })}>+ New occasion</button>
        </section>
        <section className="card set-card" id="s3">
          <h2 className="t-13 w-700">Currency &amp; location</h2>
          <div className="row gap-8">
            <input className="input" style={{ width: 110 }} defaultValue="CAD" aria-label="Currency" />
            <input className="input" style={{ width: 220 }} placeholder="Toronto, ON · postal code" aria-label="Location" />
          </div>
        </section>
        <section className="card set-card" id="s2">
          <h2 className="t-13 w-700">Preferences</h2>
          {['Exclude stores I choose (e.g. Amazon)', 'Prefer free shipping', 'Hide items that need a subscription', 'Show only items with a known return policy'].map((l) => (
            <label key={l} className="check"><input type="checkbox" />{l}</label>
          ))}
        </section>
        <section className="card set-card" id="s4">
          <h2 className="t-13 w-700">Sources &amp; data</h2>
          <div className="row gap-6">
            <span className="chip">Live Shopify Catalog ✓</span>
            <span className="chip">Expert reviews: links only</span>
            <span className="chip">Consumer Reports: not accessed</span>
          </div>
          <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }}>Switch to demo data</button>
        </section>
      </div>
    </div>
  );
}
