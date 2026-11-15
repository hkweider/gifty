import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import type { Tint } from '../data/types';

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'outline';
type BtnSize = 'sm' | 'md' | 'lg';
export function Button({
  variant = 'outline', size, block, grow, className = '', ...rest
}: { variant?: BtnVariant; size?: BtnSize; block?: boolean; grow?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = ['btn', variant === 'primary' && 'btn--primary', size && `btn--${size}`, block && 'btn--block', grow && 'btn--grow', className]
    .filter(Boolean).join(' ');
  return <button type="button" className={cls} {...rest} />;
}

export function LinkButton({ accent, underline, className = '', ...rest }: { accent?: boolean; underline?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={['link-btn', accent && 'link-btn--accent', underline && 'link-btn--underline', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}

/* ---------- Chip ---------- */
export function Chip({
  on, soft, large, children, check, onRemove, onClick, ...rest
}: {
  on?: boolean; soft?: boolean; large?: boolean; check?: boolean; onRemove?: () => void; children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={onRemove ? undefined : on}
      className={['chip', on && 'chip--on', soft && 'chip--soft', large && 'chip--lg'].filter(Boolean).join(' ')}
      {...rest}
      onClick={onRemove ?? onClick}
    >
      {children}
      {on && check && ' ✓'}
      {onRemove && ' ×'}
    </button>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ initial, size = 'base' }: { initial: string; size?: 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' }) {
  return <span className={`avatar${size !== 'base' ? ` avatar--${size}` : ''}`} aria-hidden="true">{initial}</span>;
}

/* ---------- Swatch (product image placeholder in a pastel tint) ---------- */
export function Swatch({ tint, size = 44, radius, image, alt = '' }: { tint: Tint; size?: number; radius?: number; image?: string; alt?: string }) {
  if (image) {
    return <img className="swatch" src={image} alt={alt} style={{ width: size, height: size, objectFit: 'cover', borderRadius: radius }} />;
  }
  return <span className="swatch" style={{ width: size, height: size, background: `var(--${tint})`, borderRadius: radius }} />;
}

/* ---------- Meter ---------- */
export function Meter({ value, dark, boxed, color }: { value: number; dark?: boolean; boxed?: boolean; color?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={['meter', dark && 'meter--dark', boxed && 'meter--boxed'].filter(Boolean).join(' ')} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  onClose, children, size, label, mainOnly,
}: { onClose: () => void; children: ReactNode; size?: 'wide' | 'md' | 'sm'; label: string; mainOnly?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, textarea, button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={`scrim${mainOnly ? ' scrim--main' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal${size ? ` modal--${size}` : ''}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return <LinkButton onClick={onClick} aria-label="Close">Close ×</LinkButton>;
}

/* ---------- Popover menu ---------- */
export function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  return ref;
}

/* ---------- Empty state ---------- */
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card card--dashed card--pad col gap-8" style={{ alignItems: 'center', textAlign: 'center' }}>
      <div className="t-14 w-700">{title}</div>
      {body && <div className="t-12 muted">{body}</div>}
      {action}
    </div>
  );
}
