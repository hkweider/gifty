import { useEffect, useRef, useState } from 'react';
import { Button, Chip } from '../../components/ui';
import { askChat, type ChatContextDto, type ChatTurn } from '../../lib/api';

const STARTERS = (name: string) => [
  `Is this a good gift for ${name}?`,
  'Does it fit the budget?',
  'What should I check before buying?',
];

/** Chat about one product for one person, inside the product panel. History is per product. */
export function ProductChat({ productId, personName, context, initial, onConsumeInitial }: {
  productId: string; personName: string; context: ChatContextDto;
  initial?: string; onConsumeInitial?: () => void;
}) {
  const [log, setLog] = useState<ChatTurn[]>(() => history.get(productId) ?? []);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { setLog(history.get(productId) ?? []); setError(null); }, [productId]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [log, busy]);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    if (initial) { send(initial); onConsumeInitial?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const send = async (raw: string) => {
    const said = raw.trim();
    if (!said || busy) return;
    const next: ChatTurn[] = [...(history.get(productId) ?? log), { role: 'user', content: said }];
    setLog(next); history.set(productId, next); setText(''); setBusy(true); setError(null);
    try {
      const { reply } = await askChat(next, context);
      const withReply: ChatTurn[] = [...next, { role: 'assistant', content: reply }];
      history.set(productId, withReply); setLog(withReply);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chat is unavailable right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pchat">
      <div className="pchat__log" aria-live="polite">
        {log.length === 0 && (
          <div className="col gap-8">
            <div className="bubble bubble--them">Ask me anything about this gift for {personName}: fit, budget, sizing, what to check.</div>
            <div className="row gap-6 wrap">
              {STARTERS(personName).map((s) => <Chip key={s} onClick={() => send(s)}>{s}</Chip>)}
            </div>
          </div>
        )}
        {log.map((m, i) => <div key={i} className={`bubble bubble--${m.role === 'user' ? 'me' : 'them'}`} style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>)}
        {busy && <div className="bubble bubble--them muted">Thinking…</div>}
        {error && <div className="notice" role="alert"><span className="t-12">{error}</span></div>}
        <div ref={end} />
      </div>
      <form className="row gap-6 pchat__form" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input ref={input} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about this product…" aria-label="Ask about this product" />
        <Button type="submit" variant="primary" disabled={busy || !text.trim()}>Send</Button>
      </form>
    </div>
  );
}

/** Chat history per product for this browser session. */
const history = new Map<string, ChatTurn[]>();
