import { useApp } from '../store/AppStore';
import { LinkButton } from './ui';

export function ToastHost() {
  const { toast, showToast } = useApp();
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{toast.message}</span>
      {toast.actions?.map((a) => (
        <LinkButton key={a.label} onClick={a.onClick}>{a.label}</LinkButton>
      ))}
      <button type="button" className="toast__close" aria-label="Dismiss" onClick={() => showToast(null)}>×</button>
    </div>
  );
}
