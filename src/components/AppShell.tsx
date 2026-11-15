import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import logo from '../assets/gifty-logo.png';
import { Icon, type IconName } from './Icon';
import { Avatar } from './ui';
import { CartWidget } from './CartWidget';
import { useApp } from '../store/AppStore';
import { USER } from '../data/sample';
import { shortDate } from '../lib/format';
import { AddPersonModal } from '../features/people/AddPersonModal';
import { NewOccasionModal } from '../features/people/NewOccasionModal';
import { ToastHost } from './ToastHost';
import './shell.css';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/lists', label: 'Gift lists', icon: 'lists' },
  { to: '/people', label: 'People', icon: 'people' },
  { to: '/purchases', label: 'Purchases', icon: 'bag' },
  { to: '/explore', label: 'Explore', icon: 'compass' },
];

export function Logo() {
  return <img className="logo" src={logo} alt="Gifty" />;
}

/** Signed-in app frame: side nav (Settings is not in the nav), cart widget on every screen, global modals. */
export function AppShell() {
  const { modal } = useApp();
  return (
    <div className="shell">
      <Sidebar />
      <main className="shell__main">
        <Outlet />
      </main>
      {modal?.kind === 'addPerson' && <AddPersonModal />}
      {modal?.kind === 'newOccasion' && <NewOccasionModal />}
      <ToastHost />
    </div>
  );
}

function Sidebar() {
  const { pathname } = useLocation();
  const inLists = pathname.startsWith('/lists');
  const navigate = useNavigate();
  return (
    <aside className="sidebar" aria-label="Main">
      <NavLink to="/" className="sidebar__logo"><Logo /></NavLink>
      <nav className="col">
        {NAV.map((n) =>
          n.to === '/lists' ? (
            <div key={n.to}>
              <NavLink to="/lists" className={() => `nav-item${inLists ? ' is-active' : ''}`}>
                <Icon name={n.icon} />
                <span>{n.label}</span>
                <span className="spacer" />
                <Icon name={inLists ? 'chevronDown' : 'chevronRight'} size={14} stroke={2} />
              </NavLink>
              {inLists && <ListsTree />}
            </div>
          ) : (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </NavLink>
          ),
        )}
      </nav>
      <div className="spacer" />
      <CartWidget />
      <button type="button" className="account" onClick={() => navigate('/settings')} aria-label="Account and settings">
        <Avatar initial={USER.initial} size="md" />
        <span className="col" style={{ alignItems: 'flex-start' }}>
          <span className="t-12 w-700">{USER.name}</span>
          <span className="t-10">Account</span>
        </span>
        <span className="spacer" />
        <span className="t-14 w-700" aria-hidden="true">⋯</span>
      </button>
    </aside>
  );
}

/** Occasion → person tree shown under "Gift lists" when that area is open. */
function ListsTree() {
  const { occasions, person, openModal } = useApp();
  const params = useParams();
  const { pathname } = useLocation();
  const match = pathname.match(/^\/lists\/([^/]+)\/([^/]+)/);
  const activeOcc = params.occasionId ?? match?.[1];
  const activePerson = params.personId ?? match?.[2];
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const list = occasions.filter((o) => !o.reminderOnly);
  return (
    <div className="tree">
      {list.map((o, i) => {
        const isOpen = open[o.id] ?? (activeOcc ? activeOcc === o.id : i === 0);
        return (
          <div key={o.id}>
            <button type="button" className="tree__occ" aria-expanded={isOpen} onClick={() => setOpen({ ...open, [o.id]: !isOpen })}>
              <span className={`t-12${isOpen ? ' w-700' : ''}`}>{o.name}</span>
              <span className="t-10">{shortDate(o.date)}</span>
              <span className="spacer" />
              <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={14} stroke={2} />
            </button>
            {isOpen && (
              <>
                {o.people.map(({ personId }) => {
                  const p = person(personId);
                  const active = activeOcc === o.id && activePerson === personId;
                  return (
                    <NavLink key={personId} to={`/lists/${o.id}/${personId}`} className={`tree__person${active ? ' is-active' : ''}`}>
                      <span className="avatar avatar--xs">{p.initial}</span>
                      <span className={`t-12${active ? ' w-700' : ''}`}>{p.name}</span>
                    </NavLink>
                  );
                })}
                <button type="button" className="tree__add" onClick={() => openModal({ kind: 'addPerson' })}>+ Add person</button>
              </>
            )}
          </div>
        );
      })}
      <button type="button" className="tree__add tree__add--occ" onClick={() => openModal({ kind: 'newOccasion' })}>+ New occasion</button>
    </div>
  );
}
