import type { Product } from '../../data/types';
import { priceOf } from '../../lib/format';
import { LIMITED_REVIEWS } from '../../lib/api';

export interface CardProps {
  product: Product;
  shortlisted: boolean;
  compared: boolean;
  compareDisabled?: boolean;
  limited?: boolean;
  demo?: boolean;
  onOpen: () => void;
  onToggleShortlist: () => void;
  onToggleCompare: () => void;
}

/** Product result card (boards 04, 04d, 04g, 05c, 05d). Cards in a row share equal height. */
export function ProductCard({ product: p, shortlisted, compared, compareDisabled, limited, demo, onOpen, onToggleShortlist, onToggleCompare }: CardProps) {
  const isLimited = limited ?? LIMITED_REVIEWS.has(p.id);
  return (
    <article className={`pcard${shortlisted ? ' is-shortlisted' : ''}${demo ? ' is-demo' : ''}`}>
      <button type="button" className="pcard__img" style={{ background: `var(--${p.tint})` }} onClick={onOpen} aria-label={`View ${p.name}`}>
        {p.live && p.image && <img src={p.image} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
        {demo && <span className="pcard__demo">DEMO DATA</span>}
      </button>
      <div className="pcard__body">
        <div className="row gap-8" style={{ alignItems: 'flex-start' }}>
          <button type="button" className="pcard__name" onClick={onOpen}>{p.name}</button>
          <span className="spacer" />
          <span className="t-13 w-700 nowrap">{priceOf(p)}</span>
        </div>
        <div className="t-11 muted">{p.store}</div>
        <div className="t-12" style={{ lineHeight: 1.4 }}>{p.blurb}</div>
        {demo ? (
          <div><span className="pill pill--outline t-12">Sample reviews</span></div>
        ) : (
          <>
            <div className="pcard__reviews">
              {isLimited ? (
                <>
                  <div className="t-11 w-700">Limited reviews</div>
                  <div className="t-10">{p.live ? 'No ratings found for this product' : 'Maker info only · no expert reviews found'}</div>
                </>
              ) : (
                <>
                  {p.expert && <div className="row gap-4"><span className="t-11 w-700">Expert reviews</span><span className="spacer" /><span className="t-11">{p.expert.score.toFixed(1)} · {p.expert.sources} sources</span></div>}
                  {p.customer && <div className="row gap-4"><span className="t-11 w-700">Customer reviews</span><span className="spacer" /><span className="t-11">{p.customer.rating.toFixed(1)} · {p.customer.count}</span></div>}
                </>
              )}
            </div>
            <div className="row gap-4" style={{ marginTop: 'auto' }}>
              <label className="check t-12" style={{ gap: 5 }}>
                <input type="checkbox" checked={compared} disabled={compareDisabled && !compared} onChange={onToggleCompare} />
                Compare
              </label>
              <span className="spacer" />
              <button
                type="button"
                className={`btn btn--sm${shortlisted ? ' btn--primary' : ''}`}
                aria-pressed={shortlisted}
                onClick={onToggleShortlist}
              >
                {shortlisted ? '✓ Shortlisted' : '+ Shortlist'}
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export function SkeletonCard({ blurb }: { blurb: string }) {
  return (
    <div className="pcard" aria-hidden="true">
      <div className="pcard__img" style={{ background: 'var(--surface-sunk)' }} />
      <div className="pcard__body">
        <span className="skeleton" style={{ width: '56%', height: 10 }} />
        <span className="skeleton" style={{ width: '38%', height: 8 }} />
        <div className="t-12">{blurb}</div>
      </div>
    </div>
  );
}
