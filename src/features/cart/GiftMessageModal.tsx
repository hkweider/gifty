import { useState } from 'react';
import { Button, Chip, CloseButton, Modal } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { getProduct } from '../../lib/api';
import { USER } from '../../data/sample';

/** Gift message and options for one cart item (09f). */
export function GiftMessageModal({ cartId, onClose }: { cartId: string; onClose: () => void }) {
  const { cart, person, occasion, setGiftMessage } = useApp();
  const item = cart.find((c) => c.id === cartId)!;
  const p = getProduct(item.productId);
  const who = person(item.personId);
  const occ = occasion(item.occasionId);
  const presets: Record<string, string> = {
    Warm: `${who.name}, ${occ.shortName === 'Christmas' ? 'merry Christmas' : 'happy birthday'}. Enjoy the new ${p.type === 'brewing' ? 'brew gear' : 'gift'}! Love, ${USER.name}`,
    Funny: `${who.name}, I promise this one is not socks. Love, ${USER.name}`,
    Short: `With love, ${USER.name}`,
  };
  const [msg, setMsg] = useState(item.giftMessage ?? presets.Warm);
  const [tone, setTone] = useState<string | null>(null);
  return (
    <Modal onClose={onClose} label="Gift message">
      <div className="modal__head">
        <h2 className="modal__title modal__title--sans t-16" style={{ fontSize: 16 }}>Gift message · {p.name} for {who.name}</h2>
        <span className="spacer" />
        <CloseButton onClick={onClose} />
      </div>
      <label className="field-label" htmlFor="gift-msg">Message</label>
      <textarea id="gift-msg" className="textarea" value={msg} onChange={(e) => setMsg(e.target.value)} />
      <div><Button onClick={() => setMsg(presets[tone ?? 'Warm'])}>Suggest wording</Button></div>
      <div className="row gap-6">
        {Object.keys(presets).map((t) => <Chip key={t} on={tone === t} onClick={() => { setTone(t); setMsg(presets[t]); }}>{t}</Chip>)}
      </div>
      <label className="check"><input type="checkbox" />Use the same message for all of {who.name}'s gifts</label>
      <label className="check"><input type="checkbox" />Hide prices on the packing slip</label>
      <label className="check"><input type="checkbox" />Include a gift receipt</label>
      <div className="notice notice--dashed">
        <span className="t-11 w-700">What {who.name} sees</span>
        <span className="t-11">A printed note with your message, tucked in with the gift.</span>
      </div>
      <p className="t-10">Gift messages and receipts depend on each store. We pass them on where the store supports it. Otherwise we keep the message here for you to add by hand, and tell you before checkout.</p>
      <div className="row">
        <Button onClick={onClose}>Cancel</Button>
        <span className="spacer" />
        <Button variant="primary" onClick={() => { setGiftMessage(cartId, msg); onClose(); }}>Save message</Button>
      </div>
    </Modal>
  );
}
