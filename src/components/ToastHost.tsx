import { useApp } from '../store/AppStore';
import { LinkButton } from './ui';

export function ToastHost() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className={`toast${toast.compact ? ' toast--compact' : ''}`} role="status" aria-live="polite">
      <span>{toast.message}</span>
      <span className="spacer" />
      {toast.actions?.map((a) => (
        <LinkButton key={a.label} onClick={a.onClick}>{a.label}</LinkButton>
      ))}
    </div>
  );
}
