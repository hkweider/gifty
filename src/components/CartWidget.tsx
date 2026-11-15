import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { Button } from './ui';
import { summarizeCart, useApp } from '../store/AppStore';
import { getProduct } from '../lib/api';
import { money, plural } from '../lib/format';

/** "Your cart" widget: on every signed-in screen, pinned to the bottom of the side nav. */
export function CartWidget() {
  const { cart } = useApp();
  const navigate = useNavigate();
  const s = summarizeCart(cart);
  const thumbs = cart.slice(0, 3);
  return (
    <section className="cart-widget" aria-label="Your cart">
      <div className="row gap-8">
        <span className="cart-widget__icon"><Icon name="cart" size={15} stroke={2} /></span>
        <span className="t-13 w-700">Your cart</span>
        <span className="spacer" />
        <span className="t-11 w-600 nowrap">{plural(cart.length, 'item')}</span>
      </div>
      {thumbs.length > 0 && (
        <div className="cart-widget__thumbs" aria-hidden="true">
          {thumbs.map((c) => <CartThumb key={c.id} productId={c.productId} />)}
        </div>
      )}
      <div className="row-base gap-6">
        <span className="t-11 muted">Total</span>
        <span className="spacer" />
        <span className="cart-widget__total">{money(s.total)}</span>
      </div>
      <Button variant="primary" size="md" block onClick={() => navigate('/cart')}>View cart</Button>
    </section>
  );
}

/** Product photo when there is one, otherwise the product's pastel tint (or blank for an empty slot). */
function CartThumb({ productId }: { productId?: string }) {
  if (!productId) return <span className="cart-widget__thumb" />;
  const p = getProduct(productId);
  const bg = p.image ? `url("${p.image}") center/cover, var(--${p.tint})` : `var(--${p.tint})`;
  return <span className="cart-widget__thumb" title={p.name} style={{ background: bg }} />;
}
