import { Button, CloseButton, Modal } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { plural } from '../../lib/format';

/** Confirms removing a recipient and says what goes with them. */
export function RemovePersonModal({ personId, onClose, onRemoved }: { personId: string; onClose: () => void; onRemoved?: () => void }) {
  const { person, occasions, shortlist, cart, removePerson } = useApp();
  const p = person(personId);
  if (!p) return null;
  const listItems = shortlist.filter((s) => s.personId === personId).length;
  const cartItems = cart.filter((c) => c.personId === personId).length;
  const onlyTheirs = occasions.filter((o) => o.people.length === 1 && o.people[0].personId === personId);
  const lines = [
    listItems && `${plural(listItems, 'gift')} on their lists`,
    cartItems && `${plural(cartItems, 'item')} in your cart`,
    onlyTheirs.length && `${onlyTheirs.map((o) => o.name).join(', ')}`,
  ].filter(Boolean) as string[];
  return (
    <Modal onClose={onClose} size="sm" label={`Remove ${p.name}`}>
      <div className="modal__head">
        <h2 className="modal__title modal__title--sans">Remove {p.name}?</h2>
        <span className="spacer" />
        <CloseButton onClick={onClose} />
      </div>
      <p className="t-12">{lines.length ? `This also removes ${lines.join(' · ')}.` : `${p.name} has no gifts or occasions of their own yet.`}</p>
      <div className="modal__foot">
        <span className="spacer" />
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => { removePerson(personId); onClose(); onRemoved?.(); }}>Remove {p.name}</Button>
      </div>
    </Modal>
  );
}
