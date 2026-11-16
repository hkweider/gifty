import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Chip, CloseButton } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { DIRECT_UCP, LIVE, productsByType, refineResults, searchProducts } from '../../lib/api';
import type { ProductTypeId } from '../../data/types';
import type { ListCtx } from './ListWorkspace';

interface Msg { from: 'me' | 'them'; text: string; meta?: string }

/** "Ask" rail (04e): refine results in words. Changes show as a "Changed:" notice with Undo. */
export function AskRail({ ctx, onClose }: { ctx: ListCtx; onClose: () => void }) {
  const { person, occasion } = useApp();
  const p = person(ctx.personId);
  const o = occasion(ctx.occasionId);
  const [params, setParams] = useSearchParams();
  const [log, setLog] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [log, busy]);

  const currentList = () => {
    const type = params.get('type') as ProductTypeId | null;
    return type ? productsByType(type) : searchProducts('');
  };

  /**
   * Live mode with a server: Claude reads the conversation and returns how to change the results
   * (new search, budget, words to hide). Static or sample builds fall back to simple keyword rules.
   */
  const send = (raw: string) => {
    const said = raw.trim();
    if (!said || busy) return;
    if (LIVE && !DIRECT_UCP) return sendToClaude(said);
    sendRules(said);
  };

  const sendToClaude = async (said: string) => {
    const history = [...log, { from: 'me' as const, text: said }];
    setLog(history); setText(''); setBusy(true);
    try {
      const r = await refineResults({
        messages: history.map((m) => ({ role: m.from === 'me' ? 'user' as const : 'assistant' as const, content: m.text })),
        person: { name: p.name, relationship: p.relationship, summary: p.summary, interests: p.interests, avoids: p.avoids, owns: p.owns },
        occasion: { name: o.name, date: o.date, budget: ctx.budget },
        current: {
          query: params.get('q') ?? undefined,
          maxBudget: params.get('max') === 'none' ? null : params.get('max') ? Number(params.get('max')) : ctx.budget || null,
          skip: (params.get('skip') ?? '').split(',').filter(Boolean),
        },
      });
      const next = new URLSearchParams(params);
      if (r.query) { next.set('q', r.query); next.delete('type'); next.delete('view'); }
      if (r.maxBudget !== null) next.set('max', r.maxBudget === 0 ? 'none' : String(r.maxBudget));
      if (r.skip.length) {
        const words = new Set([...(next.get('skip') ?? '').split(',').filter(Boolean), ...r.skip]);
        next.set('skip', [...words].join(','));
      }
      if (r.changed) next.set('changed', r.changed);
      setParams(next);
      setLog((l) => [...l, { from: 'them', text: r.reply, meta: r.changed ?? undefined }]);
    } catch (e) {
      setLog((l) => [...l, { from: 'them', text: e instanceof Error ? e.message : 'Something went wrong. Try again.' }]);
    } finally {
      setBusy(false);
    }
  };

  const sendRules = (said: string) => {
    const next = new URLSearchParams(params);
    const replies: Msg[] = [];
    const money = said.match(/(?:under|below|less than|max|≤)?\s*\$?\s*(\d{2,4})/i);
    const skip = said.match(/skip\s+(kettles?|scales?|drippers?)/i);
    if (money) {
      const max = Number(money[1]);
      const before = currentList().filter((x) => x.price <= ctx.budget);
      const after = before.filter((x) => x.price <= max);
      const removed = before.length - after.length;
      next.set('max', String(max));
      // Live results are re-fetched with the new budget, so counts are only known for sample data.
      next.set('changed', LIVE ? `Budget ≤ $${max}` : `Budget ≤ $${max} · ${removed} removed · ${after.length} re-ranked`);
      replies.push({ from: 'them', text: `Got it. I narrowed to ${params.get('type') ? 'this type ' : 'ideas '}under CA$ ${max}${LIVE ? '' : ', ranked durable options first'}.`, meta: LIVE ? undefined : `${removed} removed · ${after.length} re-ranked` });
      replies.push({ from: 'them', text: `Want me to skip anything ${p.pronoun === 'she' ? 'she' : p.pronoun === 'he' ? 'he' : 'they'} already ${p.pronoun === 'they' ? 'own' : 'owns'}?` });
    } else if (skip) {
      const id = skip[1].toLowerCase().startsWith('kettle') ? 'kettle' : skip[1].toLowerCase().startsWith('scale') ? 'scale' : 'dripper';
      const list = new Set((next.get('skip') ?? '').split(',').filter(Boolean));
      list.add(id);
      next.set('skip', [...list].join(','));
      next.set('changed', `Skipping ${skip[1].toLowerCase()} · 1 removed`);
      replies.push({ from: 'them', text: `Done. ${skip[1][0].toUpperCase() + skip[1].slice(1).toLowerCase()} are hidden for this list.`, meta: '1 removed' });
    } else {
      replies.push({ from: 'them', text: `I will keep that in mind for ${p.name}. Try a budget ("under $100") or something to skip ("skip kettles") to change the results.` });
    }
    setParams(next);
    setLog((l) => [...l, { from: 'me', text: said }, ...replies]);
    setText('');
  };

  return (
    <aside className="ask" aria-label={`Ask about ${p.name}`}>
      <div className="ask__head">
        <span className="t-13 w-700">Ask</span>
        <span className="t-11">about {p.name} · {o.shortName}</span>
        <span className="spacer" />
        <CloseButton onClick={onClose} />
      </div>
      <div className="ask__log" aria-live="polite">
        {log.length === 0 && <div className="bubble bubble--them">Tell me what you're after for {p.name}: a budget, a vibe, something to avoid, or a different kind of gift.</div>}
        {log.map((m, i) => (
          <div key={i} className={`bubble bubble--${m.from}`}>
            {m.text}
            {m.meta && <div className="t-11 w-700" style={{ marginTop: 2 }}>{m.meta}</div>}
          </div>
        ))}
        {busy && <div className="bubble bubble--them muted">Updating ideas…</div>}
        <div ref={end} />
      </div>
      <div className="ask__foot">
        <div className="row gap-6 wrap">
          {['Under $100', 'More personal', 'Something they can use every day'].map((s) => <Chip key={s} onClick={() => send(s)}>{s}</Chip>)}
        </div>
        <form className="row gap-6" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask or refine…" aria-label="Ask or refine" />
          <Button type="submit" variant="primary">Send</Button>
        </form>
      </div>
    </aside>
  );
}
