import { useState } from 'react';
import { Button, Chip, CloseButton, LinkButton, Modal } from '../../components/ui';
import { useApp } from '../../store/AppStore';

const TYPES = ['Christmas', 'Birthday', 'Anniversary', 'Graduation', 'Custom…'];

/** New occasion (03). */
export function NewOccasionModal() {
  const { people, openModal, addOccasion, modal } = useApp();
  const preset = modal?.kind === 'newOccasion' ? modal.personId : undefined;
  const close = () => openModal(null);
  const [type, setType] = useState('Birthday');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('');
  const [who, setWho] = useState<string[]>(preset ? [preset] : []);
  const [repeats, setRepeats] = useState(false);
  const [remind, setRemind] = useState(false);
  const valid = name.trim() && date && who.length;
  const create = () => {
    const total = Number(budget.replace(/\D/g, '')) || 0;
    addOccasion({
      name: name.trim(), shortName: type === 'Custom…' ? name.trim() : type === 'Birthday' ? 'birthday' : type, date, budget: total,
      people: who.map((personId) => ({ personId, budget: Math.round(total / who.length) })),
    });
    close();
  };
  return (
    <Modal onClose={close} label="New occasion" size="md">
      <div className="modal__head">
        <span className="t-11 w-700">New occasion</span>
        <span className="spacer" />
        <CloseButton onClick={close} />
      </div>
      <h2 className="modal__title" style={{ marginTop: -6 }}>What are you planning for?</h2>
      <div className="field-label">Type</div>
      <div className="row gap-6 wrap" role="radiogroup">
        {TYPES.map((t) => <Chip key={t} large on={type === t} check onClick={() => setType(t)}>{t}</Chip>)}
      </div>
      <label className="field-label" htmlFor="no-name">Name</label>
      <input id="no-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dad's birthday" />
      <div className="row gap-12">
        <label className="flex1 col gap-8"><span className="field-label">Date</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="flex1 col gap-8"><span className="field-label">Budget</span><input className="input" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="$100" /></label>
      </div>
      <div className="field-label">Who is it for?</div>
      <div className="row gap-16 wrap">
        {people.map((p) => (
          <label key={p.id} className="check">
            <input type="checkbox" checked={who.includes(p.id)} onChange={() => setWho(who.includes(p.id) ? who.filter((x) => x !== p.id) : [...who, p.id])} />{p.name}
          </label>
        ))}
        <LinkButton accent onClick={() => openModal({ kind: 'addPerson' })}>+ Add person</LinkButton>
      </div>
      <div className="row gap-20">
        <label className="check"><input type="checkbox" checked={repeats} onChange={(e) => setRepeats(e.target.checked)} />Repeats every year</label>
        <label className="check"><input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} />Remind me 30 days before</label>
      </div>
      <div className="modal__foot">
        <Button onClick={close}>Cancel</Button>
        <span className="spacer" />
        <Button variant="primary" disabled={!valid} onClick={create}>Create occasion</Button>
      </div>
    </Modal>
  );
}
