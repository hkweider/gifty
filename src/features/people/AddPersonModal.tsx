import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, CloseButton, LinkButton, Modal, Swatch } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useApp } from '../../store/AppStore';
import { shortDate } from '../../lib/format';
import { LIVE } from '../../lib/api';
import type { Relationship } from '../../data/types';

const RELATIONS: Relationship[] = ['Parent', 'Partner', 'Child', 'Friend', 'Colleague', 'Other'];
const SUGGESTIONS = [
  { label: 'Pour-over coffee set', sub: 'Kitchen · from CA$ 18', tint: 'sage' as const },
  { label: 'Pour-over kettle', sub: 'Kitchen · from CA$ 18', tint: 'peach' as const },
  { label: 'Coffee gift sets', sub: 'Gift sets · from CA$ 24', tint: 'butter' as const },
];

/** Add a person (02a–02e): 4 steps, an alt step 2 for "I have something in mind", and describe-in-words. */
export function AddPersonModal() {
  const { openModal, occasions, people, addPerson, toggleShortlist } = useApp();
  const navigate = useNavigate();
  const close = () => openModal(null);
  const [step, setStep] = useState(1);
  const [words, setWords] = useState(false);
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<Relationship>('Parent');
  const [mode, setMode] = useState<'ideas' | 'inMind'>('ideas');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [avoids, setAvoids] = useState('');
  const [owns, setOwns] = useState('');
  const [thinking, setThinking] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const upcoming = occasions.filter((o) => !o.reminderOnly);
  const [occasionId, setOccasionId] = useState(upcoming[0]?.id ?? '');
  const [budget, setBudget] = useState('');
  const [alsoFor, setAlsoFor] = useState<string[]>([]);
  const who = name.trim() || 'them';
  const pronoun = relation === 'Parent' || relation === 'Partner' ? 'they' : 'they';
  const occ = occasions.find((o) => o.id === occasionId);

  const finish = () => {
    const p = addPerson({
      name: name.trim(), relationship: relation, interests, avoids: avoids ? avoids.split(',').map((s) => s.trim()).filter(Boolean) : [],
      owns: owns ? owns.split(',').map((s) => s.trim()).filter(Boolean) : [],
      summary: [interests[0] && `${interests[0]} lover`, owns && `owns ${owns}`].filter(Boolean).join(' · '),
    }, occasionId, Number(budget.replace(/\D/g, '')) || 0);
    close();
    if (picked) toggleShortlist(picked, p.id, occasionId);
    navigate(`/lists/${occasionId}/${p.id}${picked ? '/shortlist' : thinking ? `?q=${encodeURIComponent(thinking)}` : ''}`);
  };

  const head = (
    <>
      <div className="modal__head">
        <span className="t-11 w-700">Add a person · Step {words ? 1 : step} of 4</span>
        <span className="spacer" />
        <CloseButton onClick={close} />
      </div>
      <div className="steps" aria-hidden="true">{[1, 2, 3, 4].map((i) => <span key={i} className={i <= (words ? 1 : step) ? 'on' : ''} />)}</div>
    </>
  );

  if (words) {
    return (
      <Modal onClose={close} label="Add a person">
        {head}
        <h2 className="modal__title">Tell us about {name.trim() || 'them'}</h2>
        <p className="t-12 muted">Write it like you would tell a friend. We will turn it into a profile you can check.</p>
        <textarea className="textarea" style={{ minHeight: 140 }} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. My dad is 62, loves hiking and good coffee, already has a grinder, hates clutter. Budget around $150." aria-label="Describe them" />
        <div className="row gap-6 wrap">
          {['Add their age', 'Add what they like', 'Add what they own', 'Add a budget'].map((c) => <Chip key={c} onClick={() => setDescription((d) => `${d}${d ? ' ' : ''}${c.replace('Add ', '').replace('their ', '')}: `)}>{c}</Chip>)}
        </div>
        <div><Button onClick={() => setWords(false)}>Back to questions</Button></div>
        <div className="modal__foot">
          <span className="spacer" />
          <Button variant="primary" disabled={!description.trim()} onClick={() => {
            // Sample parser: pulls a name, interests and budget out of the description.
            const lower = description.toLowerCase();
            if (!name.trim()) setName(/\bmy (dad|mom|mum|father|mother|sister|brother|partner)\b/.exec(lower)?.[1]?.replace(/^./, (c) => c.toUpperCase()) ?? '');
            setInterests(['coffee', 'hiking', 'cooking', 'gardening', 'baking', 'gaming', 'cycling', 'reading'].filter((k) => lower.includes(k)).map((k) => k[0].toUpperCase() + k.slice(1)));
            const b = /\$\s?(\d+)/.exec(description); if (b) setBudget(`$${b[1]}`);
            const own = /(?:has|owns) (?:a |an )?([a-z ]+?)(?:,|\.|$)/.exec(lower); if (own) setOwns(own[1]);
            setWords(false); setStep(4);
          }}>Build profile →</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={close} label="Add a person">
      {head}
      {step === 1 && (
        <>
          <h2 className="modal__title">Who are you shopping for?</h2>
          <p className="t-12 muted">Just a first name is fine.</p>
          <label className="field-label" htmlFor="ap-name">Name</label>
          <input id="ap-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dad" />
          <div className="field-label">How are they related to you?</div>
          <div className="row gap-6 wrap" role="radiogroup">
            {RELATIONS.map((r) => <Chip key={r} large on={relation === r} check onClick={() => setRelation(r)} role="radio" aria-checked={relation === r}>{r}</Chip>)}
          </div>
          <LinkButton className="t-12" style={{ alignSelf: 'flex-start' }} onClick={() => setWords(true)}>Prefer to type it all in one go? Describe them in words →</LinkButton>
          <div className="modal__foot"><span className="spacer" /><Button variant="primary" disabled={!name.trim() || people.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())} onClick={() => setStep(2)}>Next</Button></div>
        </>
      )}
      {step === 2 && (
        <>
          <h2 className="modal__title">How can we help with {who}?</h2>
          <p className="t-12 muted">Choose a starting point. You can switch any time.</p>
          <div className="row gap-10 stretch" role="radiogroup">
            <ModeCard on={mode === 'inMind'} onClick={() => setMode('inMind')} title="I have something in mind" body="Name a gift, a type of gift or paste a link" />
            <ModeCard on={mode === 'ideas'} onClick={() => setMode('ideas')} title="Help me find ideas" body="Tell me about them and I will suggest options" />
          </div>
          {mode === 'ideas' ? (
            <>
              <div className="field-label">Interests</div>
              <div className="row gap-6 wrap">
                {interests.map((i) => <Chip key={i} onRemove={() => setInterests(interests.filter((x) => x !== i))}>{i}</Chip>)}
                <form onSubmit={(e) => { e.preventDefault(); if (newInterest.trim()) setInterests([...interests, newInterest.trim()]); setNewInterest(''); }}>
                  <input className="chip" style={{ width: 90 }} value={newInterest} onChange={(e) => setNewInterest(e.target.value)} placeholder="+ add" aria-label="Add an interest" />
                </form>
              </div>
              <label className="field-label" htmlFor="ap-avoid">Anything {pronoun} dislike{pronoun === 'they' ? '' : 's'} or avoid{pronoun === 'they' ? '' : 's'}?</label>
              <input id="ap-avoid" className="input" value={avoids} onChange={(e) => setAvoids(e.target.value)} placeholder="e.g. no subscriptions, nothing scented" />
              <label className="field-label" htmlFor="ap-own">What do{pronoun === 'they' ? '' : 'es'} {pronoun} already own?</label>
              <input id="ap-own" className="input" value={owns} onChange={(e) => setOwns(e.target.value)} placeholder="e.g. a grinder, a French press" />
            </>
          ) : (
            <>
              <label className="field-label" htmlFor="ap-think">What are you thinking of?</label>
              <div>
                <div className="search" style={{ minHeight: 34 }}>
                  <Icon name="search" size={13} stroke={2.2} />
                  <input id="ap-think" value={thinking} onChange={(e) => { setThinking(e.target.value); setPicked(null); }} placeholder="e.g. pour over coffee" />
                </div>
                {LIVE && thinking.trim().length > 0 && <div className="t-11 muted" style={{ marginTop: 6 }}>We'll search for "{thinking.trim()}" when you're done.</div>}
                {!LIVE && thinking.trim().length > 2 && (
                  <div className="card" style={{ borderRadius: 10, marginTop: 4, overflow: 'hidden' }}>
                    <div className="suggest__head" style={{ background: 'var(--surface-sunk)', fontSize: 10, fontWeight: 700, padding: '6px 8px' }}>Suggestions</div>
                    {SUGGESTIONS.map((s) => (
                      <button key={s.label} type="button" className="row gap-10" style={{ width: '100%', padding: '6px 8px', border: 0, borderTop: '1px solid var(--line)', background: 'none', textAlign: 'left' }} onClick={() => setThinking(s.label)}>
                        <Swatch tint={s.tint} size={32} radius={99} />
                        <span className="flex1 col"><span className="t-12 w-700">{s.label}</span><span className="t-10">{s.sub}</span></span>
                        <span className="t-11 w-700">Select</span>
                      </button>
                    ))}
                    <div className="t-11 w-700" style={{ padding: '6px 8px', borderTop: '1px solid var(--line)' }}>Or keep your own words: "{thinking}"</div>
                  </div>
                )}
              </div>
              <div className="row gap-8"><span className="t-11">or</span><Button>Paste a product link</Button><Button>Browse by category</Button></div>
              <div className="field-label">Narrow it down (optional)</div>
              <div className="row gap-6">{['Brand ▾', 'Max price ▾', 'Colour / size ▾'].map((c) => <Chip key={c}>{c}</Chip>)}</div>
            </>
          )}
          <div className="modal__foot">
            <Button onClick={() => setStep(1)}>Back</Button>
            <span className="spacer" />
            <LinkButton onClick={() => setStep(3)}>Skip this step</LinkButton>
            <Button variant="primary" onClick={() => setStep(3)}>Next</Button>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <h2 className="modal__title">What are you shopping for?</h2>
          <p className="t-12 muted">Pick an occasion. You can add more later.</p>
          <div className="row gap-6 wrap" role="radiogroup">
            {upcoming.map((o) => <Chip key={o.id} large on={occasionId === o.id} check onClick={() => setOccasionId(o.id)}>{o.name}</Chip>)}
            <Chip large onClick={() => openModal({ kind: 'newOccasion' })}>Other</Chip>
          </div>
          <label className="field-label" htmlFor="ap-date">Date</label>
          <input id="ap-date" className="input" readOnly value={occ ? `${shortDate(occ.date)}, ${occ.date.slice(0, 4)} (set by ${occ.name})` : ''} />
          <label className="field-label" htmlFor="ap-budget">Budget for {who} this {occ?.shortName ?? 'occasion'}</label>
          <div className="row gap-8">
            <input id="ap-budget" className="input" style={{ width: 140 }} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="$150" />
            <span className="t-12">or</span>
            <Chip onClick={() => setBudget('')}>Not sure yet</Chip>
          </div>
          <div className="modal__foot"><Button onClick={() => setStep(2)}>Back</Button><span className="spacer" /><Button variant="primary" disabled={!occasionId} onClick={() => setStep(4)}>Next</Button></div>
        </>
      )}
      {step === 4 && (
        <>
          <h2 className="modal__title">Ready to find gifts for {who}?</h2>
          <p className="t-12 muted">Check the summary. You can edit anything later.</p>
          <div className="notice notice--dashed" style={{ gap: 8 }}>
            <div className="row gap-8"><span className="t-15 w-700">{who}</span><span className="t-12">{relation}</span></div>
            <div className="row gap-6 wrap">
              {interests.map((i) => <span key={i} className="chip">{i}</span>)}
              {avoids && <span className="chip">Avoids: {avoids}</span>}
            </div>
            {owns && <div className="t-12">Already owns: {owns}</div>}
            <div className="t-12 w-700">{occ?.name}{budget ? ` · budget ${budget.startsWith('$') ? budget : `$${budget}`}` : ''}</div>
          </div>
          <div className="field-label">Add {who} to another occasion too?</div>
          <div className="row gap-16">
            {[`${who}'s birthday`, "Father's Day"].map((x) => (
              <label key={x} className="check"><input type="checkbox" checked={alsoFor.includes(x)} onChange={() => setAlsoFor(alsoFor.includes(x) ? alsoFor.filter((y) => y !== x) : [...alsoFor, x])} />{x}</label>
            ))}
            <LinkButton onClick={() => openModal({ kind: 'newOccasion' })}>+ Other occasion</LinkButton>
          </div>
          <div className="modal__foot"><Button onClick={() => setStep(3)}>Back</Button><span className="spacer" /><Button variant="primary" disabled={!name.trim()} onClick={finish}>Find gifts for {who}</Button></div>
        </>
      )}
    </Modal>
  );
}

function ModeCard({ on, onClick, title, body }: { on: boolean; onClick: () => void; title: string; body: string }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} className="flex1 col gap-4"
      style={{ textAlign: 'left', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '12px 12px', background: on ? 'var(--accent-tint)' : 'var(--surface)' }}>
      <span className="t-14 w-700">{title}</span>
      <span className="t-11">{body}</span>
    </button>
  );
}
