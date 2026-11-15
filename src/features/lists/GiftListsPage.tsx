import { Link } from 'react-router-dom';
import { Avatar, Button, Swatch } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { getProduct } from '../../lib/api';
import { plain, shortDate } from '../../lib/format';
import './lists.css';

/** Gift lists by occasion (08a). */
export function GiftListsPage() {
  const { occasions, person, shortlist, isInCart, openModal } = useApp();
  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Gift lists by occasion</h1>
        <span className="spacer" />
        <Button onClick={() => openModal({ kind: 'newOccasion' })}>+ New occasion</Button>
      </div>
      {occasions.filter((o) => !o.reminderOnly).map((o) => {
        const list = shortlist.filter((s) => s.occasionId === o.id);
        const planned = list.filter((s) => s.status === 'Selected' || isInCart(s.productId, s.personId, s.occasionId)).reduce((t, s) => t + getProduct(s.productId).price, 0);
        return (
          <section key={o.id} className="card col gap-12" style={{ padding: 14 }} aria-label={o.name}>
            <div className="row gap-12">
              <h2 className="serif t-18" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>{o.name}</h2>
              <span className="t-12">{shortDate(o.date)} · {plain(o.budget)} budget{o.people.length > 1 ? ` · ${plain(planned)} planned` : ''}</span>
              <span className="spacer" />
              <button type="button" className="link-btn link-btn--accent t-11" onClick={() => openModal({ kind: 'addPerson' })}>+ Add person</button>
            </div>
            <div className="grid-3">
              {o.people.map(({ personId, budget }) => {
                const p = person(personId);
                const items = list.filter((s) => s.personId === personId);
                const spent = items.filter((s) => s.status === 'Selected' || isInCart(s.productId, s.personId, s.occasionId)).reduce((t, s) => t + getProduct(s.productId).price, 0);
                const base = `/lists/${o.id}/${personId}`;
                return (
                  <div key={personId} className="list-person">
                    <div className="row gap-10">
                      <Avatar initial={p.initial} size="md" />
                      <span className="t-14 w-700">{p.name}</span>
                      <span className="spacer" />
                      <span className="t-11">{plain(spent)} / {plain(budget)}</span>
                    </div>
                    {items.length ? (
                      <div className="row gap-6">
                        {items.slice(0, 3).map((s) => <Swatch key={s.productId} tint={getProduct(s.productId).tint} size={46} />)}
                        {items.length > 3 && <span className="t-11" style={{ marginLeft: 4 }}>+{items.length - 3}</span>}
                      </div>
                    ) : (
                      <Link to={base} className="t-11">Nothing yet. Find ideas →</Link>
                    )}
                    <Link to={`${base}/shortlist`} className="t-12 w-700">Open list →</Link>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
